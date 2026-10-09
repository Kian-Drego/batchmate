import { Router } from 'express';
import { storage, storageDriverName } from '../services/storage';
import { asyncHandler, ApiError } from '../middleware/error';

const router = Router();

/**
 * GET /api/files/* - serves documents for the local storage driver only.
 * With s3/supabase the URL points directly at the bucket, so this route is
 * never hit.
 */
router.get(
  '/*',
  asyncHandler(async (req, res) => {
    const key = decodeURIComponent((req.params as Record<string, string>)[0] ?? '');
    if (!key) throw new ApiError(400, 'A storage key is required');
    if (storageDriverName !== 'local' || !storage.read) {
      throw new ApiError(404, 'Files are served by the configured object storage provider');
    }
    if (!key.startsWith('passports/')) throw new ApiError(403, 'Invalid storage prefix');

    const buffer = await storage.read(key);
    res.setHeader('Content-Type', contentTypeFor(key));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  })
);

function contentTypeFor(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

export default router;
