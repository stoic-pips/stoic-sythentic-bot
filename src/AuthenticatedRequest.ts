import type { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    first_name?: string;
    has_paid?: boolean;
  };
}