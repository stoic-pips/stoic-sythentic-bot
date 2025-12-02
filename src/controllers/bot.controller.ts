import { Request, Response } from 'express';
import { DerivSupplyDemandStrategy, DerivSignal } from '../strategies/DerivSupplyDemandStrategy';

const { supabase } = require('../config/supabase');

const deriv = require('../config/deriv');

interface JWTUser {
  id: string;
  email: string;
  subscription_status?: string;
  [key: string]: any;
}

interface AuthenticatedRequest extends Request {
  user: JWTUser;
}

// Bot state management
const botStates = new Map<string, {
  isRunning: boolean;
  startedAt: Date | null;
  tradingInterval: NodeJS.Timeout | null;
  currentTrades: any[];
  totalProfit: number;
  tradesExecuted: number;
  strategy: DerivSupplyDemandStrategy;
  derivConnected: boolean;
  config: any;
}>();

export const saveBotConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const config = req.body;

    console.log(`💾 Saving bot config for user ${userId}`);

    // Validate required config
    if (!config.symbols || !config.symbols.length) {
      return res.status(400).json({ error: "At least one trading symbol is required" });
    }

    // Validate trade amount based on subscription
    const baseAmount = config.amountPerTrade || 10;
    if (req.user.subscription_status === 'free' && baseAmount > 10) {
      return res.status(403).json({ 
        error: "Free users are limited to $10 per trade. Upgrade to premium for higher limits." 
      });
    }

    const { error } = await supabase
      .from("bot_configs")
      .upsert({
        user_id: userId,
        config_data: config,
        updated_at: new Date()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.log('Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Update local config if bot is running
    const botState = botStates.get(userId);
    if (botState && botState.isRunning) {
      botState.config = config;
      console.log(`🔄 Updated config for user ${userId} while bot is running`);
    }

    res.json({ 
      message: "Bot settings saved",
      user: {
        id: userId,
        subscription: req.user.subscription_status
      }
    });
  } catch (error: any) {
    console.error('Save bot config error:', error);
    res.status(500).json({ error: 'Failed to save bot configuration' });
  }
};

export const getBotConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("bot_configs")
      .select("config_data")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      config: data?.config_data || {},
      user: {
        id: userId,
        subscription: req.user.subscription_status
      }
    });
  } catch (error: any) {
    console.error('Get bot config error:', error);
    res.status(500).json({ error: 'Failed to get bot configuration' });
  }
};

exports.startBot = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const subscription = req.user.subscription_status;

    console.log(`🚀 Starting bot for user ${userId} (${userEmail})`);

    // Check if user already has a bot running (in-memory check)
    if (botStates.has(userId) && botStates.get(userId).isRunning) {
      return res.status(400).json({ 
        error: "You already have a bot running. Stop the current bot first." 
      });
    }

    // For ALL users (free and premium), check database for running bots
    const { data: existingBots } = await supabase
      .from("bot_status")
      .select("*")
      .eq("user_id", userId)
      .eq("is_running", true);

    if (existingBots && existingBots.length > 0) {
      // Clean up database state (in case of server restart)
      console.log(`🔄 Cleaning up stale bot status for user ${userId}`);
      await supabase
        .from("bot_status")
        .update({ is_running: false })
        .eq("user_id", userId);
    }

    // Get bot configuration
    const { data: configData, error: configError } = await supabase
      .from("bot_configs")
      .select("config_data")
      .eq("user_id", userId)
      .single();

    if (configError && configError.code !== 'PGRST116') {
      return res.status(400).json({ error: configError.message });
    }

    const config = configData?.config_data || {};
    
    // Validate config
    if (!config.symbols || config.symbols.length === 0) {
      return res.status(400).json({ error: "Please configure trading symbols first" });
    }

    // Validate trade amount based on subscription
    const baseAmount = config.amountPerTrade || 10;
    if (subscription === 'free' && baseAmount > 10) {
      return res.status(403).json({ 
        error: "Free users are limited to $10 per trade. Upgrade to premium for higher limits." 
      });
    }

    // Initialize bot state
    const strategy = new DerivSupplyDemandStrategy();
    
    if (config.minSignalGap) {
      strategy.setMinSignalGap(config.minSignalGap * 60000);
    }

    const botState = {
      isRunning: true,
      startedAt: new Date(),
      tradingInterval: null,
      currentTrades: [],
      totalProfit: 0,
      tradesExecuted: 0,
      strategy,
      derivConnected: true,
      config
    };

    botStates.set(userId, botState);

    // Save bot status to database
    const startedAt = new Date();
    const { error: statusError } = await supabase
      .from("bot_status")
      .upsert({
        user_id: userId,
        is_running: true,
        started_at: startedAt,
        current_trades: [],
        updated_at: startedAt
      });

    if (statusError) {
      console.log('Database error:', statusError);
    }

    // Start the trading cycle
    const tradingInterval = setInterval(() => {
      executeTradingCycle(userId, config);
    }, config.analysisInterval || 30000);

    botState.tradingInterval = tradingInterval;

    console.log(`🤖 Bot started for user ${userId}`);
    console.log(`📊 Trading symbols: ${config.symbols.join(', ')}`);
    console.log(`💰 Trade amount: $${baseAmount}`);
    console.log(`👑 Subscription: ${subscription}`);

    res.json({ 
      message: "Trading bot started successfully",
      status: "running",
      startedAt: startedAt,
      user: {
        id: userId,
        email: userEmail,
        subscription: subscription
      },
      config: {
        symbols: config.symbols,
        analysisInterval: config.analysisInterval || 30,
        amountPerTrade: baseAmount
      }
    });

  } catch (error) {
    console.error('Start bot error:', error);
    res.status(500).json({ error: 'Failed to start bot: ' + error.message });
  }
};

