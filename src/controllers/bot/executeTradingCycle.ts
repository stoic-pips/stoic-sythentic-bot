const botStates = require('../../types/botStates');
const { executeTradeOnDeriv } = require('./executeTradeOnDeriv');
const { getCandlesFromDeriv } = require('./getCandlesFromDeriv');
const { saveTradeToDatabase } = require('./saveTradeToDatabase');
const { updateExistingTrades } = require('./UpdateExistingTrades');
import { delay } from "../../utils/delay";

const executeTradingCycle = async (userId: string, config: any) => {
  const botState = botStates.get(userId);
  if (!botState || !botState.isRunning) {
    console.log(`⏹️ [${userId}] Bot stopped, skipping cycle`);
    return;
  }

  console.log(`📊 [${userId}] Executing trading cycle at ${new Date().toLocaleTimeString()}...`);

  try {
    for (const symbol of config.symbols) {
      if (!botState.isRunning) break;

      try {
        console.log(`📈 [${userId}] Analyzing ${symbol}...`);
        
        const timeframe = config.timeframe || 60;
        const count = config.candleCount || 100;
        const candles = await getCandlesFromDeriv(symbol, timeframe, count);
        
        if (candles.length < 20) {
          console.log(`⚠️ [${userId}] Insufficient data for ${symbol} (only ${candles.length} candles)`);
          continue;
        }

        console.log(`📊 [${userId}] Got ${candles.length} candles for ${symbol}`);
        
        const signal = botState.strategy.analyzeCandles(candles, symbol, timeframe);

        console.log(`🔍 [${userId}] Raw signal:`, signal);

        if (signal.action !== 'HOLD') {

          // 🛠️ Ensure ALL required fields are present
          const validatedSignal = {
            action: signal.action,
            symbol: signal.symbol || symbol,

            // Contract type derived if missing
            contract_type:
              signal.contract_type ||
              (signal.action === "BUY_CALL" ? "CALL" : "PUT"),

            // Amount
            amountPerTrade: signal.amount || config.amountPerTrade || 10,

            // Duration defaults
            duration: signal.duration || 10,
            duration_unit: signal.duration_unit || "s",

            // Confidence fallback
            confidence: signal.confidence || 0.8,

            // Zone fallback
            zone: signal.zone || {
              top: 0,
              bottom: 0,
              type: signal.action === 'BUY_CALL' ? 'demand' : 'supply',
              strength: 0,
              symbol: signal.symbol || symbol,
              timeframe,
              created: Date.now(),
              touched: 0
            },

            timestamp: signal.timestamp || Date.now()
          };

          console.log(`🚀 [${userId}] Executing trade:`);
          console.log(`   Symbol: ${validatedSignal.symbol}`);
          console.log(`   Action: ${validatedSignal.action}`);
          console.log(`   Contract: ${validatedSignal.contract_type}`);
          console.log(`   Amount: $${validatedSignal.amountPerTrade}`);
          console.log(`   Duration: ${validatedSignal.duration} ${validatedSignal.duration_unit}`);

          // ********************************************
          // MOST IMPORTANT: Pass validatedSignal 
          // ********************************************
          const tradeResult = await executeTradeOnDeriv(
            userId,
            validatedSignal,
            config
          );

          if (tradeResult && tradeResult.buy) {
            console.log(`✅ [${userId}] TRADE EXECUTED SUCCESSFULLY!`);
            console.log(`   Contract ID: ${tradeResult.buy.contract_id}`);
            console.log(`   Payout: $${tradeResult.buy.payout}`);
            console.log(`   Entry Tick: ${tradeResult.buy.entry_tick}`);
            
            botState.tradesExecuted++;
            botState.currentTrades.push(tradeResult);
            
            await saveTradeToDatabase(userId, tradeResult);
            console.log(`💾 [${userId}] Trade saved to database`);
          } else {
            console.log(`❌ [${userId}] Trade execution failed or returned no result`);
          }

        } else {
          console.log(`⏸️ [${userId}] No signal for ${symbol} — HOLD`);
        }

        await delay(2000);

      } catch (error: any) {
        console.error(`❌ [${userId}] Error analyzing ${symbol}:`, error.message);
        console.error(error.stack);
      }
    }

    const updated = await updateExistingTrades(userId);
    if (updated > 0) {
      console.log(`📝 [${userId}] Updated ${updated} existing trades`);
    }

  } catch (error: any) {
    console.error(`❌ [${userId}] Trading cycle error:`, error.message);
    console.error(error.stack);
  }
  
  console.log(`✅ [${userId}] Trading cycle completed`);
  console.log(`⏳ [${userId}] Next cycle in ${(config.cycleInterval || 30)} seconds...`);
}

module.exports = executeTradingCycle;