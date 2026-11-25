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
