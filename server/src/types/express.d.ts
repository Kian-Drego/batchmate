import 'express';
import type { IUser } from '../models/User';

/**
 * Merge the application user type into Passport's `Express.User` so `req.user`
 * is correctly typed everywhere without redeclaring (and conflicting with) the
 * property injected by @types/passport.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  namespace Express {
    interface User extends IUser {}
  }
}

export {};
