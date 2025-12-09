const { Router } = require('express');
const { authenticateToken, requirePaidUser } = require('../middleware/auth.middleware');
import { saveBotConfig } from "../controllers/bot/config/saveBotConfig";
import { getBotConfig } from "../controllers/bot/config/getBotConfig";
import { startBot } from "../controllers/bot/startBot";
import { stopBot } from "../controllers/bot/stopBot";
import { getBotStatus } from "../controllers/bot/config/getBotStatus";
import { forceTrade } from "../controllers/bot/trade/forceTrade";

const router = Router();

router.post("/config", authenticateToken, saveBotConfig);
router.get("/config", authenticateToken, getBotConfig);
router.post("/start",authenticateToken, startBot);
router.post("/stop", authenticateToken, stopBot);
router.get("/status", authenticateToken, getBotStatus);
router.post("/force-trade", authenticateToken, forceTrade);

module.exports = router;