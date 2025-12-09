import { Candle, Zone } from './types';

export class ZoneDetector {
  private consolidationThreshold: number = 0.02; // 2% price range
  private minConsolidationBars: number = 5;
  private impulseThreshold: number = 0.03; // 3% impulse move
  
  detectZones(candles: Candle[]): Zone[] {
    const zones: Zone[] = [];
    
    for (let i = 0; i < candles.length - this.minConsolidationBars; i++) {
      const potentialZones = this.findPotentialZones(candles.slice(i, i + 20));
      zones.push(...potentialZones);
    }
    
    return this.mergeSimilarZones(zones);
  }
  
  private findPotentialZones(candles: Candle[]): Zone[] {
    const zones: Zone[] = [];
    
    // Look for consolidation patterns
    for (let i = 0; i <= candles.length - this.minConsolidationBars; i++) {
      const consolidationBars = candles.slice(i, i + this.minConsolidationBars);
      
      if (this.isConsolidation(consolidationBars)) {
        const zone = this.analyzeConsolidation(consolidationBars, candles[i + this.minConsolidationBars]);
        if (zone) zones.push(zone);
      }
    }
    
    return zones;
  }
  
  private isConsolidation(bars: Candle[]): boolean {
    const highs = bars.map(b => b.high);
    const lows = bars.map(b => b.low);
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    const range = maxHigh - minLow;
    const avgPrice = bars.reduce((sum, b) => sum + b.close, 0) / bars.length;
    
    // Consolidation if range < threshold% of average price
    return (range / avgPrice) < this.consolidationThreshold;
  }
  
  private analyzeConsolidation(consolidationBars: Candle[], nextCandle?: Candle): Zone | null {
    if (!nextCandle) return null;
    
    const baseHigh = Math.max(...consolidationBars.map(b => b.high));
    const baseLow = Math.min(...consolidationBars.map(b => b.low));
    const baseRange = baseHigh - baseLow;
    
    // Check for downward breakout (Demand Zone)
    if (nextCandle.close < baseLow && 
        (nextCandle.close - nextCandle.low) / nextCandle.close > this.impulseThreshold) {
      
      return {
        top: baseHigh,
        bottom: baseLow,
        type: 'demand',
        strength: this.calculateZoneStrength(consolidationBars, nextCandle),
        timeframe: consolidationBars[0].timeframe,
        created: new Date(),
        touched: 0,
        isValid: true
      };
    }
    
    // Check for upward breakout (Supply Zone)
    if (nextCandle.close > baseHigh &&
        (nextCandle.high - nextCandle.close) / nextCandle.close > this.impulseThreshold) {
      
      return {
        top: baseHigh,
        bottom: baseLow,
        type: 'supply',
        strength: this.calculateZoneStrength(consolidationBars, nextCandle),
        timeframe: consolidationBars[0].timeframe,
        created: new Date(),
        touched: 0,
        isValid: true
      };
    }
    
    return null;
  }
  
  private calculateZoneStrength(consolidationBars: Candle[], impulseCandle: Candle): number {
    let strength = 5; // Base strength
    
    // 1. Volume analysis
    const avgVolume = consolidationBars.reduce((sum, b) => sum + b.volume, 0) / consolidationBars.length;
    if (impulseCandle.volume > avgVolume * 1.5) strength += 2;
    
    // 2. Impulse strength
    const impulseStrength = Math.abs(impulseCandle.close - impulseCandle.open) / impulseCandle.open;
    if (impulseStrength > 0.05) strength += 2;
    
    // 3. Clean break (little to no wick crossing back into zone)
    const hasCleanBreak = this.checkCleanBreak(consolidationBars, impulseCandle);
    if (hasCleanBreak) strength += 1;
    
    return Math.min(strength, 10);
  }
  
  private checkCleanBreak(consolidationBars: Candle[], impulseCandle: Candle): boolean {
    const baseHigh = Math.max(...consolidationBars.map(b => b.high));
    const baseLow = Math.min(...consolidationBars.map(b => b.low));
    
    if (impulseCandle.close < baseLow) {
      // For demand zones, check if low of impulse candle doesn't re-enter zone
      return impulseCandle.low <= baseLow * 0.995;
    } else {
      // For supply zones, check if high of impulse candle doesn't re-enter zone
      return impulseCandle.high >= baseHigh * 1.005;
    }
  }
  
  private mergeSimilarZones(zones: Zone[]): Zone[] {
    const merged: Zone[] = [];
    const mergeThreshold = 0.01; // 1% difference
    
    zones.forEach(zone => {
      const similarZone = merged.find(z => 
        Math.abs(z.top - zone.top) / zone.top < mergeThreshold &&
        Math.abs(z.bottom - zone.bottom) / zone.bottom < mergeThreshold &&
        z.type === zone.type
      );
      
      if (similarZone) {
        // Merge zones, keep stronger one
        if (zone.strength > similarZone.strength) {
          Object.assign(similarZone, zone);
        }
      } else {
        merged.push(zone);
      }
    });
    
    return merged;
  }
}