import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, IUser } from '../models/User';

/**
 * `req.user` is supplied by Passport and globally typed as `Express.User`,
 * which this codebase augments to `IUser` in `src/types/express.d.ts`.
 */
export type AuthRequest = Request;

export interface JwtPayload {
  sub: string;
  role: string;
}

export function signToken(user: IUser): string {
  const payload: JwtPayload = { sub: String(user._id), role: user.role };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

/** Attach the authenticated user from a Bearer token, if present. */
export async function attachUser(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as JwtPayload;
    const user = await User.findById(payload.sub);
    if (user) req.user = user;
  } catch {
    /* invalid token -> treat as anonymous */
  }
  next();
}

/** Reject unauthenticated requests. */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
}
