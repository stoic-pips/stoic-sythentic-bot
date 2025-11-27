import type { Request, Response } from "express";
import { supabase } from "../../frontend/app/utils/supabaseClient.js";

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email & password required" });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) return res.status(401).json({ error: error?.message || "Login failed" });

  res.json({ user: data.user, session: data.session });
};

export const signupUser = async (req: Request, res: Response) => {
  const { email, password, first_name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email & password required" });

  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { first_name } } });

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json({ user: data.user });
};

export const getSession = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return res.status(401).json({ error: "Invalid token" });

  res.json({ user: data.user });
};
