# Overnight notes: payment-tracker (branch feature/demo-mock)
# Overnight notes: payment-tracker (branch fix/reminder-net)

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
# Overnight notes: payment-tracker (`fix/friend-delete-confirm`)
# Overnight notes: payment-tracker (`fix/pay-warnings`)
# Overnight notes: payment-tracker (`fix/settle-toggle-error`)

Part of the improvement run (with Liftbook and Muhurta). This branch is from `main` and never
committed to `main` itself. No `.env` here, so nothing touches live data.

### Branch `fix/friend-delete-confirm` (26 Nov)

- **The desktop Friends list asks before removing a friend.** Its Delete button removed the friend
  in one tap. The phone screen already asks "Remove <name>?". The desktop now asks the same and
  shows the error if the delete fails, where it used to fail silently. `npm run build` passes. `npm run lint`
  gives the same 28 problems as `main`, none new.
- **Removing a group member shows the error if it fails.** It used to drop the error and reload
  as if it had worked. No question is asked: a member with expenses can't be removed anyway, and one
  without is quick to add back. Every other delete in the app already checks its error.
### Branch `fix/pay-warnings` (26 Nov)

- **"Payment saved, but the entry could not be added" now shows.** After a UPI payment, the Pay page
  set that message when recording it failed, then cleared it a few lines later with `setError("")`,
  so nobody ever saw it. The message is now kept and shown once at the end.
- **Marking the paid entries Settled checks its error too.** Paying a friend for existing entries
  marks them Settled; if that failed, the entries stayed Pending with no word. It now says
  "Payment saved, but its entries could not be marked settled".
- **Cancelling a payment shows the error if it fails,** instead of reloading as if it had worked.
- `npm run build` passes; `npm run lint` gives the same 28 problems as `main`, none new. Not run
  against a database: no `.env`, by design.

- After a payment, linking its new entry back to it (`entry_ids`) also ignored failure; without the link, the payment's entry isn't treated as waiting for confirmation. It now joins the other warnings shown after saving. Lint 28, build OK.

- PayPage's last unchecked writes now report failures: re-saving an open payment's amount stops with the error instead of opening the UPI app on stale data; a failed UPI-ID save to a friend shows a gentle note; Cancel stays open with the error instead of closing as if it worked. Lint 28 (same as main), build OK.
### Branch `fix/settle-toggle-error` (26 Nov)

- **Marking a payment Settled (or back to Pending) shows the error if it doesn't save.** The
  desktop Payments list dropped the error and reloaded, so the row just stayed as it was, with no
  word why. It now shows the message, as the delete beside it already did. This is the only
  Settled/Pending switch in the app. `npm run build` passes; `npm run lint` gives the same 28
  problems as `main`, none new. Not run against a database: no `.env`, by design.

## Waiting list

- Nothing blocked.
# Overnight log: fix/profile-load (from origin/main)

- Profile: if loading the saved payment details failed, the form showed blank fields (or this phone's own copy of the UPI ID) with no word why. Saving from there would quietly put the QR choice back to "Generate from my UPI ID" (a blank UPI ID can't be saved, so that part was safe). The payment section now says "Couldn't load your saved payment details: ... Reload before saving here." Lint 28 (same as main), build OK. Not run against a database (no .env, by design).

## Waiting list
- Nothing waiting.
## fix/reminder-net (26 Nov 2026)

