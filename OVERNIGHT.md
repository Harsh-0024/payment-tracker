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

- (Done 26 Nov, see below.) Phone Groups tab listed friends as groups and hid "Goa trip".

## Run base branch (26 Nov)

- New branch `improve/run-base`, from main, so the run's topic branches have a parent to merge
  back into (main stays untouched). Merged in: `feature/demo-mock` and `feature/groups-tab`.
- The Waiting item was already fixed on `feature/groups-tab`: the phone Groups tab now shows
  "Trip groups" (Goa trip · 4 people · 2 items · ₹10,600) above "Friends". Checked on the
  iPhone 18 Pro simulator with the demo mock at http://127.0.0.1:5182/.
- Checks: lint 28 (baseline), build OK, `git diff --check` clean, no conflict markers.
# Overnight log: fix/delete-errors (from origin/main)

- Removing a friend (Friends) and removing a member from a group (Groups) ignored the database's answer: if the delete failed, the page reloaded as if it had worked and the friend or member was still there with no word why. Both now show the error and stay put. Lint 28 (same as main), build OK. Not run against a database (no .env, by design).

## Waiting list
- Delete account (src/DeleteAccount.jsx) removes the profile photo and QR image before it calls `delete_my_account`. If that call fails, the account stays but its photo and QR are already gone. Moving the removal after the call is only safe if storage still accepts the signed-out user's token or the SQL function cleans storage itself; that function's SQL is not in the repo, so this waits for a look at the database side.
