import { BotConfig } from "../../../types/BotConfig";
import { DerivSupplyDemandStrategy } from "../../../strategies/DerivSupplyDemandStrategy";
import { delay } from "../../../utils/delay";
import saveTradeToDatabase from "./saveTradeToDatabase";
import convertTimeframe from "../helpers/convertTimeFrame";
import { updateExistingTrades } from "./UpdateExistingTrades";
import symbolTimeFrames from "../helpers/symbolTimeFrames";

const fetchLatestCandles = require("../../../strategies/fetchLatestCandles");
const executeTradeOnDeriv = require("./../deriv/executeTradeOnDeriv");
const botStates = require("../../../types/botStates");

const strategy = new DerivSupplyDemandStrategy();

/**
 * Execute a single trading cycle for a given user.
 * This function is called repeatedly by the bot controller.
 * It fetches the latest candle data for all symbols in the user's config,
 * analyzes the data using the Supply/Demand strategy, and executes trades
 * based on the strategy's signals.
 *
 * @param userId The ID of the user to execute the trading cycle for.
 * @param config The user's bot configuration.
 * @param candlesMap A map of symbol to candle data.
 */
export const executeTradingCycle = async (
  userId: string,
  config: BotConfig,
  candlesMap: Record<string, any[]>
) => {
  const botState = botStates.get(userId);
  if (!botState || !botState.isRunning) return;

  const mergedSymbols = Array.from(
    new Set([
      ...(config.symbols || []),
    ])
  );

  config.symbols = mergedSymbols;
  console.log(`🔥 Final Symbols: ${JSON.stringify(config.symbols)}`);

  const today = new Date().toISOString().slice(0, 10);
  if (botState.lastTradeDate !== today) {
    botState.dailyTrades = 0;
    botState.lastTradeDate = today;
  }

  let tradesThisCycle = 0;

  for (const symbol of config.symbols) {
    if (!botState.isRunning) break;

    // Max trades per cycle
    if (
      config.maxTradesPerCycle &&
      tradesThisCycle >= config.maxTradesPerCycle
    )
      break;

    // Max daily trades
    if (config.dailyTradeLimit && botState.dailyTrades >= config.dailyTradeLimit)
      break;


    try {
      let candles = [];

      try {

        candles = await fetchLatestCandles(symbol, symbolTimeFrames[symbol]);

      } catch (err: any) {
        console.log(`⚠️ Skipping ${symbol}: ${err.message}`);
        continue; // Continue to next symbol
      }

      if (!candles || candles.length === 0) {
        console.log(`⚠️ No candle data for ${symbol}, skipping`);
        continue;
      }

      const signal = strategy.analyzeCandles(
        candles,
        symbol,
        symbolTimeFrames[symbol]
      );

      console.log(`Signal debug for ${symbol}:`, signal);

      if (signal.action === "HOLD") {
        console.log(`⏸️ [${userId}] HOLD → ${symbol}`);
        continue;
      }

      const tradeResult = await executeTradeOnDeriv(userId, signal, config);

      if (tradeResult) {
        botState.tradesExecuted++;
        botState.dailyTrades++;
        tradesThisCycle++;
        botState.currentTrades.push(tradeResult);

        await saveTradeToDatabase(userId, tradeResult);
      }

      await delay(2000); // small pause between symbols

    } catch (error: any) {
      console.error(`❌ [${userId}] Error processing ${symbol}:`, error.message);
    }
  }

  const updated = await updateExistingTrades(userId);
  if (updated > 0) console.log(`📝 Updated ${updated} open trades`);

  console.log(`⏳ Next cycle in ${config.cycleInterval ?? 30} seconds...`);
};