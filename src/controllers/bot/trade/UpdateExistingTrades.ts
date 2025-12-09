const botStates = require('../../../types/botStates');
const { supabase } = require('../../../config/supabase');

/**
 * Updates existing trades for a given user.
 * Iterates through all open trades in the user's bot state and checks if they have expired.
 * If a trade has expired, marks it as closed and updates the database with the close price and timestamp.
 * Also cleans up the bot state by removing trades that are older than 1 hour.
 * @param {string} userId - The user ID of the user to update the trades for.
 * @returns {Promise<number>} - A promise that resolves to the number of trades updated.
 */
const updateExistingTrades = async (userId: string): Promise<number> => {
  let updatedTrades = 0;

  const botState = botStates.get(userId);
  if (!botState) return 0;

  for (const trade of botState.currentTrades) {
    if (trade.status === 'open') {

      const now = new Date();
      const tradeTime = new Date(trade.timestamp);

      const durationMs = 5 * 60 * 1000; // 5 minutes

      // Check if expired
      if (now.getTime() - tradeTime.getTime() > durationMs) {
        
        // Mark as closed
        trade.status = 'closed';
        trade.closedAt = now;
        trade.closePrice = trade.entryPrice;

        // Update in database
        const { error } = await supabase
          .from("trades")
          .update({
            status: 'closed',
            closed_at: now,
            close_price: trade.closePrice
          })
          .eq('trade_id', trade.id);

        if (!error) {
          updatedTrades++;
          console.log(`🔒 [${userId}] Contract ${trade.contractId} closed (expired)`);
        } else {
          console.error(`⚠️ [${userId}] Failed to update contract ${trade.contractId}`, error);
        }
      }
    }
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  botState.currentTrades = botState.currentTrades.filter((trade: any) =>
    trade.status === 'open' || new Date(trade.timestamp) > oneHourAgo
  );

  return updatedTrades;
};

export { updateExistingTrades };
