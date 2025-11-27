import type { Request, Response } from "express";
import { supabase } from "../../frontend/app/utils/supabaseClient.js";
import type { AuthenticatedRequest } from "../AuthenticatedRequest.js";


export const saveBotConfig = async (req: Request, res: Response) => {
  const user = (req as unknown as AuthenticatedRequest).user;
  const config = req.body;

  const { error } = await supabase
    .from("bot_configs")
    .upsert({
      user_id: user.id,
      ...config,
    });

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Bot settings saved" });
};