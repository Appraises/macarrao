/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  readonly VITE_PLAUSIBLE_ENDPOINT?: string;
  readonly VITE_PLAUSIBLE_CAPTURE_LOCALHOST?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_LEGAL_CONTROLLER_NAME?: string;
  readonly VITE_LEGAL_CONTACT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
