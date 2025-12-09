import { Response } from 'express';
import { AuthenticatedRequest } from '../../../types/AuthenticatedRequest';

const botStates = require('../../../types/botStates');

/**
 * Returns the current status of the bot for the given user.
 * @param {AuthenticatedRequest} req - The authenticated request object.
 * @param {Response} res - The response object to send the result.
 * @returns {Promise<Response>} - A promise that resolves to a response object.
 * The response object contains the following properties:
 * - isRunning: A boolean indicating whether the bot is currently running.
 * - startedAt: The timestamp when the bot was started.
 * - stoppedAt: The timestamp when the bot was stopped.
 * - currentTrades: An array of open trades.
 * - totalProfit: The total profit made by the bot.
 * - tradesExecuted: The number of trades executed by the bot.
 * - message: A message indicating whether the bot is running or not.
 * - user: An object containing the user ID and subscription status.
 */
const getBotStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const botState = botStates.get(userId);

    console.log(`📊 Getting bot status for user ${userId}`);

    if (!botState) {
      // Check database for historical status
      const { data: status, error } = await supabase
        .from("bot_status")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return res.status(400).json({ error: error.message });
      }

      return res.json({
        isRunning: false,
        startedAt: status?.started_at || null,
        stoppedAt: status?.stopped_at || null,
        currentTrades: [],
        totalProfit: 0,
        tradesExecuted: 0,
        message: "Bot not currently running",
        user: {
          id: userId,
          subscription: req.user.subscription_status
        }
      });
    }

    const activeTrades = botState.currentTrades.filter((trade: any) => trade.status === 'open');
    const closedTrades = botState.currentTrades.filter((trade: any) => trade.status === 'closed');

    res.json({
      isRunning: botState.isRunning,
      startedAt: botState.startedAt,
      stoppedAt: null,
      performance: {
        totalProfit: botState.totalProfit,
        tradesExecuted: botState.tradesExecuted,
        activeTrades: activeTrades.length,
        closedTrades: closedTrades.length,
        winRate: botState.tradesExecuted > 0 ? 
          ((botState.tradesExecuted - closedTrades.filter((t: any) => t.pnl < 0).length) / botState.tradesExecuted * 100).toFixed(1) : 0
      },
      activeTrades: activeTrades,
      config: botState.config,
      derivConnected: botState.derivConnected,
      status: botState.isRunning ? "running" : "stopped",
      user: {
        id: userId,
        subscription: req.user.subscription_status
      }
    });
  } catch (error: any) {
    console.error('Get bot status error:', error);
    res.status(500).json({ error: 'Failed to get bot status' });
  }
};

export { getBotStatus };