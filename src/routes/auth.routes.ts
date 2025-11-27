import { Router } from "express";
import { getSession, loginUser, signupUser } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", loginUser);
router.post("/signup", signupUser);
router.get("/session", getSession);

export default router;