export const stopBot = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const botState = botStates.get(userId);

    console.log(`🛑 Stopping bot for user ${userId}`);

    if (!botState || !botState.isRunning) {
      return res.status(400).json({ error: "Bot is not running for your account" });
    }

    // Stop the interval
    if (botState.tradingInterval) {
      clearInterval(botState.tradingInterval);
      botState.tradingInterval = null;
    }

    // Remove signal handler
    if (botState.config._signalHandler) {
      deriv.off('trading_signal', botState.config._signalHandler);
    }

    // Unsubscribe from all symbols
    if (botState.config.symbols) {
      // Note: You might need to implement unsubscribe in DerivWebSocket
      console.log(`🔇 Unsubscribed from symbols for user ${userId}`);
    }

    // Update bot state
    botState.isRunning = false;
    botState.derivConnected = false;

    // Update database
    const stoppedAt = new Date();
    const { error } = await supabase
      .from("bot_status")
      .update({
        is_running: false,
        stopped_at: stoppedAt,
        updated_at: stoppedAt
      })
      .eq("user_id", userId);

    if (error) {
      console.log('Database error:', error);
    }

    // Remove from memory
    botStates.delete(userId);

    console.log(`✅ Bot stopped for user ${userId}`);
    console.log(`📊 Final stats: ${botState.tradesExecuted} trades, P&L: $${botState.totalProfit.toFixed(2)}`);

    res.json({ 
      message: "Trading bot stopped successfully",
      status: "stopped",
      startedAt: botState.startedAt,
      stoppedAt: stoppedAt,
      performance: {
        tradesExecuted: botState.tradesExecuted,
        totalProfit: botState.totalProfit,
        activeTrades: botState.currentTrades.length
      },
      user: {
        id: userId,
        subscription: req.user.subscription_status
      }
    });
  } catch (error: any) {
    console.error('Stop bot error:', error);
    res.status(500).json({ error: 'Failed to stop bot' });
  }
};

