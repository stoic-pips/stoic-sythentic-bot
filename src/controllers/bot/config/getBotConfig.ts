import { Response } from 'express';
import { AuthenticatedRequest } from '../../../types/AuthenticatedRequest';

const supabase = require('../../../config/supabase').supabase;

const getBotConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("bot_configs")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      botConfig: data || {},
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

export { getBotConfig };
