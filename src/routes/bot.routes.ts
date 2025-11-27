import { Router, type Request, type Response } from "express";
import { saveBotConfig } from "../controllers/bot.controller.js";
import { getBotConfig } from "../config/getBotConfig.js";
import { startBot } from "../config/startBot.js";
import { stopBot } from "../config/stopBot.js";
import { requireAuth, requirePaidUser } from "../middleware/authMiddleware.js";

type AuthenticatedRequestWithUser = Request & { user?: any };

const router = Router();

router.post("/config", requireAuth, requirePaidUser, saveBotConfig);

router.get("/config", requireAuth, requirePaidUser, getBotConfig);

router.post("/start", requireAuth, requirePaidUser, startBot);

router.post("/stop", requireAuth, requirePaidUser, stopBot);

export default router;