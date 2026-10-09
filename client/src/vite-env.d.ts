/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute URL of the API origin used for production builds (no trailing
   * slash), e.g. https://batchmate-api.onrender.com. Leave unset to call the
   * API on the same origin (dev proxy / single-host deployments).
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
