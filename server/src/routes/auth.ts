import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { z } from 'zod';
import { env } from '../config/env';
import { User } from '../models/User';
import { AuthRequest, requireAuth, signToken } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';
import { validateBody } from '../middleware/validate';
import { authLimiter } from '../middleware/common';
import { getOrCreatePassport, recalculatePassport } from '../services/passport';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Google OAuth 2.0 (only wired up when credentials are configured).
// ---------------------------------------------------------------------------
if (env.google.enabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: env.google.callbackUrl,
      },
      async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) return done(new Error('Google account has no email'));
          let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
          if (!user) {
            user = await User.create({
              email,
              name: profile.displayName || email.split('@')[0],
              provider: 'google',
              googleId: profile.id,
              avatarUrl: profile.photos?.[0]?.value,
            });
          } else if (!user.googleId) {
            user.googleId = profile.id;
            user.provider = 'google';
            if (!user.avatarUrl) user.avatarUrl = profile.photos?.[0]?.value;
            await user.save();
          }
          const passportDoc = await getOrCreatePassport(user._id);
          await recalculatePassport(passportDoc);
          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

function publicUser(user: { _id: unknown; name: string; email: string; role: string; avatarUrl?: string; provider: string }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
  };
}

router.get('/providers', (_req, res) => {
  res.json({ google: env.google.enabled, local: true });
});

router.get('/google', (req, res, next) => {
  if (!env.google.enabled) {
    return res.status(503).json({ error: 'Google sign-in is not configured on this server' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(
    req,
    res,
    next
  );
});

router.get(
  '/google/callback',
  (req, res, next) => {
    if (!env.google.enabled) return res.redirect(`${env.clientOrigin}/login?error=google_disabled`);
    passport.authenticate('google', { session: false }, (err: unknown, user: any) => {
      if (err || !user) return res.redirect(`${env.clientOrigin}/login?error=google_failed`);
      const token = signToken(user);
      res.redirect(`${env.clientOrigin}/auth/callback?token=${token}`);
    })(req, res, next);
  }
);

router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body as z.infer<typeof registerSchema>;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new ApiError(409, 'An account with this email already exists');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, provider: 'local' });
    const passportDoc = await getOrCreatePassport(user._id);
    await recalculatePassport(passportDoc);
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user || !user.passwordHash) throw new ApiError(401, 'Invalid email or password');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new ApiError(401, 'Invalid email or password');
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json({ user: publicUser(req.user!) });
  })
);

export default router;
