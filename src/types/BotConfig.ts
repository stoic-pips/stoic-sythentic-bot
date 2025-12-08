export interface BotConfig {
  symbols: string[];
  amountPerTrade?: number;
  timeframe?: number;
  candleCount?: number;
  cycleInterval?: number;
}