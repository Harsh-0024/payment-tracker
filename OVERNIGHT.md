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

## Waiting list

- **Seeing the app run** (waits on: a way in without live data). Every screen is behind a Supabase
  sign-in; without the project's URL and key the app can only show its sign-in page. A local mock
  (as Liftbook has) would let screens be checked without touching real accounts.
