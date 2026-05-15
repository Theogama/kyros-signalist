import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  clearWorkspaceSession,
  getDefaultUiState,
  loadWorkspaceSession,
  migrateAnonymousSession,
  saveWorkspaceSession,
} from '@/lib/sessionPersistence';

interface AppContextType {
  sidebarOpen: boolean;
  botSettingsOpen: boolean;
  tradeLogPage: number;
  mainScrollTop: number;
  activeChart: string;
  navigationHistory: string[];
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setBotSettingsOpen: (open: boolean) => void;
  setTradeLogPage: (page: number) => void;
  setMainScrollTop: (scrollTop: number) => void;
  setActiveChart: (chartId: string) => void;
  resetWorkspace: () => void;
}

const defaultUiState = getDefaultUiState();

const defaultAppContext: AppContextType = {
  sidebarOpen: defaultUiState.sidebarOpen,
  botSettingsOpen: defaultUiState.botSettingsOpen,
  tradeLogPage: defaultUiState.tradeLogPage,
  mainScrollTop: defaultUiState.mainScrollTop,
  activeChart: defaultUiState.activeChart,
  navigationHistory: defaultUiState.navigationHistory,
  setSidebarOpen: () => {},
  toggleSidebar: () => {},
  setBotSettingsOpen: () => {},
  setTradeLogPage: () => {},
  setMainScrollTop: () => {},
  setActiveChart: () => {},
  resetWorkspace: () => {},
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoaded } = useUser();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(defaultUiState.sidebarOpen);
  const [botSettingsOpen, setBotSettingsOpen] = useState(defaultUiState.botSettingsOpen);
  const [tradeLogPage, setTradeLogPage] = useState(defaultUiState.tradeLogPage);
  const [mainScrollTop, setMainScrollTop] = useState(defaultUiState.mainScrollTop);
  const [activeChart, setActiveChart] = useState(defaultUiState.activeChart);
  const [navigationHistory, setNavigationHistory] = useState<string[]>(defaultUiState.navigationHistory);
  const hasHydratedRef = useRef(false);
  const hydratedUserRef = useRef<string | null | undefined>(undefined);
  const hasShownRestoreToastRef = useRef(false);
  const userId = user?.id;

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (hasHydratedRef.current && hydratedUserRef.current === userId) return;

    migrateAnonymousSession(userId);
    const session = loadWorkspaceSession(userId);
    const ui = session?.ui;

    if (ui) {
      setSidebarOpen(ui.sidebarOpen ?? defaultUiState.sidebarOpen);
      setBotSettingsOpen(ui.botSettingsOpen ?? defaultUiState.botSettingsOpen);
      setTradeLogPage(ui.tradeLogPage ?? defaultUiState.tradeLogPage);
      setMainScrollTop(ui.mainScrollTop ?? defaultUiState.mainScrollTop);
      setActiveChart(ui.activeChart ?? defaultUiState.activeChart);
      setNavigationHistory(ui.navigationHistory?.length ? ui.navigationHistory : [location.pathname]);

      if (!hasShownRestoreToastRef.current) {
        toast.success('Session Restored Successfully', {
          description: 'Your workspace, settings, and position are back where you left them.',
        });
        hasShownRestoreToastRef.current = true;
      }
    }

    hasHydratedRef.current = true;
    hydratedUserRef.current = userId;
  }, [isLoaded, location.pathname, userId]);

  useEffect(() => {
    setNavigationHistory(prev => {
      const lastPath = prev[prev.length - 1];
      if (lastPath === location.pathname) return prev;
      return [...prev, location.pathname].slice(-20);
    });
  }, [location.pathname]);

  const uiSnapshot = useMemo(() => ({
    currentPath: location.pathname,
    navigationHistory,
    sidebarOpen,
    botSettingsOpen,
    tradeLogPage,
    mainScrollTop,
    activeChart,
  }), [
    activeChart,
    botSettingsOpen,
    location.pathname,
    mainScrollTop,
    navigationHistory,
    sidebarOpen,
    tradeLogPage,
  ]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    const timeout = window.setTimeout(() => {
      saveWorkspaceSession(userId, { ui: uiSnapshot });
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [uiSnapshot, userId]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    const saveBeforeUnload = () => {
      saveWorkspaceSession(userId, { ui: uiSnapshot });
    };

    window.addEventListener('beforeunload', saveBeforeUnload);
    window.addEventListener('pagehide', saveBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', saveBeforeUnload);
      window.removeEventListener('pagehide', saveBeforeUnload);
    };
  }, [uiSnapshot, userId]);

  const resetWorkspace = () => {
    clearWorkspaceSession(userId, 'new-session');
    setSidebarOpen(defaultUiState.sidebarOpen);
    setBotSettingsOpen(defaultUiState.botSettingsOpen);
    setTradeLogPage(defaultUiState.tradeLogPage);
    setMainScrollTop(defaultUiState.mainScrollTop);
    setActiveChart(defaultUiState.activeChart);
    setNavigationHistory([location.pathname]);
    window.dispatchEvent(new CustomEvent('kyros:workspace-reset', { detail: { source: 'app' } }));
    toast.success('New session started');
  };

  useEffect(() => {
    const handleWorkspaceReset = () => {
      setSidebarOpen(defaultUiState.sidebarOpen);
      setBotSettingsOpen(defaultUiState.botSettingsOpen);
      setTradeLogPage(defaultUiState.tradeLogPage);
      setMainScrollTop(defaultUiState.mainScrollTop);
      setActiveChart(defaultUiState.activeChart);
      setNavigationHistory([location.pathname]);
    };

    window.addEventListener('kyros:workspace-reset', handleWorkspaceReset);
    return () => window.removeEventListener('kyros:workspace-reset', handleWorkspaceReset);
  }, [location.pathname]);

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        botSettingsOpen,
        tradeLogPage,
        mainScrollTop,
        activeChart,
        navigationHistory,
        setSidebarOpen,
        toggleSidebar,
        setBotSettingsOpen,
        setTradeLogPage,
        setMainScrollTop,
        setActiveChart,
        resetWorkspace,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
