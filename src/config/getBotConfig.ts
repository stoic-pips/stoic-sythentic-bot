import type { Request, Response } from "express";
import { supabase } from "../../frontend/app/utils/supabaseClient.js";
import type { AuthenticatedRequest } from "../AuthenticatedRequest.js";

export const getBotConfig = async (req: Request, res: Response) => {
  const user = (req as unknown as AuthenticatedRequest).user;

  const { data, error } = await supabase
    .from("bot_configs")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
};
