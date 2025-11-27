// types/express.d.ts
import type { AuthenticatedRequest } from '../path/to/AuthenticatedRequest';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        first_name?: string;
        has_paid?: boolean;
      };
    }
  }
}