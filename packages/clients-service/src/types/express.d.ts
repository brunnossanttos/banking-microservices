import { JwtPayload } from '@banking/shared';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
