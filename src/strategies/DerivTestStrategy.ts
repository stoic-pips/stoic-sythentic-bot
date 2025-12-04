// src/strategies/DerivTestStrategy.ts
import { DerivCandle } from '../deriv/types';
import { DerivSignal, DerivZone } from './DerivSupplyDemandStrategy';

export class DerivTestStrategy {
  private minSignalGap: number = 30000; // 30 seconds between signals for testing
  private lastSignalTime: number = 0;
  private tradeCount: number = 0;

  constructor() {
    console.log('🧪 Test strategy initialized - will generate alternating signals');
  }

// Update the analyzeCandles method to ensure proper values
analyzeCandles(candles: DerivCandle[], symbol: string, timeframe: number): DerivSignal {
  const currentTime = Date.now();
  
  if (currentTime - this.lastSignalTime < this.minSignalGap) {
    return this.createHoldSignal(symbol, timeframe);
  }

  const shouldBuyCall = this.tradeCount % 2 === 0;
  
  // Ensure symbol is a valid string
  const validSymbol = symbol || 'R_100';
  
  // Get current price
  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 100;
  
  const zone: DerivZone = {
    top: currentPrice + 10,
    bottom: currentPrice - 10,
    type: shouldBuyCall ? 'demand' : 'supply',
    strength: 7,
    symbol: validSymbol,
    timeframe,
    created: Date.now(),
    touched: 1
  };

  this.lastSignalTime = currentTime;
  this.tradeCount++;

  const action = shouldBuyCall ? 'BUY_CALL' : 'BUY_PUT';
  const contractType = shouldBuyCall ? 'CALL' : 'PUT';
  
  console.log(`🧪 Test strategy: Generating ${action} signal for ${validSymbol}`);

  // Return with explicit property values
  return {
    action: action,
    symbol: validSymbol,
    contract_type: contractType, // Make sure this is exactly 'contract_type'
    amount: 10,
    duration: 10,
    duration_unit: 's', // Use seconds instead of ticks
    confidence: 0.8,
    zone,
    timestamp: currentTime
  };
}

  public setMinSignalGap(ms: number): void {
    this.minSignalGap = ms;
    console.log(`⏱️ Test strategy: Min signal gap updated to ${ms}ms`);
  }

  private createHoldSignal(symbol: string, timeframe: number): DerivSignal {
    return {
      action: 'HOLD',
      symbol,
      contract_type: 'CALL',
      amount: 0,
      duration: 0,
      duration_unit: 'm',
      confidence: 0,
      zone: {
        top: 0,
        bottom: 0,
        type: 'demand',
        strength: 0,
        symbol,
        timeframe,
        created: Date.now(),
        touched: 0
      },
      timestamp: Date.now()
    };
  }
}