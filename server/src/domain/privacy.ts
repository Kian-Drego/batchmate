import { ApiError } from '../middleware/error';

/**
 * Privacy guard.
 *
 * Government/national identifiers must NEVER be requested or persisted. Any
 * request body containing a key that looks like a national identifier is
 * rejected outright rather than silently dropped, so the policy is auditable.
 */
const FORBIDDEN_KEY_PATTERNS = [
  /aadhaar/i,
  /aadhar/i,
  /national.?id/i,
  /govt.?id/i,
  /government.?id/i,
  /\brrn\b/i,
  /resident.?registration/i,
  /\bmy.?number\b/i,
  /\bssn\b/i,
  /social.?security/i,
  /\bpan\b/i,
  /permanent.?account/i,
  /\bpassport.?(no|number)/i,
  /voter.?(id|number)/i,
  /driving.?(licence|license)/i,
  /\bnid\b/i,
  /citizen.?(id|number)/i,
];

export function assertNoSensitiveFields(input: unknown, path = 'body'): void {
  if (input === null || typeof input !== 'object') return;
  if (Array.isArray(input)) {
    input.forEach((v, i) => assertNoSensitiveFields(v, `${path}[${i}]`));
    return;
  }
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (FORBIDDEN_KEY_PATTERNS.some((re) => re.test(key))) {
      throw new ApiError(
        400,
        `Field "${path}.${key}" is not permitted: national/government identifiers are never stored.`
      );
    }
    assertNoSensitiveFields(value, `${path}.${key}`);
  }
}
