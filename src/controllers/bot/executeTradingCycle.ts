import { BotConfig } from "../../types/BotConfig";
import supportsRiseFall from "../../types/supportRiseFail";
import { delay } from "../../utils/delay";
import saveTradeToDatabase from "./saveTradeToDatabase";
import { updateExistingTrades } from "./UpdateExistingTrades";

const executeTradeOnDeriv = require('./executeTradeOnDeriv');
const botStates = require('../../types/botStates');

export const executeTradingCycle = async (userId: string, config: BotConfig) => {
  console.log(`🚀 [${userId}] Starting trading cycle with config:`, {
    symbols: config.symbols,
    amountPerTrade: config.amountPerTrade
  });

  const botState = botStates.get(userId);

  if (!botState || !botState.isRunning) {
    console.log(`⏹️ [${userId}] Bot stopped, skipping cycle`);
    return;
  }

  try {
    for (const symbol of (config.symbols || [])) {
      if (!botState.isRunning) break;

      try {
        console.log(`📈 [${userId}] Processing ${symbol}...`);

        const isRiseFall = supportsRiseFall(symbol);

        let action = "BUY_CALL";
        let contract_type = "CALL";

        if (isRiseFall) {
            action = "BUY_CALL";     // RISE → CALL
            contract_type = "CALL";  // RISE → CALL
        }

        const signal = {
          action: action,
          symbol: symbol,
          contract_type: contract_type,
          amount: config.amountPerTrade || 10,
          duration: isRiseFall ? 5 : 60,
          duration_unit: isRiseFall ? 't' : 's',
          timestamp: Date.now()
        };

        console.log(`🔍 [${userId}] Created signal object:`, {
          action: signal.action,
          symbol: signal.symbol,
          amount: signal.amount,
          contract_type: signal.contract_type
        });

        // Pass the SIGNAL, not the config!
        const tradeResult = await executeTradeOnDeriv(userId, signal, config);

        if (tradeResult) {
          console.log(`✅ [${userId}] Trade executed successfully`);
          
          botState.tradesExecuted++;
          botState.currentTrades.push(tradeResult);

          await saveTradeToDatabase(userId, tradeResult);
          console.log(`💾 Trade saved to database`);
        } else {
          console.log(`⚠️ [${userId}] No trade result returned`);
        }

        await delay(2000);

      } catch (error: any) {
        console.error(`❌ [${userId}] Error processing ${symbol}:`, error.message);
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
