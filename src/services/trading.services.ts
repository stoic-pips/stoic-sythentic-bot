import { DerivWebSocket } from '../deriv/DerivWebSocket';
import { DerivSupplyDemandStrategy, DerivSignal } from '../strategies/DerivSupplyDemandStrategy';
import ContractType from '../types/contractType';

interface ContractParameters {
  amount: number;
  barrier?: number;
  basis: string;
  contract_type: 'CALL' | 'PUT' | 'MULTUP' | 'MULTDOWN' | 'RISE' | 'FALL';
  currency: string;
  duration: number;
  duration_unit: 's' | 'm' | 'h' | 'd';
  symbol: string;
}

interface TradeResult {
  buy: {
    balance_after: number;
    contract_id: string;
    entry_tick: number;
    payout: number;
    price: number;
  };
  contract_type: string;
  longcode: string;
  proposal_id?: string;
}

export class TradingService {
  private derivWS: DerivWebSocket;
  private strategy: DerivSupplyDemandStrategy;
  private activeZones: any[] = [];
  private activeSymbols: string[] = [];
  private isRunning: boolean = false;
  private pendingRequests: Map<number, { resolve: Function, reject: Function }> = new Map();
  private requestId: number = 1;

  constructor(apiToken: string, appId: string = '1089') {
    this.derivWS = new DerivWebSocket({
      apiToken,
      appId,
      reconnect: true,
      maxReconnectAttempts: 10,
      heartbeatInterval: 15000
    });
    
    this.strategy = new DerivSupplyDemandStrategy();
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.derivWS.on('message', (data: any) => {
      this.handleDerivMessage(data);
    });

    this.derivWS.on('trading_signal', (signal: DerivSignal) => {
      this.handleTradingSignal(signal);
    });
  }

  async initialize(): Promise<void> {
    this.derivWS.connect();
    
    await new Promise<void>((resolve) => {
      const authHandler = (data: any) => {
        if (data.msg_type === 'authorize') {
          console.log('✅ Authorized successfully');
          this.derivWS.off('message', authHandler);
          resolve();
        }
      };
      this.derivWS.on('message', authHandler);
      
      setTimeout(() => {
        this.derivWS.off('message', authHandler);
        resolve();
      }, 10000);
    });

    await this.loadActiveSymbols();
    
    console.log(`📊 Loaded ${this.activeSymbols.length} trading symbols`);
  }

  private async loadActiveSymbols(): Promise<void> {
    return new Promise((resolve, reject) => {
      const requestId = this.requestId++;
      
      this.pendingRequests.set(requestId, {
        resolve: (data: any) => {
          if (data.active_symbols) {
            this.activeSymbols = data.active_symbols
              .filter((s: any) => s.exchange_is_open === 1)
              .map((s: any) => s.symbol)
              .slice(0, 10);
            resolve();
          } else {
            reject(new Error('No symbols returned'));
          }
        },
        reject
      });

      this.derivWS.send({
        active_symbols: 'brief',
        product_type: 'basic',
        req_id: requestId
      });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Timeout loading symbols'));
        }
      }, 5000);
    });
  }