1. **WhatsApp reminder when the friend has paid more.** If what a friend paid for you covered what
   they owe, the reminder still said "👉 Net amount to pay: ₹0" in a message asking them to pay.
   Now it says "👉 That evens out: nothing to pay." when it's even, and "👉 After that, I owe you
   ₹250.1." when you owe them; a positive net reads as before. Checked by running `buildMessage`
   in Node for all three cases (the app itself can't run here without the borrowed mock file).
   `npm run lint`: 28 (the baseline); `npm run build` works.

## Waiting list

- An equal split in Split.jsx rounds each share alone (₹100 among 3 is ₹33.33 each), so the payer
  absorbs the leftover paisa; GroupsPage shares it out exactly. Fair within a paisa, so left as is.
# Overnight log: fix/search-errors (from origin/main)

- Search (the 🔍 box) loads UPI payments separately from entries and friends. If that load failed, it said nothing: UPI payments were simply missing from the results, which read as "nothing matches". It now shows an amber line under the tabs ("UPI payments couldn't be loaded, so they aren't in these results"), cleared when a later load (each focus on the box) works. Lint 28 (same as main), build OK. Not run against a database (no .env, by design).

## Waiting list
- Nothing waiting.
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

### Branch `improve/dev-mock` (from `origin/main`)

- `npm run dev:mock` starts the app on a pretend Supabase (`src/devMock.js`): demo friends (Aarav,
  Kabir, Meera), five entries, a "Goa trip" group. Any email and password sign in as "Demo".
  Everything stays in that browser tab's memory and starts over on reload or sign-out; nothing is
  sent anywhere, and no `.env` or real project is needed.
- Production is untouched: `supabaseClient.js` picks the mock only when `import.meta.env.DEV` and
  `VITE_MOCK=1`, and the mock runs nothing on import, so the build leaves it out (checked: none of
  its text is in `dist/`).
- Not in the mock yet: friend requests and the other RPCs (they answer "isn't in the mock"),
  uploads, QR downloads, codes by SMS.
- Checked: signed in, the Dashboard shows the demo totals (₹5,749 spent, ₹450 owed, ₹4,199 owed
  to you), groups and recent activity, no console errors. New files lint clean (the 28 problems
  `npm run lint` reports on that branch are in files from main); `npm run build` passes.

### Branch `improve/balance-words` (from `origin/main`)

- Phone Groups list: each friend's balance was only "₹1,200" in green or "₹450" in red, so which
  way the money went was told by colour alone. It now reads "owes you ₹1,200" / "you owe ₹450"
  (still coloured), like the friend page's own "You're owed / You owe". Checked on the iPhone 18
  Pro with the dev mock: all three rows fit on one line. Lint shows nothing new in the file; build passes.

## fix/phone-layout (25 Nov)
- Checked Home, Activity and Profile on the iPhone simulator using the mock (`npm run dev:mock`).
- Activity: the payment date field ran past the card's right edge (iOS Safari gives date inputs a fixed width). Date fields on phones now fill their box, with the date left-aligned and centred like the other fields.
- The chat bubble sat on top of the Profile tab. On phones it now floats just above the tab bar.
- eslint clean on the changed file; build passes; mock not in dist.
- Signing in on a phone opened Home part-scrolled (the login page's scroll, after the keyboard pushed it up), hiding the greeting; switching tabs kept the old scroll too. The page now resets to the top whenever it changes, including the first page after sign-in. Checked on the simulator.
- Add a payment on phones: Amount and Payment date sit in a two-column row that stacks on narrow screens, but kept its 16px gap on top of each label's 20px margin, so that one gap was nearly double the rest. Stacked rows now have no row gap. CSS only; build passes.

## improve/dev-mock: stays signed in across reloads

- The mock remembers "signed in" for the tab (sessionStorage), so a dev-server reload or a branch switch no longer drops you to the welcome screen. The demo data still starts fresh on each load; Log Out forgets it.
- Checked on the iPhone: sign in, reload: still on Home; Log Out: back to the welcome screen. Build has no mock in it.

## Groups tab shows trip groups (feature/groups-tab)

- Decided (you gave me the call): option (b). The phone's Groups tab now starts with a **Trip groups**
  section (members, item count, total), with "+ New group", then a **Friends** section with the
  old rows. Search and the All / Active / Archived pills cover both. Tapping a group opens it in
  place; Back returns to the tab. The tab's name is now accurate, and groups stay under "+" too.
- Settle-up lines read "Aarav pays you" / "You pay Meera" (were "pays You" / "You pays").
- Mock (improve/dev-mock): the Goa trip expense used "me" where the app uses "__me__", so the
  group showed "Settled up" beside "Aarav pays me". Fixed; it now shows "You are owed ₹6,000".
- Checked on the iPhone: list, opening Goa trip, Back, + New group. Build has no mock in it.

## Phone Activity page fixes (fix/phone-activity)

- The "Payment date" and "Pay me back by" fields ran past the card's right edge on an iPhone
  (iOS gives date fields their own minimum width), with the date centred. They now fill the field
  like the others, the date on the left and in the middle vertically. Same for every date field
  in the phone layout (groups, quick split).
- The helper's round chat button sat on top of the Profile tab, so Profile couldn't be tapped
  there. The button and its open panel now sit above the bottom bar.
- Amount and Payment date had a bigger gap between them than any other pair of fields; now even.
- Checked on the iPhone, with the chat open and closed. Lint clean; build has no mock in it.
- Profile: the Dark mode row had a go-to-page arrow and, once on, said "Light mode" beside a moon.
  It now always says "Dark mode" and ends in an on/off switch. The Settings icon looked like a sun;
  it is now a gear. Checked on the iPhone in light and dark.
- Home: Recent Activity dates read "24 Nov" instead of "24/11/2026" (the year shows only for
  another year), like the date fields. Checked on the iPhone.
- Switching pages kept the last page's scroll position, so "+" opened halfway down its form and
  Profile with the avatar scrolled away. Each page now opens at its top. Checked on the iPhone.

## Settle up order (improve/settle-up)

- Home's Settle Up opens the Pay page, which led with "Pay a merchant (scan QR)" (Home has its own
  Scan QR) and put "You owe" last. Now: You owe (with Pay all) first, then Pay someone, then paying a
  shop. Lint problems in PayPage.jsx are the same 6 as on main. Checked on the iPhone with the mock.
- Seen and left: design/sign-in already has the quieter Login/Register switch for the sign-in page.

## Friendly dates (improve/friendly-dates, from origin/main)

- Home's Recent Activity said "You paid · 24/11/2026"; the expense rows in a group said "24 Nov 2026".
  Both lists now say "Today", "Yesterday", "Tomorrow", "22 Nov", or "31 Dec 2025" for another year
  (src/dates.js). A plain "2026-11-24" is read as that local day, not UTC midnight. An expense's own
  page keeps the whole date. Checked on iPhone 18 Pro with the mock; lint unchanged, build passes.
- Also checked a group (Aarav): rows read "You paid • Yesterday", "Aarav paid • 13 Nov"; the
  expense page still reads "24 Nov 2026" and due date "1 Dec 2026".

## Groups list words (improve/empty-states, from origin/main)

- My Groups showed each friend's balance as a bare green or red amount ("₹1,200", "₹450"); which
  way the money goes was left to the colour. Now "owes you ₹1,200" or "you owe ₹450" (still
  coloured), "Settled" as before.
- A filter with nothing in it said "Nothing found." Now: Archived, "No archived groups. A group
  moves here once everything in it is settled."; Active, "Nothing open: every group is settled
  up."; a search, "No group called “x”" (plus "in Active" when a filter is on). Checked on iPhone
  18 Pro with the mock; MobileScreens.jsx lints clean, build passes, no mock in the build.

## Activity page on the phone (fix/activity-layout, from origin/main)

- The "Payment date" and "Pay me back by" fields on Activity > Add a payment ran past the right
  edge of their card on the iPhone: Safari gives a date field its own width and ignores
  `width: 100%`. On the phone layout they now drop the built-in look (so they take the card's
  width) and keep the date centred in the 54 px field. The date picker still opens on a tap.
- The round chat button sat at the bottom right, on top of the Profile tab, which then could not
  be tapped there. On the phone it now sits 100 px up, above the bottom bar; the desktop keeps
  20 px. Checked on iPhone 18 Pro with the mock; ChatBot.jsx lints clean, build passes, no mock
  in the build.
- Activity's search box began with a 🔍 emoji (the only emoji icon on the phone screens) and its
  hint, "Search friend, amount, note, date, UPI ID, status...", was cut off at "UPI ID, st". Now
  the same line search icon as My Groups, and the hint "Search people, amounts, notes…"; the full
  list of what it searches is the field's spoken label. GlobalSearch.jsx lint unchanged (the one
  setState-in-effect error at line 34 was already on main); build passes.