export const getBotStatus = async (req: AuthenticatedRequest, res: Response) => {
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

// Real trading functions
async function executeTradingCycle(userId: string, config: any) {
  const botState = botStates.get(userId);
  if (!botState || !botState.isRunning) return;

  console.log(`📊 [${userId}] Executing trading cycle...`);

  try {
    // For each symbol, get recent candles and analyze
    for (const symbol of config.symbols) {
      if (!botState.isRunning) break;

      try {
        // Get historical data
        const timeframe = config.timeframe || 60; // Default 1-minute candles
        const candles = await getCandlesFromDeriv(symbol, timeframe, 100);
        
        if (candles.length < 20) {
          console.log(`⚠️ [${userId}] Insufficient data for ${symbol}`);
          continue;
        }

        // Analyze with supply/demand strategy
        const signal = botState.strategy.analyzeCandles(candles, symbol, timeframe);
        
        if (signal.action !== 'HOLD') {
          console.log(`🎯 [${userId}] Signal generated: ${signal.action} ${signal.symbol}`);
          
          // Adjust amount based on user config
          signal.amount = config.amountPerTrade || 10;
          
          // Execute trade
          const tradeResult = await executeTradeOnDeriv(userId, signal, config);
          
          if (tradeResult) {
            botState.tradesExecuted++;
            botState.currentTrades.push(tradeResult);
            
            // Save trade to database
            await saveTradeToDatabase(userId, tradeResult);
          }
        }

        // Small delay to avoid rate limits
        await delay(1000);
        
      } catch (error: any) {
        console.error(`❌ [${userId}] Error analyzing ${symbol}:`, error.message);
      }
    }

    // Update existing trades
    updateExistingTrades(userId);

  } catch (error: any) {
    console.error(`❌ [${userId}] Trading cycle error:`, error.message);
  }
}

async function getCandlesFromDeriv(symbol: string, timeframe: number, count: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const requestId = Date.now();
    
    // Set up one-time listener
    const handler = (data: any) => {
      if (data.req_id === requestId) {
        deriv.off('message', handler);
        if (data.candles || data.history?.prices) {
          const candles = data.candles || data.history.prices;
          resolve(candles.map((c: any) => ({
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
            epoch: c.epoch || c.time
          })));
        } else {
          reject(new Error('No candle data returned'));
        }
      }
    };

    deriv.on('message', handler);

    // Send request
    deriv.send({
      ticks_history: symbol,
      adjust_start_time: 1,
      end: 'latest',
      start: 1,
      count,
      style: 'candles',
      granularity: timeframe,
      req_id: requestId
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      deriv.off('message', handler);
      reject(new Error('Timeout loading candles'));
    }, 5000);
  });
}

async function executeTradeOnDeriv(userId: string, signal: DerivSignal, config: any): Promise<any> {
  try {
    console.log(`📤 [${userId}] Executing trade: ${signal.contract_type} ${signal.symbol} $${signal.amount}`);
    
    // Get proposal first
    const proposal = await getProposalFromDeriv(signal);
    
    if (!proposal) {
      console.error(`❌ [${userId}] No proposal received`);
      return null;
    }

    console.log(`📊 [${userId}] Proposal: ${proposal.display_value} - Payout: $${proposal.payout}`);
    
    // Execute the trade
    const tradeResult = await buyContractOnDeriv(signal, proposal.id);
    
    if (!tradeResult) {
      console.error(`❌ [${userId}] Trade execution failed`);
      return null;
    }

    console.log(`✅ [${userId}] Trade executed: ${tradeResult.buy?.contract_id}`);
    
    return {
      id: tradeResult.buy?.contract_id || Date.now().toString(),
      userId: userId,
      symbol: signal.symbol,
      contractType: signal.contract_type,
      action: signal.action,
      amount: signal.amount,
      entryPrice: tradeResult.buy?.entry_tick || 0,
      payout: tradeResult.buy?.payout || 0,
      status: 'open',
      timestamp: new Date(),
      proposalId: proposal.id,
      contractId: tradeResult.buy?.contract_id,
      pnl: 0,
      pnlPercentage: 0
    };

  } catch (error: any) {
    console.error(`❌ [${userId}] Trade execution error:`, error.message);
    return null;
  }
}

async function getProposalFromDeriv(signal: DerivSignal): Promise<any> {
  return new Promise((resolve, reject) => {
    const requestId = Date.now();
    
    const handler = (data: any) => {
      if (data.req_id === requestId) {
        deriv.off('message', handler);
        if (data.proposal) {
          resolve(data.proposal);
        } else {
          reject(new Error('No proposal returned'));
        }
      }
    };

    deriv.on('message', handler);

    deriv.send({
      proposal: 1,
      amount: signal.amount,
      basis: 'stake',
      contract_type: signal.contract_type,
      currency: 'USD',
      duration: signal.duration,
      duration_unit: signal.duration_unit,
      symbol: signal.symbol,
      req_id: requestId
    });

    setTimeout(() => {
      deriv.off('message', handler);
      reject(new Error('Timeout getting proposal'));
    }, 5000);
  });
}

