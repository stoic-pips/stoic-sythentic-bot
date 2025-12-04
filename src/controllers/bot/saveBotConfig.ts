import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/AuthenticatedRequest';

const supabase = require('../../config/supabase').supabase;

const saveBotConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const config = req.body;

    if (!user || !user.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { error } = await supabase
      .from("bot_configs")
      .upsert({
        user_id: user.id,
        ...config,
        updated_at: new Date()
      });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Bot settings saved" });
  } catch (error) {
    console.error('Save bot config error:', error);
    res.status(500).json({ error: 'Failed to save bot configuration' });
  }
};

export { saveBotConfig };