private handleDerivMessage(data: any): void {
  if (data.req_id) {
    const pending = this.pendingRequests.get(data.req_id);
    if (pending) {
      this.pendingRequests.delete(data.req_id);
      if (data.error) {
        pending.reject(new Error(data.error.message));
      } else {
        pending.resolve(data);
      }
    }
  }

  if (data.proposal) {
    console.log(`📊 Proposal received for ${data.echo_req?.symbol}: ${data.proposal.display_value}`);
  }

  if (data.buy) {
    console.log(`✅ Trade executed: ${data.buy.contract_id} - Payout: $${data.buy.payout}`);
  }
}

  async analyzeAndTrade(symbol: string, timeframe: number = 60): Promise<DerivSignal | null> {
    try {
      const candles = await this.getCandles(symbol, timeframe, 100);
      
      if (candles.length < 50) {
        console.warn(`Insufficient data for ${symbol}`);
        return null;
      }

      const signal = this.strategy.analyzeCandles(candles, symbol, timeframe);
      
      if (signal.action !== 'HOLD') {
        console.log(`🎯 Signal generated: ${signal.action} for ${symbol}`);
        
        await this.executeTrade(signal);
        
        return signal;
      }
      
      return null;
      
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
      return null;
    }
  }

  private async getCandles(symbol: string, timeframe: number, count: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const requestId = this.requestId++;
      
      this.pendingRequests.set(requestId, {
        resolve: (data: any) => {
          if (data.candles || data.history?.prices) {
            const candles = data.candles || data.history.prices;
            resolve(candles.map((c: any) => ({
              open: parseFloat(c.open),
              high: parseFloat(c.high),
              low: parseFloat(c.low),
              close: parseFloat(c.close),
              epoch: c.epoch || c.time
            })));
          } else {
            reject(new Error('No candle data returned'));
          }
        },
        reject
      });

      this.derivWS.send({
        ticks_history: symbol,
        adjust_start_time: 1,
        end: 'latest',
        start: 1,
        count,
        style: 'candles',
        granularity: timeframe,
        req_id: requestId
      });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Timeout loading candles'));
        }
      }, 5000);
    });
  }

  private async executeTrade(signal: DerivSignal): Promise<void> {
    try {
      const proposal = await this.getProposal(signal);
      
      if (proposal) {
        console.log(`📈 Proposal: ${proposal.display_value} - Payout: ${proposal.payout}`);
        
        await this.buyContract(signal, proposal.proposal_id);
      }
      
    } catch (error) {
      console.error('Error executing trade:', error);
    }
  }

  private async getProposal(signal: DerivSignal): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = this.requestId++;
      
      const params: ContractParameters = {
        amount: signal.amount,
        basis: 'stake',
        contract_type: signal.contract_type === "RISE" ? "CALL" : signal.contract_type as ContractType,
        currency: 'USD',
        duration: signal.duration,
        duration_unit: signal.duration_unit,
        symbol: signal.symbol
      };

      this.pendingRequests.set(requestId, {
        resolve: (data: any) => {
          if (data.proposal) {
            resolve(data.proposal);
          } else {
            reject(new Error('No proposal returned'));
          }
        },
        reject
      });

      this.derivWS.send({
        proposal: 1,
        ...params,
        req_id: requestId
      });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Timeout getting proposal'));
        }
      }, 5000);
    });
  }

  private async buyContract(signal: DerivSignal, proposalId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const requestId = this.requestId++;
      
      const params: ContractParameters = {
        amount: signal.amount,
        basis: 'stake',
        contract_type: signal.contract_type as ContractType,
        currency: 'USD',
        duration: signal.duration,
        duration_unit: signal.duration_unit,
        symbol: signal.symbol
      };

      this.pendingRequests.set(requestId, {
        resolve: (data: any) => {
          if (data.buy) {
            console.log(`✅ Contract purchased: ${data.buy.contract_id}`);
            resolve();
          } else {
            reject(new Error('Buy request failed'));
          }
        },
        reject
      });

      this.derivWS.send({
        buy: proposalId || '1',
        price: signal.amount,
        parameters: params,
        req_id: requestId
      });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Timeout buying contract'));
        }
      }, 5000);
    });
  }

  private handleTradingSignal(signal: DerivSignal): void {
    console.log(`🚀 Trading signal received: ${signal.action} ${signal.symbol}`);
    
    if (this.isRunning) {
      this.executeTrade(signal).catch(console.error);
    }
  }

  startMonitoring(interval: number = 60000): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`🚀 Starting monitoring (interval: ${interval}ms)`);
    
    this.activeSymbols.forEach(symbol => {
      this.derivWS.subscribeTicks(symbol);
      console.log(`👂 Listening to real-time ticks for ${symbol}`);
    });
    
    const analysisInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(analysisInterval);
        return;
      }
      
      this.activeSymbols.forEach(async (symbol) => {
        try {
          await this.analyzeAndTrade(symbol);
          await this.delay(1000); // Rate limiting
        } catch (error) {
          console.error(`Error analyzing ${symbol}:`, error);
        }
      });
    }, interval);
  }

  stopMonitoring(): void {
    this.isRunning = false;
    console.log('🛑 Monitoring stopped');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStrategy(): DerivSupplyDemandStrategy {
    return this.strategy;
  }

  getActiveSymbols(): string[] {
    return [...this.activeSymbols];
  }

  getActiveZones(): any[] {
    return this.activeZones;
  }

  disconnect(): void {
    this.derivWS.disconnect();
    this.isRunning = false;
  }

  // Method to manually trigger analysis
  async analyzeSymbol(symbol: string, timeframe?: number): Promise<DerivSignal | null> {
    return this.analyzeAndTrade(symbol, timeframe);
  }
}