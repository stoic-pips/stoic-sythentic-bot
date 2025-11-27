import type { Request, Response } from "express";
import { supabase } from "../../frontend/app/utils/supabaseClient.js";
import type { AuthenticatedRequest } from "../AuthenticatedRequest.js";

export const getUserProfile = async (req: Request, res: Response) => {
    const authenticatedReq = req as unknown as AuthenticatedRequest;

  try {
    if (!authenticatedReq.user) return res.status(401).json({ error: "Not authenticated" });

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", authenticatedReq.user.id)
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ user: data });
  } catch (err) {
    console.error("getUserProfile error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updatePlan = async (req: Request, res: Response) => {
    const authenticatedReq = req as unknown as AuthenticatedRequest;
  try {
    if (!authenticatedReq.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { plan, status } = req.body;
    if (!plan || !status) {
      return res.status(400).json({ error: "Plan & status required" });
    }

    const { data, error } = await supabase
        .from("subscriptions")
        .upsert([{ user_id: authenticatedReq.user.id, plan, status }], { onConflict: "user_id" })
        .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ message: "Plan updated successfully", subscription: data });
  } catch (err) {
    console.error("updatePlan error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};