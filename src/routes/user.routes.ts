import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getUserProfile, updatePlan } from "../controllers/user.controller.js";

const router = Router();

router.get("/profile", requireAuth, getUserProfile);
router.post("/update-plan", requireAuth, updatePlan);

export default router;
