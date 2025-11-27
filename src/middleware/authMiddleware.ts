// middleware/authMiddleware.js
import type { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase.js";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Invalid token" });

  req.user = {
    id: data.user.id,
    email: data.user.email!,
    first_name: data.user.user_metadata?.first_name,
    has_paid: data.user.user_metadata?.has_paid,
  };

  next();
};

export const requirePaidUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (!req.user.has_paid) {
    return res.status(403).json({ error: "Payment required" });
  }

  next();
};

export const requireAuthAndPayment = [
  requireAuth,
  requirePaidUser
];