async function buyContractOnDeriv(signal: DerivSignal, proposalId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const requestId = Date.now();
    
    const handler = (data: any) => {
      if (data.req_id === requestId) {
        deriv.off('message', handler);
        if (data.buy) {
          resolve(data);
        } else {
          reject(new Error('Buy request failed'));
        }
      }
    };

    deriv.on('message', handler);

    deriv.send({
      buy: proposalId,
      price: signal.amount,
      req_id: requestId
    });

    setTimeout(() => {
      deriv.off('message', handler);
      reject(new Error('Timeout buying contract'));
    }, 5000);
  });
}

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

async function saveTradeToDatabase(userId: string, trade: any) {
  try {
    const { error } = await supabase
      .from("trades")
      .insert({
        user_id: userId,
        trade_id: trade.id,
        symbol: trade.symbol,
        contract_type: trade.contractType,
        action: trade.action,
        amount: trade.amount,
        entry_price: trade.entryPrice,
        payout: trade.payout,
        status: trade.status,
        contract_id: trade.contractId,
        proposal_id: trade.proposalId,
        pnl: trade.pnl,
        pnl_percentage: trade.pnlPercentage,
        created_at: trade.timestamp
      });

    if (error) {
      console.error(`❌ [${userId}] Failed to save trade to database:`, error.message);
    } else {
      console.log(`💾 [${userId}] Trade saved to database: ${trade.id}`);
    }
  } catch (error: any) {
    console.error(`❌ [${userId}] Save trade error:`, error.message);
  }
}

async function updateExistingTrades(userId: string) {
  const botState = botStates.get(userId);
  if (!botState) return;

  // Check for contract updates
  botState.currentTrades.forEach(async (trade: any, index: number) => {
    if (trade.status === 'open') {
      // Check if contract is expired (assuming 5-minute contracts)
      const now = new Date();
      const tradeTime = new Date(trade.timestamp);
      const duration = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      if (now.getTime() - tradeTime.getTime() > duration) {
        // Contract expired, close it
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
          console.log(`🔒 [${userId}] Contract ${trade.contractId} closed (expired)`);
        }
      }
    }
  });

  // Remove closed trades from memory after 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  botState.currentTrades = botState.currentTrades.filter((trade: any) => 
    trade.status === 'open' || new Date(trade.timestamp) > oneHourAgo
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isDerivConnected(): boolean {
  // Implement proper connection check
  return true; // Simplified
}

// Add this to your bot routes
export const forceTrade = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { symbol, contract_type, amount } = req.body;
    
    if (!symbol || !contract_type || !amount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate amount based on subscription
    if (req.user.subscription_status === 'free' && amount > 10) {
      return res.status(403).json({ 
        error: "Free users are limited to $10 per trade. Upgrade to premium for higher limits." 
      });
    }

    const signal: DerivSignal = {
      action: contract_type === 'CALL' ? 'BUY_CALL' : 'BUY_PUT',
      symbol,
      contract_type: contract_type as 'CALL' | 'PUT',
      amount: parseFloat(amount),
      duration: 5,
      duration_unit: 'm',
      confidence: 0.7,
      zone: {
        top: 0,
        bottom: 0,
        type: contract_type === 'CALL' ? 'demand' : 'supply',
        strength: 0,
        symbol,
        timeframe: 60,
        created: Date.now(),
        touched: 0
      },
      timestamp: Date.now()
    };

    const botState = botStates.get(userId);
    const config = botState?.config || {};

    const tradeResult = await executeTradeOnDeriv(userId, signal, config);
    
    if (tradeResult) {
      res.json({ 
        message: "Trade executed successfully",
        contractId: tradeResult.buy?.contract_id,
        payout: tradeResult.buy?.payout,
        user: {
          id: userId,
          subscription: req.user.subscription_status
        }
      });
    } else {
      res.status(500).json({ error: "Trade execution failed" });
    }
  } catch (error: any) {
    console.error('Force trade error:', error);
    res.status(500).json({ error: 'Failed to execute trade' });
  }
};

// Get all active bots (admin function)
export const getAllActiveBots = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is admin (you can add this check)
    // if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });

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