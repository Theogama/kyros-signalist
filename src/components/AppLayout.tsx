import React from 'react';
import { TradingProvider } from '@/contexts/TradingContext';
import TradingDashboard from '@/components/trading/TradingDashboard';

const AppLayout: React.FC = () => {
  return (

    <TradingProvider>
      <TradingDashboard />
    </TradingProvider>
  );
};

export default AppLayout;
