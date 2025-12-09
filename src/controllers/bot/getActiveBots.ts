import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/AuthenticatedRequest';

const botStates = require('../../types/botStates');

/**
 * Returns a list of all active bots.
 * Requires admin access.
 *
 * @returns {Promise<Response>}
 * @return A response containing a list of active bots.
 * Each bot is represented as an object with the following properties:
 *  - userId: The user ID of the bot.
 *  - isRunning: Whether the bot is currently running.
 *  - startedAt: The timestamp when the bot was started.
 *  - tradesExecuted: The number of trades executed by the bot.
 *  - totalProfit: The total profit made by the bot.
 *  - activeTrades: The number of active trades currently open.
 *  - symbols: The symbols being traded by the bot.
 */
const getAllActiveBots = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });

    const activeBots = Array.from(botStates.entries()).map(([userId, state]) => ({
      userId,
      isRunning: state.isRunning,
      startedAt: state.startedAt,
      tradesExecuted: state.tradesExecuted,
      totalProfit: state.totalProfit,
      activeTrades: state.currentTrades.length,
      symbols: state.config.symbols || []
    }));

    res.json({
      totalActive: activeBots.length,
      bots: activeBots
    });
  } catch (error: any) {
    console.error('Get all bots error:', error);
    res.status(500).json({ error: 'Failed to get active bots' });
  }
};

module.exports = getAllActiveBots;