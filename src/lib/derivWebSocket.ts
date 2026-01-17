// Deriv WebSocket API Service
// Handles all WebSocket communication with Deriv trading platform

export interface TickData {
  symbol: string;
  epoch: number;
  quote: number;
  id: string;
}

export interface TradeResult {
  id: string;
  contractId: string;
  contractType: 'CALL' | 'PUT';
  entryPrice: number;
  exitPrice: number;
  stake: number;
  payout: number;
  profit: number;
  result: 'win' | 'loss';
  timestamp: number;
  duration: number;
  symbol: string;
  accountType: 'demo' | 'real';
}

export interface AccountInfo {
  balance: number;
  currency: string;
  loginid: string;
  email: string;
  fullname?: string;
  is_virtual: boolean;
  mt5Accounts?: MT5Account[];
}

export interface MT5Account {
  account_type: string;
  balance: number;
  currency: string;
  display_login: string;
  login: string;
  mt5_account_type: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type MessageHandler = (data: any) => void;

class DerivWebSocket {
  private ws: WebSocket | null = null;
  private apiToken: string = '';
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private tickSubscriptionId: string | null = null;
  private isAuthenticated: boolean = false;
  private pingInterval: NodeJS.Timeout | null = null;

  private readonly APP_ID = import.meta.env.VITE_DERIV_APP_ID || '1089';
  private readonly DERIV_WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${this.APP_ID}`;

  // Subscribe to specific message types
  on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  // Remove handler
  off(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Emit to all handlers of a type
  private emit(type: string, data: any): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Connect to Deriv WebSocket
  connect(apiToken: string): Promise<AccountInfo> {
    return new Promise((resolve, reject) => {
      this.apiToken = apiToken;
      this.emit('status', 'connecting');

      try {
        this.ws = new WebSocket(this.DERIV_WS_URL);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.startPing();
          this.authenticate()
            .then(resolve)
            .catch(reject);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('status', 'error');
          this.emit('error', { message: 'WebSocket connection error' });
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.stopPing();
          this.isAuthenticated = false;
          this.emit('status', 'disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // Authenticate with API token
  private authenticate(): Promise<AccountInfo> {
    return new Promise((resolve, reject) => {
      const authHandler = (data: any) => {
        this.off('authorize', authHandler);
        
        if (data.error) {
          this.emit('status', 'error');
          reject(new Error(data.error.message || 'Authentication failed'));
          return;
        }

        this.isAuthenticated = true;
        this.emit('status', 'connected');
        this.reconnectAttempts = 0;

        const accountInfo: AccountInfo = {
          balance: data.authorize.balance,
          currency: data.authorize.currency,
          loginid: data.authorize.loginid,
          email: data.authorize.email || '',
          fullname: data.authorize.fullname,
          is_virtual: Boolean(data.authorize.is_virtual),
        };

        // Fetch MT5 accounts
        this.getMT5Accounts().then(mt5Accounts => {
          accountInfo.mt5Accounts = mt5Accounts;
          this.emit('account_info_updated', accountInfo);
          resolve(accountInfo);
        }).catch(() => {
          // If MT5 fetch fails, still resolve with basic info
          resolve(accountInfo);
        });
      };

      this.on('authorize', authHandler);
      this.send({ authorize: this.apiToken });
    });
  }

  // Send message to WebSocket
  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // Handle incoming messages
  private handleMessage(data: any): void {
    // Handle tick data
    if (data.tick) {
      const tick: TickData = {
        symbol: data.tick.symbol,
        epoch: data.tick.epoch,
        quote: data.tick.quote,
        id: data.tick.id,
      };
      this.emit('tick', tick);
    }

    // Handle authorization response
    if (data.authorize) {
      this.emit('authorize', data);
    }

    // Handle balance updates
    if (data.msg_type === 'balance') {
      this.emit('balance', data.balance);
      // Also trigger MT5 update to be sure
      this.getMT5Accounts().then(mt5Accounts => {
        this.emit('mt5_login_list', mt5Accounts);
      });
    }

    // Handle buy response
    if (data.buy) {
      this.emit('buy', data);
    }

    // Handle proposal response
    if (data.proposal) {
      this.emit('proposal', data);
    }

    // Handle proposal_open_contract (contract updates)
    if (data.proposal_open_contract) {
      this.emit('contract_update', data.proposal_open_contract);
    }

    // Handle MT5 account list
    if (data.msg_type === 'mt5_login_list') {
      const mt5Accounts = data.mt5_login_list;
      this.emit('mt5_login_list', mt5Accounts);
      
      // Update local account info if already authenticated
      if (this.isAuthenticated) {
        // We need to keep a reference to current account info or fetch it
        // For simplicity, we emit a special event that TradingContext can use
        this.emit('mt5_accounts_updated', mt5Accounts);
      }
    }

    // Handle errors
    if (data.error) {
      this.emit('error', data.error);
    }

    // Handle ping/pong
    if (data.ping) {
      // No action needed for pong response from server
    }
  }

  // Subscribe to tick stream
  subscribeTicks(symbol: string = 'R_100'): void {
    if (!this.isAuthenticated) {
      console.warn('Not authenticated, cannot subscribe to ticks');
      return;
    }

    // Unsubscribe from previous if exists
    this.unsubscribeTicks();

    console.log(`Subscribing to ticks for ${symbol}`);
    this.send({
      ticks: symbol,
      subscribe: 1,
    });
  }

  // Unsubscribe from tick stream
  unsubscribeTicks(): void {
    // Forget all ticks to ensure clean state
    this.send({ forget_all: 'ticks' });
    this.tickSubscriptionId = null;
  }

  // Subscribe to balance updates
  subscribeBalance(): void {
    this.send({
      balance: 1,
      subscribe: 1,
    });
  }

  // Get MT5 accounts
  getMT5Accounts(): Promise<MT5Account[]> {
    return new Promise((resolve, reject) => {
      const handler = (accounts: any) => {
        this.off('mt5_login_list', handler);
        if (Array.isArray(accounts)) {
          resolve(accounts);
        } else {
          resolve([]);
        }
      };

      this.on('mt5_login_list', handler);
      this.send({ mt5_login_list: 1 });
    });
  }

  // Get proposal for a contract
  getProposal(params: {
    contractType: 'CALL' | 'PUT';
    amount: number;
    duration: number;
    durationUnit: string;
    symbol: string;
    basis: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      const proposalHandler = (data: any) => {
        this.off('proposal', proposalHandler);
        
        if (data.error) {
          reject(new Error(data.error.message));
          return;
        }
        
        resolve(data);
      };

      this.on('proposal', proposalHandler);

      this.send({
        proposal: 1,
        amount: params.amount,
        basis: params.basis,
        contract_type: params.contractType,
        currency: 'USD',
        duration: params.duration,
        duration_unit: params.durationUnit,
        symbol: params.symbol,
      });
    });
  }

  // Buy a contract
  buyContract(proposalId: string, price: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const buyHandler = (data: any) => {
        this.off('buy', buyHandler);
        
        if (data.error) {
          reject(new Error(data.error.message));
          return;
        }
        
        resolve(data);
      };

      this.on('buy', buyHandler);

      this.send({
        buy: proposalId,
        price: price,
      });
    });
  }

  // Subscribe to contract updates
  subscribeToContract(contractId: string): void {
    this.send({
      proposal_open_contract: 1,
      contract_id: contractId,
      subscribe: 1,
    });
  }

  // Start ping to keep connection alive
  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ ping: 1 });
    }, 30000);
  }

  // Stop ping
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Attempt to reconnect
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.apiToken) {
      this.reconnectAttempts++;
      console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect(this.apiToken).catch(console.error);
      }, 2000 * this.reconnectAttempts);
    }
  }

  // Disconnect
  disconnect(): void {
    this.unsubscribeTicks();
    this.stopPing();
    
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnection attempt
      this.ws.close();
      this.ws = null;
    }
    
    this.isAuthenticated = false;
    this.apiToken = '';
    this.emit('status', 'disconnected');
  }

  // Check if connected
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated;
  }
}

// Export singleton instance
export const derivWS = new DerivWebSocket();
