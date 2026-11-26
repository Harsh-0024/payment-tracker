# Overnight notes: payment-tracker (branch feature/demo-mock)

Part of the improvement run with Liftbook and Muhurta. This branch is from `main`, never committed
to `main` itself, and pushed. No `.env` here, so nothing reaches the live Supabase project.

## feature/demo-mock (26 Nov 2026)

1. **Our own demo backend, so the app can be tried with no Supabase project.** You asked for our
   own mock rather than borrowed files or asking the developer. `npm run dev:mock` starts Vite in
   "mock" mode, which swaps `src/dev/mockSupabase.js` in for `src/supabaseClient.js` (the real
   client is untouched, and a normal `npm run dev` or `npm run build` never includes the mock).
   - It keeps everything in the browser's localStorage ("pt-mock"): a Demo account
     (demo@example.test, any password), friends Aarav, Meera and Kabir, six entries, a "Goa trip"
     group with two expenses, and one UPI payment.
   - It covers every table, function (rpc), storage bucket and sign-in call the app uses.
   - Reset the demo: `localStorage.removeItem("pt-mock")` in the browser console.
   Checked: home, recent activity and Groups on the iPhone 18 Pro simulator, and the desktop
   home in the browser, with no console errors. `npm run lint`: 28 (the baseline; the new files
   add none). `npm run build` works and has no mock code in it.

## Waiting list

- Phone Groups tab lists each friend as a "group" (Aarav, Kabir, Meera), and the real group
  ("Goa trip", from friend_groups) doesn't appear there. To look at in a later step.
