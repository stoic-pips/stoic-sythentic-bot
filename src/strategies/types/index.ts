export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
  timeframe: string;
}

export interface Zone {
  top: number;
  bottom: number;
  type: 'demand' | 'supply';
  strength: number; // 1-10 scale
  timeframe: string;
  created: Date;
  touched: number; // Times price revisited
  isValid: boolean;
}

export interface TradeSignal {
  action: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE';
  symbol: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number; // 0-1 scale
  zone: Zone;
  timestamp: Date;
}

export interface StrategyConfig {
  minZoneStrength: number;
  maxZoneAgeHours: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  riskRewardRatio: number;
  maxRiskPerTrade: number; // Percentage of capital
}