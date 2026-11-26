# Overnight notes: payment-tracker (branch fix/reminder-net)

Part of the improvement run with Liftbook and Muhurta. This branch is from `main`, never committed
to `main` itself, and pushed. No `.env` here, so nothing reaches the live Supabase project.

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
