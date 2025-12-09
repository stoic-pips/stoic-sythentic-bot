import { DerivSignal } from "../../strategies/DerivSupplyDemandStrategy";
const executeTradeOnDeriv = require('./executeTradeOnDeriv');
const botStates = require('../../types/botStates');
const saveTradeToDatabase = require('./saveTradeToDatabase');

/**
 * Handle a trading signal from a user.
 * This function is called whenever a supply/demand signal is generated
 * for a user. It checks if the signal is valid and if the user
 * is currently running the bot, and if so, executes the trade.
 * @param userId The ID of the user.
 * @param signal The trading signal received from the user.
 */
async function handleTradingSignal(userId: string, signal: DerivSignal) {
  const botState = botStates.get(userId);
  if (!botState || !botState.isRunning) return;

  // Get config
  const config = botState.config;
  
  // Check if this symbol is in our trading list
  if (!config.symbols.includes(signal.symbol)) {
    console.log(`⚠️ [${userId}] Signal for ${signal.symbol} ignored (not in trading list)`);
    return;
  }

  // Adjust amount based on user config
  signal.amount = config.amountPerTrade || 10;

  // Execute the trade
  const tradeResult = await executeTradeOnDeriv(userId, signal, config);
  
  if (tradeResult) {
    botState.tradesExecuted++;
    botState.currentTrades.push(tradeResult);
    
    // Save trade to database
    await saveTradeToDatabase(userId, tradeResult);
  }
}

module.exports = handleTradingSignal;