- Lint on this branch: 11 problems left (from 28). The 4 errors are one rule, "setState in an
  effect", on the four "load the data when the page opens" effects (App, GlobalSearch, GroupsPage,
  PayPage). Each load() is also called again after an add or delete, so it can't move into the
  effect, and the app can't be run here to check a rewrite (src/devMock.js is not on this Mac).
  Left as they are on purpose. The 7 warnings are missing effect dependencies; adding them would
  re-run the loads, so those stay too.

## Waiting list

- **Seeing the app run**: now possible with `npm run dev:mock` (branch `improve/dev-mock`); the
  rest of this item is kept for the record. Was waiting on a way in without live data. Every screen is behind a Supabase
  sign-in; without the project's URL and key the app can only show its sign-in page. A local mock
  (as Liftbook has) would let screens be checked without touching real accounts.

## Home balance card (branch `design/home-card`, from origin/main)

- The light wave on the phone's Total Balance card began partway up its left side (`M0 80V58`), so a
  hard vertical line showed under "You owe", 30% of the way across the card. The wave now rises
  from the card's bottom edge in one curve. Lint clean for the file, build passes, no mock values in
  `dist/`; checked on the iPhone 18 Pro simulator.

## Profile card words (branch `improve/balance-words`)

- The phone Profile card said "Total Owed ₹450" over "You get ₹4,199". "Total Owed" doesn't say who
  owes whom, and with Home showing a ₹3,749 balance it read as money owed to you. It now says
  "You owe ₹450", matching "You get" under it. Lint clean for the file (as on main), build passes,
  no mock values in `dist/`; checked on the iPhone 18 Pro simulator.

