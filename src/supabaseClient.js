import { createClient } from "@supabase/supabase-js";
import { createMockClient } from "./devMock";

// `npm run dev:mock` swaps in a pretend Supabase (src/devMock.js) so screens can be checked
// without a project or real accounts. DEV is false in builds, so the mock never ships.
const useMock = import.meta.env.DEV && import.meta.env.VITE_MOCK === "1";

export const supabase = useMock
  ? createMockClient()
  : createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
