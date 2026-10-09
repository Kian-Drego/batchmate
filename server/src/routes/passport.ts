import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { ScholarshipPassport } from '../models/ScholarshipPassport';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';
import { validateBody } from '../middleware/validate';
import { assertNoSensitiveFields } from '../domain/privacy';
import {
  CATEGORIES,
  DEGREES,
  DOCUMENT_TYPES,
  GENDERS,
  INCOME_BRACKETS,
  STATES,
} from '../domain/constants';
import { getOrCreatePassport, getMatches, recalculatePassport } from '../services/passport';
import { storage, buildKey } from '../services/storage';
import { applyRetentionPolicy } from '../services/retention';

const router = Router();
router.use(requireAuth);

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  storage: multer.memoryStorage(),
});

const academicSchema = z.object({
  institution: z.string().max(160).optional(),
  course: z.string().max(120).optional(),
  degree: z.enum(DEGREES).optional(),
  currentYear: z.string().max(40).optional(),
  class12Percentage: z.number().min(0).max(100).optional(),
  cgpa: z.number().min(0).max(10).optional(),
  entranceExamName: z.string().max(80).optional(),
  entranceExamScore: z.number().optional(),
});

const demographicSchema = z.object({
  state: z.enum(STATES).optional(),
  category: z.enum(CATEGORIES).optional(),
  incomeBracket: z.enum(INCOME_BRACKETS).optional(),
  gender: z.enum(GENDERS).optional(),
  disabilityStatus: z.boolean().optional(),
});

const updateSchema = z.object({
  fullName: z.string().max(120).optional(),
  phone: z.string().max(20).optional(),
  academic: academicSchema.optional(),
  demographic: demographicSchema.optional(),
});

const presignSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(3).max(120),
});

const registerSchema = presignSchema.extend({
  storageKey: z.string().min(1),
  url: z.string().min(1),
  sizeBytes: z.number().min(0).optional(),
});

/** GET /api/passport - load the passport with completeness metadata. */
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const passport = await getOrCreatePassport(req.user!._id);
    res.json({ passport });
  })
);

/** PUT /api/passport - update metadata and trigger match recalculation. */
router.put(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    assertNoSensitiveFields(req.body);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const passport = await getOrCreatePassport(req.user!._id);
    const { fullName, phone, academic, demographic } = parsed.data;
    if (fullName !== undefined) passport.fullName = fullName;
    if (phone !== undefined) passport.phone = phone;
    if (academic) passport.academic = { ...passport.academic, ...academic };
    if (demographic) passport.demographic = { ...passport.demographic, ...demographic };

    // "Update triggers immediate recalculation" - completeness + fresh matches.
    await recalculatePassport(passport);
    await applyRetentionPolicy(req.user!._id);

    res.json({ passport });
  })
);

/** GET /api/passport/matches - live categorized match results. */
router.get(
  '/matches',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const passport = await getOrCreatePassport(req.user!._id);
    const matches = await getMatches(passport);
    const grouped = {
      highlyEligible: matches.filter((m) => m.tier === 'Highly Eligible'),
      possiblyEligible: matches.filter((m) => m.tier === 'Possibly Eligible'),
      needsInfo: matches.filter((m) => m.tier === 'Needs Additional Information'),
    };
    res.json({ matches, grouped, lastMatchedAt: passport.lastMatchedAt });
  })
);

/** POST /api/passport/documents/presign - signed direct-to-storage upload. */
router.post(
  '/documents/presign',
  validateBody(presignSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fileName, contentType } = req.body as z.infer<typeof presignSchema>;
    const key = buildKey(String(req.user!._id), fileName);
    const target = await storage.presign(key, contentType);
    res.json(target);
  })
);

/** POST /api/passport/documents (multipart) - server-side upload path. */
router.post(
  '/documents',
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const type = String(req.body?.type ?? '');
    if (!(DOCUMENT_TYPES as readonly string[]).includes(type)) {
      throw new ApiError(400, 'A valid document type is required');
    }
    if (!req.file) throw new ApiError(400, 'A file is required');
    const key = buildKey(String(req.user!._id), req.file.originalname);
    const url = await storage.put(key, req.file.buffer, req.file.mimetype);
    const passport = await getOrCreatePassport(req.user!._id);
    passport.documents.push({
      _id: undefined as never,
      type: type as never,
      fileName: req.file.originalname,
      storageKey: key,
      url,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      status: 'pending_review',
      retentionUntilDate: null,
      uploadedAt: new Date(),
    } as never);
    await recalculatePassport(passport);
    await applyRetentionPolicy(req.user!._id);
    res.status(201).json({ passport });
  })
);

/** POST /api/passport/documents/register - finalize a presigned upload. */
router.post(
  '/documents/register',
  validateBody(registerSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as z.infer<typeof registerSchema>;
    const passport = await getOrCreatePassport(req.user!._id);
    passport.documents.push({
      _id: undefined as never,
      type: body.type as never,
      fileName: body.fileName,
      storageKey: body.storageKey,
      url: body.url,
      mimeType: body.contentType,
      sizeBytes: body.sizeBytes ?? 0,
      status: 'pending_review',
      retentionUntilDate: null,
      uploadedAt: new Date(),
    } as never);
    await recalculatePassport(passport);
    await applyRetentionPolicy(req.user!._id);
    res.status(201).json({ passport });
  })
);

/** DELETE /api/passport/documents/:docId */
router.delete(
  '/documents/:docId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const passport = await getOrCreatePassport(req.user!._id);
    const doc = passport.documents.id(req.params.docId);
    if (!doc) throw new ApiError(404, 'Document not found');
    if (doc.retentionUntilDate) {
      throw new ApiError(409, 'Document is locked under a completed application retention window');
    }
    try {
      await storage.remove(doc.storageKey);
    } catch {
      /* ignore storage errors; registry is the source of truth */
    }
    doc.deleteOne();
    await recalculatePassport(passport);
    res.json({ passport });
  })
);

export default router;