## Analytics chart (branch `design/analytics-chart`)
- Slices in clearly different hues (Card and UPI were two blues side by side), sorted biggest first.
- Legend shows each amount ("Card ₹2,999"), so a phone user gets figures without tapping.
- Pie has room above and below: the top % label was cut by the buttons and the bottom one ran into the legend.
- Checked on the iPhone 18 Pro simulator; lint unchanged vs main, build ok, no mock values in dist.

## Even line breaks (branch `design/text-wrap`)
- Headings use `text-wrap: balance`; paragraphs, list items, labels and small notes use `text-wrap: pretty`, as in Liftbook and Muhurta.
- No single short word alone on a last line. Home checked on the iPhone simulator (nothing moved); lint unchanged (CSS only), build ok, no mock values in dist.

## Phone overlaps (branch `fix/phone-overlaps`)
- Activity > Add a payment: the Payment date box ran past the card's right edge on iOS. `.row2` columns can now shrink (`min-width: 0`), and date boxes fill their column, with the date vertically centred and at the left like the other fields.
- The round chat button sat on top of the Profile tab. On screens up to 900px it now sits above the bottom bar.
- Checked on the iPhone 18 Pro simulator; ChatBot.jsx lint same as main (0), build ok, no mock values in dist.
- Activity search placeholder cut off at "…UPI ID, st" on a phone: now "Search friend, amount, note or date" (shows whole); UPI ID and status still match, and the field's aria-label lists them. GlobalSearch.jsx lint same as main (1).
- improve/friendly-dates (fd43903): the desktop lists (Payments, Activity, Dashboard, Pay, group expenses) now say "Yesterday", "22 Nov" like the phone ones, in place of "24/11/2026"; due dates read "Due yesterday" / "Due 1 Dec". Checked in the browser at desktop width; lint counts unchanged per file; build clean, no mock values in dist.
- design/profile-icons (e65c20a): Profile's Settings icon was a spoked circle that read as a sun (right above Dark mode); now a toothed gear (also on the top-right button). The card said "Total Owed ₹450 / You get ₹4,199"; now "You owe ₹450", matching the line under it. Checked on the iPhone; lint 0 → 0; build clean, no mock values in dist.
- design/profile-icons (3c300f8): Profile's Dark mode row had a chevron like the rows that open pages, and its label flipped to "Light mode". Now it always says "Dark mode" with an on/off switch (role="switch", aria-checked), blue when on. Checked both states on the iPhone; lint 0 → 0; build clean.

## Your avatar on the phone (branch `design/you-avatar`, from origin/main)

