import { DerivCandle } from '../deriv/types';
import { ZoneDetector } from './ZoneDetector';

export interface DerivZone {
  top: number;
  bottom: number;
  type: 'demand' | 'supply';
  strength: number;
  symbol: string;
  timeframe: number;
  created: number;
  touched: number;
}

export interface DerivSignal {
  action: 'BUY_RISE' | 'BUY_FALL' | 'HOLD';
  symbol: string;
  contract_type: 'RISE' | 'FALL';
  amount: number;
  duration: number;
  duration_unit: 's' | 'm' | 'h' | 'd';
  confidence: number;
  zone: DerivZone;
  timestamp: number;
}

export class DerivSupplyDemandStrategy {
  private zoneDetector: ZoneDetector;
  private activeZones: DerivZone[] = [];
  private lastSignalTime: number = 0;
  private minSignalGap: number = 300000; // 5 minutes

  constructor() {
    this.zoneDetector = new ZoneDetector();
  }

  analyzeCandles(candles: DerivCandle[], symbol: string, timeframe: number): DerivSignal {
    const now = Date.now();

    // Prevent rapid-fire signals
    if (now - this.lastSignalTime < this.minSignalGap) {
      return this.HoldSignal(symbol, timeframe);
    }

    const standardCandles = candles.map(c => ({
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: 0,
      timestamp: new Date(c.epoch * 1000),
      timeframe: timeframe.toString()
    }));

    // Detect new zones
    this.updateZones(standardCandles, symbol, timeframe);

    const currentPrice = candles[candles.length - 1].close;
    const activeZone = this.findActiveZone(currentPrice, symbol);

    // If price is inside a zone → evaluate entry
    if (activeZone) {
      return this.evaluateZoneEntry(currentPrice, activeZone, standardCandles);
    }

    return this.HoldSignal(symbol, timeframe);
  }

  private updateZones(candles: any[], symbol: string, timeframe: number): void {
    const newZones = this.zoneDetector.detectZones(candles);

    newZones.forEach(zone => {
      const derivZone: DerivZone = {
        top: zone.top,
        bottom: zone.bottom,
        type: zone.type,
        strength: zone.strength,
        symbol,
        timeframe,
        created: Date.now(),
        touched: 0
      };

      const existingIndex = this.activeZones.findIndex(z =>
        Math.abs(z.top - derivZone.top) / derivZone.top < 0.01 &&
        Math.abs(z.bottom - derivZone.bottom) / derivZone.bottom < 0.01 &&
        z.symbol === symbol &&
        z.type === derivZone.type
      );

      if (existingIndex >= 0) {
        this.activeZones[existingIndex] = {
          ...this.activeZones[existingIndex],
          strength: Math.max(this.activeZones[existingIndex].strength, derivZone.strength),
          touched: this.activeZones[existingIndex].touched + 1
        };
      } else {
        this.activeZones.push(derivZone);
      }
    });

    // Remove zones older than 24 hours or over-used
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.activeZones = this.activeZones.filter(z => z.created > cutoff && z.touched < 3);
  }

  private findActiveZone(price: number, symbol: string): DerivZone | null {
    return (
      this.activeZones.find(
        z =>
          z.symbol === symbol &&
          price >= z.bottom &&
          price <= z.top
      ) || null
    );
  }

  private evaluateZoneEntry(
    currentPrice: number,
    zone: DerivZone,
    candles: any[]
  ): DerivSignal {
    const rsi = this.calculateRSI(candles.map(c => c.close));
    const latestRSI = rsi[rsi.length - 1];

    let confidence = 0.5;
    confidence += (10 - zone.strength) * 0.05;

    const baseAmount = 5; // You can adjust
    const duration = this.calculateDuration(zone.timeframe);

    // Demand zone = expect price to RISE
    if (zone.type === 'demand') {
      if (latestRSI < 35) {
        this.lastSignalTime = Date.now();
        confidence += 0.3;

        return {
          action: 'BUY_RISE',
          symbol: zone.symbol,
          contract_type: 'RISE',
          amount: baseAmount * confidence,
          duration: duration.value,
          duration_unit: duration.unit,
          confidence,
          zone,
          timestamp: Date.now()
        };
      }
    }

    // Supply zone = expect price to FALL
    if (zone.type === 'supply') {
      if (latestRSI > 65) {
        this.lastSignalTime = Date.now();
        confidence += 0.3;

        return {
          action: 'BUY_FALL',
          symbol: zone.symbol,
          contract_type: 'FALL',
          amount: baseAmount * confidence,
          duration: duration.value,
          duration_unit: duration.unit,
          confidence,
          zone,
          timestamp: Date.now()
        };
      }
    }

    return this.HoldSignal(zone.symbol, zone.timeframe);
  }

  private calculateRSI(prices: number[], period: number = 14): number[] {
    const rsi: number[] = [];

    for (let i = period; i < prices.length; i++) {
      const gains: number[] = [];
      const losses: number[] = [];

      for (let j = i - period + 1; j <= i; j++) {
        const diff = prices[j] - prices[j - 1];

        gains.push(diff > 0 ? diff : 0);
        losses.push(diff < 0 ? Math.abs(diff) : 0);
      }

      const avgGain = gains.reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.reduce((a, b) => a + b, 0) / period;

      const rs = avgGain / (avgLoss || 0.0001);
      const rsiValue = 100 - 100 / (1 + rs);

      rsi.push(isNaN(rsiValue) ? 50 : rsiValue);
    }

    return rsi;
  }

  private calculateDuration(timeframe: number): {
    value: number;
    unit: 's' | 'm' | 'h' | 'd';
  } {
    if (timeframe <= 60) return { value: 5, unit: 'm' };
    if (timeframe <= 300) return { value: 15, unit: 'm' };
    if (timeframe <= 900) return { value: 60, unit: 'm' };
    return { value: 120, unit: 'm' };
  }

  private HoldSignal(symbol: string, timeframe: number): DerivSignal {
    return {
      action: 'HOLD',
      symbol,
      contract_type: 'RISE', // Neutral, ignored
      amount: 0,
      duration: 0,
      duration_unit: 'm',
      confidence: 0,
      zone: this.getEmptyZone(symbol, timeframe),
      timestamp: Date.now()
    };
  }

  private getEmptyZone(symbol: string, timeframe: number): DerivZone {
    return {
      top: 0,
      bottom: 0,
      type: 'demand',
      strength: 0,
      symbol,
      timeframe,
      created: Date.now(),
      touched: 0
    };
  }

  public setMinSignalGap(ms: number): void {
    this.minSignalGap = ms;
    console.log(`⏱️ Test strategy: Min signal gap updated to ${ms}ms`);
  }
}
