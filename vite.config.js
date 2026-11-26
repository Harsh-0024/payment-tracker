import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const realClient = fileURLToPath(new URL('./src/supabaseClient.js', import.meta.url))
const mockClient = fileURLToPath(new URL('./src/dev/mockSupabase.js', import.meta.url))

// `npm run dev:mock` (mode "mock"): every import of src/supabaseClient.js gets the in-browser demo
// in src/dev/mockSupabase.js instead, so the app runs with no Supabase project and no .env.
const useMock = (mode) => ({
  name: 'use-mock-supabase',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (mode !== 'mock' || !/supabaseClient(\.js)?$/.test(source)) return null
    const hit = await this.resolve(source, importer, { ...options, skipSelf: true })
    return hit && hit.id === realClient ? mockClient : null
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), useMock(mode)],
  server: mode === 'mock' ? { host: true } : undefined,
}))
