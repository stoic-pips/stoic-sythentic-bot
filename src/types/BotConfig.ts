import { ContractPreference } from "./ContactPreferences";

export interface BotConfig {
  symbols: string[];
  amountPerTrade?: number;
  timeframe?: number;
  candleCount?: number;
  cycleInterval?: number;
  contractPreference?: ContractPreference;
  maxTradesPerCycle?: number;   // new
  dailyTradeLimit?: number;     // new
}