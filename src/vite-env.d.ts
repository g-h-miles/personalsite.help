/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Written by `npx convex dev`. */
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
