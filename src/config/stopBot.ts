import type { Request, Response } from "express";
import { activeBots } from "./activeBots.js";
import type { AuthenticatedRequest } from "../AuthenticatedRequest.js";

export const stopBot = async (req: Request, res: Response) => {
  const user = (req as unknown as AuthenticatedRequest).user;

  const ws = activeBots[user.id];

  if (!ws) return res.json({ message: "No bot is running" });

  ws.close();
  delete activeBots[user.id];

  res.json({ message: "Bot stopped" });
};