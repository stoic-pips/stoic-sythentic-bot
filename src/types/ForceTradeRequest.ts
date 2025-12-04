export interface ForceTradeRequest {
  symbol: string;
  contract_type: "CALL" | "PUT";
  amountPerTrade: number;
}
