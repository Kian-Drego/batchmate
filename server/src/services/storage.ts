import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';

export interface UploadTarget {
  storageKey: string;
  /** Direct-to-storage upload URL. Null means upload through the multipart API. */
  uploadUrl: string | null;
  method: 'PUT' | 'POST' | null;
  headers: Record<string, string>;
  /** Stable URL the frontend can persist on the passport document. */
  publicUrl: string;
}

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  presign(key: string, contentType: string): Promise<UploadTarget>;
  remove(key: string): Promise<void>;
  read?(key: string): Promise<Buffer>;
}

export function buildKey(userId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const id = crypto.randomBytes(8).toString('hex');
  return `passports/${userId}/${Date.now()}-${id}-${safe}`;
}

// ---------------------------------------------------------------------------
// Local driver - zero cloud dependency, files served by the API.
// ---------------------------------------------------------------------------
class LocalDriver implements StorageDriver {
  private dir = path.resolve(env.storage.localDir);

  private fullPath(key: string) {
    // Prevent path traversal outside the upload directory.
    const target = path.resolve(this.dir, key);
    if (!target.startsWith(this.dir)) throw new Error('Invalid storage key');
    return target;
  }

  async put(key: string, body: Buffer): Promise<string> {
    const target = this.fullPath(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
    return `/api/files/${encodeURIComponent(key)}`;
  }

  async presign(key: string): Promise<UploadTarget> {
    // Local uploads go through the multipart endpoint; no direct target.
    return {
      storageKey: key,
      uploadUrl: null,
      method: null,
      headers: {},
      publicUrl: `/api/files/${encodeURIComponent(key)}`,
    };
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(this.fullPath(key));
    } catch {
      /* already gone */
    }
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.fullPath(key));
  }
}

// ---------------------------------------------------------------------------
// S3 driver - presigned PUT URLs via AWS SDK v3.
// ---------------------------------------------------------------------------
class S3Driver implements StorageDriver {
  private client?: import('@aws-sdk/client-s3').S3Client;

  private async getClient() {
    if (!this.client) {
      const { S3Client } = await import('@aws-sdk/client-s3');
      this.client = new S3Client({
        region: env.storage.awsRegion,
        credentials: {
          accessKeyId: env.storage.awsAccessKeyId,
          secretAccessKey: env.storage.awsSecretAccessKey,
        },
      });
    }
    return this.client;
  }

  private url(key: string) {
    return `https://${env.storage.awsBucket}.s3.${env.storage.awsRegion}.amazonaws.com/${key}`;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.getClient();
    await client.send(
      new PutObjectCommand({ Bucket: env.storage.awsBucket, Key: key, Body: body, ContentType: contentType })
    );
    return this.url(key);
  }

  async presign(key: string, contentType: string): Promise<UploadTarget> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const client = await this.getClient();
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: env.storage.awsBucket, Key: key, ContentType: contentType }),
      { expiresIn: 900 }
    );
    return {
      storageKey: key,
      uploadUrl,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      publicUrl: this.url(key),
    };
  }

  async remove(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.getClient();
    await client.send(new DeleteObjectCommand({ Bucket: env.storage.awsBucket, Key: key }));
  }
}

// ---------------------------------------------------------------------------
// Supabase driver - signed upload URLs via the Storage REST API.
// ---------------------------------------------------------------------------
class SupabaseDriver implements StorageDriver {
  private base() {
    return env.storage.supabaseUrl.replace(/\/$/, '');
  }
  private bucket() {
    return env.storage.supabaseBucket;
  }
  private headers() {
    return {
      Authorization: `Bearer ${env.storage.supabaseServiceKey}`,
      apikey: env.storage.supabaseServiceKey,
    };
  }
  private url(key: string) {
    return `${this.base()}/storage/v1/object/public/${this.bucket()}/${key}`;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    const res = await fetch(`${this.base()}/storage/v1/object/${this.bucket()}/${key}`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': contentType, 'x-upsert': 'true' },
      body,
    });
    if (!res.ok) throw new Error(`Supabase upload failed: ${res.status} ${await res.text()}`);
    return this.url(key);
  }

  async presign(key: string): Promise<UploadTarget> {
    const res = await fetch(
      `${this.base()}/storage/v1/object/upload/sign/${this.bucket()}/${key}`,
      { method: 'POST', headers: { ...this.headers(), 'Content-Type': 'application/json' }, body: '{}' }
    );
    if (!res.ok) throw new Error(`Supabase presign failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { url?: string };
    const uploadUrl = data.url ? `${this.base()}/storage/v1${data.url}` : null;
    return {
      storageKey: key,
      uploadUrl,
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream', 'x-upsert': 'true' },
      publicUrl: this.url(key),
    };
  }

  async remove(key: string): Promise<void> {
    await fetch(`${this.base()}/storage/v1/object/${this.bucket()}/${key}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
  }
}

function resolveDriver(): StorageDriver {
  switch (env.storage.driver) {
    case 's3':
      return new S3Driver();
    case 'supabase':
      return new SupabaseDriver();
    case 'local':
    default:
      return new LocalDriver();
  }
}

export const storage: StorageDriver = resolveDriver();
export const storageDriverName = env.storage.driver;
