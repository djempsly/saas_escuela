import { JwtPayload } from '../utils/jwt.payload';

declare global {
  namespace Express {
    export interface Request {
      user?: JwtPayload;
    }
  }
}
