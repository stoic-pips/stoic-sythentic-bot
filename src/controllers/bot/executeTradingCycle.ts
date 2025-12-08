import { BotConfig } from "../../types/BotConfig";
import { delay } from "../../utils/delay";
import { getCandlesFromDeriv } from "./getCandlesFromDeriv";
import saveTradeToDatabase from "./saveTradeToDatabase";
import { updateExistingTrades } from "./UpdateExistingTrades";

const executeTradeOnDeriv = require('./executeTradeOnDeriv');
const botStates = require('../../types/botStates');

export const executeTradingCycle = async (userId: string, config: BotConfig) => {
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

        const timeframe = config.timeframe ?? 60;
        const count = config.candleCount ?? 100;

        const candles = await getCandlesFromDeriv(symbol, timeframe, count);

        if (!candles || candles.length < 20) {
          console.log(`⚠️ [${userId}] Not enough candles for ${symbol}`);
          continue;
        }

        console.log(`📊 [${userId}] Got ${candles.length} candles for ${symbol}`);

        const signal = botState.strategy.analyzeCandles(candles, symbol, timeframe);
        console.log(`🔍 [${userId}] Raw signal: `, signal);

        if (signal.action === "HOLD") {
          console.log(`⏸️ [${userId}] HOLD for ${symbol} — no trade`);
          continue;
        }

        const validatedSignal = {
          action: signal.action,
          symbol: signal.symbol || symbol,
          contract_type:
            signal.contract_type ||
            (signal.action === "BUY_CALL" ? "CALL" : "PUT"),
          amountPerTrade:
            signal.amount || config.amountPerTrade || 10,
          duration: signal.duration || 10,
          duration_unit: signal.duration_unit || "s",
          confidence: signal.confidence || 0.8,
          zone: signal.zone || {
            top: 0,
            bottom: 0,
            type: signal.action === "BUY_CALL" ? "demand" : "supply",
            strength: 0,
            symbol,
            timeframe,
            created: Date.now(),
            touched: 0,
          },
          timestamp: signal.timestamp || Date.now(),
        };

        console.log(`🚀 [${userId}] Executing trade:`);
        console.log(`   Symbol: ${validatedSignal.symbol}`);
        console.log(`   Action: ${validatedSignal.action}`);
        console.log(`   Contract: ${validatedSignal.contract_type}`);
        console.log(`   Amount: $${validatedSignal.amountPerTrade}`);
        console.log(`   Duration: ${validatedSignal.duration} ${validatedSignal.duration_unit}`);

        const tradeResult = await executeTradeOnDeriv(
          userId,
          validatedSignal,
          config
        );

        if (tradeResult && tradeResult.buy) {
          console.log(`✅ [${userId}] TRADE EXECUTED`);
          console.log(`   Contract ID: ${tradeResult.buy.contract_id}`);

          botState.tradesExecuted++;
          botState.currentTrades.push(tradeResult);

          await saveTradeToDatabase(userId, tradeResult);
          console.log(`💾 Trade saved`);
        } else {
          console.log(`❌ [${userId}] Trade failed or no result`);
        }

        await delay(2000);

      } catch (error: any) {
        console.error(`❌ [${userId}] Error analyzing ${symbol}:`, error.message);
      }
    }

    const updated = await updateExistingTrades(userId);
    if (updated > 0) {
      console.log(`📝 Updated ${updated} open trades`);
    }
  } catch (error: any) {
    console.error(`❌ [${userId}] Trading cycle error:`, error.message);
  }

  console.log(`⏳ Next cycle in ${config.cycleInterval ?? 30} seconds...`);
};
