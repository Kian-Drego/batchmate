/**
 * Privacy guard for Edge Function request bodies.
 *
 * Government/national identifiers must NEVER be requested or persisted. Any
 * body containing a key that looks like one is rejected outright (not silently
 * dropped) so the policy is auditable. Direct table writes are already guarded
 * by the schema: PostgREST rejects columns that do not exist.
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

export class SensitiveFieldError extends Error {
  override name = 'SensitiveFieldError';
}

export function assertNoSensitiveFields(input: unknown, path = 'body'): void {
  if (input === null || typeof input !== 'object') return;
  if (Array.isArray(input)) {
    input.forEach((v, i) => assertNoSensitiveFields(v, `${path}[${i}]`));
    return;
  }
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (FORBIDDEN_KEY_PATTERNS.some((re) => re.test(key))) {
      throw new SensitiveFieldError(
        `Field "${path}.${key}" is not permitted: national/government identifiers are never stored.`
      );
    }
    assertNoSensitiveFields(value, `${path}.${key}`);
  }
}
