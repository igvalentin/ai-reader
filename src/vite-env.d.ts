/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EXTERNAL_SUPABASE_URL: string
  readonly VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
