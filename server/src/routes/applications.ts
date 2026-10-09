import { Router, Response } from 'express';
import { z } from 'zod';
import { Application } from '../models/Application';
import { Scholarship } from '../models/Scholarship';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';
import { validateBody } from '../middleware/validate';
import { APPLICATION_STATUSES, DocumentType } from '../domain/constants';
import { getOrCreatePassport } from '../services/passport';
import { applyRetentionPolicy } from '../services/retention';
import {
  recordApplicationStarted,
  recordApplicationStatus,
} from '../services/analytics';

const router = Router();
router.use(requireAuth);

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'Not Started': ['In Progress'],
  'In Progress': ['Submitted', 'Not Started'],
  Submitted: ['Verification Pending', 'Rejected'],
  'Verification Pending': ['Awarded', 'Rejected'],
  Awarded: [],
  Rejected: [],
};

const statusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
  note: z.string().max(500).optional(),
});

/** GET /api/applications - the user's tracked applications. */
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const applications = await Application.find({ user: req.user!._id })
      .populate('scholarship')
      .sort({ updatedAt: -1 });
    res.json({ applications });
  })
);

/** GET /api/applications/:id */
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const application = await Application.findOne({
      _id: req.params.id,
      user: req.user!._id,
    }).populate('scholarship');
    if (!application) throw new ApiError(404, 'Application not found');
    res.json({ application });
  })
);

/** POST /api/applications - begin tracking a scholarship application. */
router.post(
  '/',
  validateBody(z.object({ scholarshipId: z.string().min(1) })),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { scholarshipId } = req.body as { scholarshipId: string };
    const scholarship = await Scholarship.findById(scholarshipId);
    if (!scholarship) throw new ApiError(404, 'Scholarship not found');

    const existing = await Application.findOne({
      user: req.user!._id,
      scholarship: scholarship._id,
    });
    if (existing) {
      await existing.populate('scholarship');
      res.json({ application: existing, created: false });
      return;
    }

    const passengerPassport = await getOrCreatePassport(req.user!._id);
    const ownedDocs = new Set(passengerPassport.documents.map((d) => d.type));

    const checklist = [
      { label: 'Review eligibility criteria', done: false },
      ...(scholarship.requiredDocuments as DocumentType[]).map((docType) => ({
        label: `Upload ${docType}`,
        done: ownedDocs.has(docType),
        documentType: docType,
      })),
      ...scholarship.applicationSteps.map((step) => ({ label: step, done: false })),
    ];

    const application = await Application.create({
      user: req.user!._id,
      scholarship: scholarship._id,
      mode: scholarship.applicationMode,
      status: 'Not Started',
      checklist,
      history: [{ status: 'Not Started', note: 'Application tracking started', at: new Date() }],
    });

    await application.populate('scholarship');
    await recordApplicationStarted(passengerPassport);
    await applyRetentionPolicy(req.user!._id);

    res.status(201).json({ application, created: true });
  })
);

/** PATCH /api/applications/:id/checklist/:itemId - tick/untick a step. */
router.patch(
  '/:id/checklist/:itemId',
  validateBody(z.object({ done: z.boolean() })),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const application = await Application.findOne({ _id: req.params.id, user: req.user!._id });
    if (!application) throw new ApiError(404, 'Application not found');
    const item = application.checklist.id(req.params.itemId);
    if (!item) throw new ApiError(404, 'Checklist item not found');
    item.done = (req.body as { done: boolean }).done;
    if (application.status === 'Not Started' && item.done) {
      application.status = 'In Progress';
      application.history.push({ status: 'In Progress', at: new Date(), note: 'Checklist started' });
    }
    await application.save();
    await application.populate('scholarship');
    res.json({ application });
  })
);

/** PATCH /api/applications/:id/status - advance the tracking pipeline. */
router.patch(
  '/:id/status',
  validateBody(statusSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, note } = req.body as z.infer<typeof statusSchema>;
    const application = await Application.findOne({ _id: req.params.id, user: req.user!._id });
    if (!application) throw new ApiError(404, 'Application not found');

    const allowed = ALLOWED_TRANSITIONS[application.status] ?? [];
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Cannot move from "${application.status}" to "${status}"`);
    }

    application.status = status;
    application.history.push({ status, note, at: new Date() });
    if (status === 'Submitted') application.submittedAt = new Date();
    if (status === 'Awarded' || status === 'Rejected') application.completedAt = new Date();
    await application.save();

    const passport = await getOrCreatePassport(req.user!._id);
    await recordApplicationStatus(passport, status, ((await Scholarship.findById(application.scholarship))?.type) as never);
    // Re-evaluate retention whenever an application reaches a terminal state.
    await applyRetentionPolicy(req.user!._id);

    await application.populate('scholarship');
    res.json({ application });
  })
);

/** POST /api/applications/:id/submit - native submission with readiness checks. */
router.post(
  '/:id/submit',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const application = await Application.findOne({
      _id: req.params.id,
      user: req.user!._id,
    }).populate('scholarship');
    if (!application) throw new ApiError(404, 'Application not found');

    if (application.mode !== 'native') {
      throw new ApiError(400, 'This scholarship is applied for on the provider portal');
    }

    const passport = await getOrCreatePassport(req.user!._id);
    const ownedDocs = new Set(passport.documents.map((d) => d.type));
    const scholarship = application.scholarship as unknown as { requiredDocuments: DocumentType[] };
    const missingDocs = (scholarship.requiredDocuments ?? []).filter((d) => !ownedDocs.has(d));

    const blocking = [
      passport.academic?.degree ? null : 'Degree',
      passport.demographic?.state ? null : 'State / Domicile',
      passport.demographic?.incomeBracket ? null : 'Family income bracket',
    ].filter(Boolean) as string[];

    if (blocking.length || missingDocs.length) {
      throw new ApiError(422, 'Application is not ready to submit', {
        missingProfileFields: blocking,
        missingDocuments: missingDocs,
      });
    }

    application.status = 'Submitted';
    application.submittedAt = new Date();
    application.history.push({ status: 'Submitted', note: 'Submitted natively', at: new Date() });
    await application.save();

    const s = await Scholarship.findById(application.scholarship);
    await recordApplicationStatus(passport, 'Submitted', s?.type as never);
    await applyRetentionPolicy(req.user!._id);

    res.json({ application });
  })
);

export default router;
