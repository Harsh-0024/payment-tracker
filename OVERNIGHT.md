# Overnight notes: payment-tracker

The improvement run (with Liftbook and Muhurta), added on 25 Nov 2026. Work happens in the
`payment-tracker-overnight` worktree, one branch per kind of work (design/, fix/, feature/,
improve/), each from `main` and never committed to `main` itself. Every branch is pushed.

No `.env` here, so the app never reaches the live Supabase project; nothing touches live data.

## Starting point (main, 9265340)

- `npm run build` works; one 1.4 MB bundle (a code-split idea for later).
- `npm run lint`: 28 problems (21 errors, 7 warnings): unused variables, a needless escape,
  setState inside effects, missing hook dependencies, and ThemeToggle exporting non-components.

### Branch `improve/lint-cleanup` (from `main`)

- **Lint: 28 problems down to 16, behaviour unchanged.** Unused catch variables dropped (`catch {}`),
  the needless `\-` in the two UPI-ID patterns removed, ProfilePage's unused copy of `resizeImage`
  deleted (it already imports the one in imageTools.js), and imageTools' "Could not read" error now
  carries the original error as its `cause`. The "Who paid for whom" lists were a component made
  inside render, so React remounted both on every render; it is now a plain function call with the
  same output. `npm run build` passes.
- Left for a separate, careful pass (they change when things run, so each needs testing in the
  app): setState called straight in effects (App, GlobalSearch, GroupsPage, PayPage), missing
  effect dependencies, and DesktopHome/ThemeToggle exporting helpers next to components (only
  affects hot reload while developing).
- **Lint: 16 down to 11. Each component file now exports only components, so hot reload works.**
  The money, cover and avatar helpers (`R`, `kindFor`, `hue`, `ini`) moved from DesktopHome.jsx to
  `src/people.js`. The theme logic (`setTheme`, `useTheme` and the saved-theme start-up) moved from
  ThemeToggle.jsx to `src/theme.js`, which main.jsx now imports. Same code, only moved; build passes.
- The 11 left are all "load data when the page opens" effects (App, GlobalSearch, GroupsPage,
  PayPage, FriendScan). Fixing them the obvious way (adding `load` as a dependency) would fetch
  again on every render. They need the screens running to test, so they wait on the mock (Waiting list).

### Branch `design/sign-in` (from `origin/main`)

- 32d9cc5: the sign-in card had two identical navy tab bars stacked (Email/OTP, then Login/Register). Login/Register is now a quiet white pill, so the order reads method → mode → one navy Log in button. Checked on the iPhone (light) and desktop (dark); Register still switches the form.
- How to view screens without keys: the `payment-tracker-overnight` launch config runs Vite with dummy `VITE_SUPABASE_URL=http://127.0.0.1:54321` set inline (no .env), so nothing can reach live Supabase. Phone: `http://192.168.29.209:5180/`; the first load takes a few seconds while Vite compiles.

### Branch `improve/sign-in-autofill` (from `origin/main`)

- Autofill hints on every sign-in and password field (email, current-password, new-password, name, tel-national). On the iPhone the Passwords bar now appears on the email field, and Register/reset can suggest a strong password. Build passes; the 7 lint problems in those files are older and not on the changed lines.

### Branch `improve/bundle-split` (from `origin/main`)

- The heavy screens load on first use (React.lazy): pay/scan page (html5-qrcode), friend scan (jsqr), profile, and the spending pie chart (recharts, moved to SpendingChart.jsx); reminder.js imports qrcode only when sharing a UPI QR. Main JS: 1,448 kB (429 kB gzip) → 555 kB (155 kB gzip). Lint count unchanged (28, as on main). Each split module loads in the dev server; the welcome screen renders on the iPhone. Screens behind sign-in were not tapped through (need a Supabase mock: Waiting list).

## Waiting list

- **Seeing the app run** (waits on: a way in without live data). Every screen is behind a Supabase
  sign-in; without the project's URL and key the app can only show its sign-in page. A local mock
  (as Liftbook has) would let screens be checked without touching real accounts.