- On the phone, My Groups, a group's page and an expense drew you as a "Y" beside each friend,
  while Home and Profile show your own initial ("D" for Demo). They now use your initial too.
  Checked on the iPhone with the local mock. Lint has no new problems in the changed files
  (main's existing ones are fixed on `improve/lint-cleanup`); build passes.

## Search icon (26 Nov, branch improve/phone-polish, from origin/main)

- Activity search: the 🔍 emoji sat beside the box, out of step with the app's line icons, and took
  width from the hint on a phone. It is now a slate line magnifier inside the box (the box also
  gets an "Search" label for screen readers). Checked on the iPhone with the mock; lint unchanged
  from main (21 errors there already), build passes.
- Expenses header (same branch): on a phone "+ Add friend" wrapped onto a line of its own under the
  Groups / Quick split tabs, looking like a stray third tab. Slimmer padding on phones keeps all
  three on one row with Add friend on the right, as on a computer. Checked on the iPhone; SplitHub.jsx
  lints clean, overall lint unchanged (21 errors, as on main), build passes.

## All the run's branches merged into improve/run-base (26 Nov)

- Merged 24 topic branches plus `improve/lint-cleanup`. Kept: design/analytics-chart,
  home-card, profile-icons, sign-in, text-wrap, you-avatar; fix/activity-layout, phone-activity,
  phone-layout, phone-overlaps, delete-errors, friend-delete-confirm, pay-warnings, profile-load,
  reminder-net, search-errors, settle-toggle-error; improve/balance-words, bundle-split,
  empty-states, friendly-dates, settle-up, sign-in-autofill, phone-polish, lint-cleanup.
- Not kept: `improve/dev-mock` (the older mock that changed src/supabaseClient.js and added the
  borrowed src/devMock.js; `feature/demo-mock` replaces it and leaves both files alone).
- Conflicts were mostly the same fix made on two or three branches (chat button above the tab
  bar, iPhone date fields, dark-mode switch, search box); the base's version was kept, plus the
  extras only the other side had (chat panel position, stacked-field gap, margin on the date).
  Also: the newer pie chart (distinct hues, biggest first, amounts in the legend) now lives in
  the split-out src/SpendingChart.jsx; "You owe" moved to the top of Pay with friendly dates;
  removing a friend asks first and gives the clearer error; imports follow lint-cleanup's
  people.js / theme.js.
- Checks: lint 11 (down from the 28 baseline), build OK, `git diff --check` clean, no conflict
  markers. On the iPhone 18 Pro simulator (http://127.0.0.1:5182/, demo mock): Home shows
  "Yesterday" / "24 Nov", Profile has the gear and the dark-mode switch, Groups shows Goa trip
  above the friends.

## Next up (seen while checking)

- (Done on fix/money-rounding.) Money read ₹1,901 / ₹1,900.5 / ₹251 on different screens.
- (Done on fix/money-rounding.) Goa trip's avatars showed "Y" for you.

## fix/money-rounding (26 Nov)

- One money rule for every screen, in src/people.js (`rupee`, also exported as `R`): whole rupees
  stay whole ("₹1,200"); amounts with paise show two digits ("₹250.50"). Before, the phone
  Groups and Profile screens rounded to whole rupees (₹1,901, ₹251) while Home showed ₹1,900.5.
  The nine files that each had their own `rupee` now import the shared one.
- Trip group avatars draw you with your initial ("D"), like the friend rows, not "Y".
- Checked on the iPhone: Home ₹1,780.50 / You get ₹1,900.50, Groups Kabir ₹250.50, Goa trip "D".
  Lint 11, build OK, `git diff --check` clean.

## design/heading-font (26 Nov)

- Card titles inside the app ("Add a payment" on Activity, and other h1-h4 in cards) switched to
  Playfair Display mid-page, from the older global rule in index.css; every page title and the
  rest of the redesign use the rounded sans. Headings inside `.mb-app` (phone) and `.dk-app`
  (desktop) now inherit the app's font. The sign-in pages and anything outside the two shells
  keep the old rule.
- Checked on the iPhone 18 Pro simulator (demo mock, http://127.0.0.1:5182/, Activity). Lint 11,
  build OK, `git diff --check` clean.

## Next up

- (Done on design/search-box.) Activity's search had two frames around one field.

## design/search-box (26 Nov)

- Activity's search was a bordered pill inside a white card, with the magnifier outside the pill.
  Now the card is the field's one frame: the input has no border or fill of its own (overriding
  `.sp-content input`, which forces both with !important) and a slightly larger 15px text.
  Results still open inside the same card.
- Checked on the iPhone 18 Pro simulator (field look) and in the browser (typed "Aarav": friend,
  entries and filter chips show in the card). Lint 11, build OK, `git diff --check` clean.

## improve/bell-popup (26 Nov)
- The bell's popup was a bare white box: no title, and nothing said the rows could be tapped.
  It now has a "Notifications" heading (the existing .hd style) and each "You owe" row ends with
  "· Tap to settle". Tapping still opens Settlements, checked on the iPhone simulator.
- Lint 11 problems (unchanged), build ok, no .env.

## design/groups-search (26 Nov)
- Groups' "Search groups..." box was filled with the page's own tint, so on the phone it all but
  vanished above the white cards. It is now a white card with a hairline and soft shadow, like the
  rows below it, and gets a blue ring while you type.
- Checked on the iPhone simulator (light). Lint 11 (unchanged), build ok, no .env.

## improve/profile-balance (26 Nov)
- The Profile tab's blue card led with "You owe ₹120" in large type, with "You get ₹1,900.50"
  small below, while Home's card shows the net. The same summary now reads the same on both:
  "Total Balance ₹1,780.50" and "You get ₹1,900.50 · You owe ₹120" (a minus sign when you owe
  more than you get). It still opens Settlements.
- Checked on the iPhone simulator. Lint 11 (unchanged), build ok, no .env.

## fix/history-dots
- Payment history rows with no payment mode read "Yesterday · · Auto to office". The meta line now joins only the parts that exist ("Yesterday · Auto to office"). Checked on the iPhone (Activity tab); PayPage's history always has a status, so it can't double up. Lint 11, build passes.

## design/group-avatars-more
- Groups tab: a trip group of 4 showed three faces next to "4 people". The stack now ends in a "+N" bubble when more people than fit (Goa trip: D, A, +2), with light and dark colours. Checked on the iPhone; lint 11, build passes.

## fix/ios-input-zoom
- Tapping the Activity search box on the iPhone zoomed the whole page in (its text was 15px; iOS Safari zooms into any field under 16px), cutting off the title and leaving the page zoomed.
- src/index.css: on touch screens (pointer: coarse) every text field, select and textarea is at least 16px (!important, since many fields size themselves inline). Desktop sizes are unchanged.
- Checked on the iPhone: focusing and typing in search keeps the page at normal size. Lint 11 problems (unchanged), build OK.

## design/search-avatars
- Search results listed friends with a grey 👤 emoji, while Home, Groups and the trip lists show each friend as a coloured initial. GlobalSearch now uses the same hue()/ini() avatar (34px circle), with the name and UPI ID beside it.
- Lint 11 problems (unchanged), build OK. Checked on the iPhone (Activity → search "a": Aarav, Kabir, Meera in purple, pink, blue).

## fix/chart-missing-mode
- Profile → Analytics, "By payment mode": entries with no mode (added from groups or the quick add; all the demo's) were filed under the key "undefined", so the legend read "undefined ₹2,400.50" beside a one-slice 100% pie.
- src/SpendingChart.jsx: mode-less entries now count as "Mode not set". When none has a mode, the card says so and how to fill it ("Paid via" when adding or editing) instead of drawing the 100% pie. "By friend" is unchanged.
- Lint 11 problems (unchanged), build OK. Checked on the iPhone (both tabs).

## design/dot-separators
- Groups (trip and friend rows), a friend's page and its expense rows, the desktop Home list and the Dashboard's spending rows split details with a heavy bullet "•", while Activity, search, Home and the history use a middle dot "·". All six now use "·". The chat bot's "•" stays: there it marks list items.
- Lint 11 problems (unchanged), build OK. Checked on the iPhone (Groups).

## fix/group-expense-count (27 Nov)
- Groups list: trip groups said "2 items" while friends said "2 expenses". Settlements live in the same table, so "items" counted them, and the phone's group total added settlement money to what was spent.
- Phone and desktop now count only expenses and say "expenses"; the phone total leaves settlements out (the query now also fetches `kind`).
- Checked on the iPhone (Goa trip: 4 people · 2 expenses · ₹10,600). The demo data has no group settlement, so the leave-out path is checked by reading only. Lint 11 problems (baseline 28), build passes.

## improve/pay-all-only-for-several (27 Nov)
- Settlements → You owe: a friend with one unpaid expense showed "Pay all ₹120" beside the row's own "Pay" for the same ₹120.
- "Pay all" now shows only when there are two or more payments to that friend.
- Checked on the iPhone (Aarav, one ₹120 row). Lint 11 problems (baseline 28), build passes.

## design/card-last-row-line (27 Nov)
- Settlements (and any card of rows): rows draw a bottom divider with rounded corners, so the last row left a curved line hanging just above the card's own edge.
- The last row in a card no longer draws a divider; the rows between still do.
- Checked on the iPhone (Aarav's card on Settlements). Lint 11 problems (baseline 28), build passes.

## improve/settle-shows-net (27 Nov)
- Groups said "Aarav · owes you ₹330" (the net), while Settlements → You owe listed only "₹120 to Aarav", with no sign that Aarav owes you ₹450 for dinner. Paying the ₹120 from there hid that Aarav was the one behind.
- A friend's card on Settlements now adds a line when they also owe you: "Aarav also owes you ₹450, so overall they owe you ₹330." (or "you owe ₹N" / "you're even"). The per-expense Pay buttons are unchanged.
- Checked on the iPhone (matches Groups' ₹330). Lint 11 problems (baseline 28), build passes.

## design/pill-rows-one-line (27 Nov)
- Activity on the phone: "Paid via" (Card, UPI, Cash, Other) and the Payment history filters (All … Other) each left "Other" alone on a second line.
- Under 480px wide, choice pills are slimmer (14px sides), so Paid via fits one line; the history filters are slimmer and sit in one row that scrolls sideways if a larger font needs it, with room kept for the active pill's shadow.
- Checked on the iPhone (both rows on one line). Lint 11 problems (baseline 28), build passes.

## improve/payment-form-folds (27 Nov)

- Activity → Payments opened on the whole "Add a payment" form, pushing the payment history a full
  screen down. With a history to read, the form now waits behind one "＋ Add a payment" button, and
  the history shows at once. The form opens with a Cancel button and folds away again after a
  payment is added (the "Payment added" card still shows). With no payments yet it starts open.
- Checked on the iPhone: button, form, Cancel.
- Checks: diff --check, marker grep, lint 11 problems (baseline 28), build OK.

## improve/remove-friend-warns (27 Nov)

- A friend's page → ••• → Remove friend asked only "Remove Aarav?", even with ₹330 still open
  between you. It now says so first: "Aarav still owes you ₹330. Remove Aarav anyway?" (or "You
  still owe … ₹N"); with nothing open it asks just "Remove Aarav?" as before.
- Checked on the iPhone: the prompt showed the balance; Cancel left Aarav in place.
- Not changed: the desktop Friends list's remove (App.jsx) still asks the short question.
- Checks: diff --check, marker grep, lint 11 problems (baseline 28), build OK.

## improve/chart-opens-useful (27 Nov)

- Profile → Analytics → Payment breakdown opened on "By payment mode", which with no modes set is
  only a note ("… "By friend" works already."). It now opens on "By friend" until some payment
  has a mode, and a tab you pick stays picked. The note no longer points at the other tab, and
  reads "Your payments don't say how they were paid yet. …".
- Checked on the iPhone: opens on By friend with the pie (Meera 62%, Aarav 24%, Kabir 14%);
  tapping By payment mode shows the new note.
- Checks: diff --check, marker grep, lint 11 problems (baseline 28), build OK.

## fix/notify-only-net-owed (27 Nov)

- The bell (and Profile → Notifications) said "You owe Aarav ₹120 · Tap to settle", though Aarav
  owes you ₹330 overall (₹450 dinner less his ₹120 auto). It listed every payment a friend made,
  one by one. It now lists one line per friend you owe overall, with that balance: a single
  payment of theirs keeps its note ("Chai"); otherwise it says "Overall balance". Settled ones are
  left out, as before; still at most three.
- With the demo data nobody is owed by you overall: the bell has no dot and says "You are all
  caught up." Checked on the iPhone. The other cases (owing one friend ₹80 for Chai, owing another
  ₹300 net, a friend in your favour left out, a settled payment ignored) checked with the same
  logic in Node.
- Checks: diff --check, marker grep, lint 11 problems (baseline 28), build OK.
