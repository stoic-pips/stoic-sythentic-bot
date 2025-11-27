import type { Request, Response } from "express";
import { activeBots } from "./activeBots.js";
import { createDerivConnection } from "./deriv.js";
import type { AuthenticatedRequest } from "../AuthenticatedRequest.js";

interface StartBotRequestBody {
  api_token: string;
  market: string;
  trade_type: string;
  stake: number;
}

export const startBot = async (req: Request, res: Response) => {
  const user = (req as unknown as AuthenticatedRequest).user;

  const { api_token, market, trade_type, stake } = req.body as StartBotRequestBody;

  if (!api_token)
    return res.status(400).json({ error: "API token is required" });

  // Create WebSocket connection
  const ws = createDerivConnection(api_token);

  // Store active bot
  activeBots[user.id] = ws;

  ws.on("open", () => {
    console.log("Bot connected for user:", user.id);
  });

  ws.on("message", async (msg: Buffer) => {
    const data = JSON.parse(msg.toString());

    // Handle authorization success
    if (data.authorize) {
      console.log("Authorized as:", data.authorize.email);

      // Subscribe to market ticks
      ws.send(
        JSON.stringify({
          ticks: market,
          subscribe: 1,
        })
      );
    }

    // Handle price stream
    if (data.tick) {
      const price = data.tick.quote;

      console.log("Tick:", price);

      // TODO → Trading logic will go here
    }
  });

  ws.on("close", () => {
    console.log("Bot disconnected for:", user.id);
  });

  res.json({ message: "Bot started successfully" });
};