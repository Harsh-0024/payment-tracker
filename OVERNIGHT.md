# Overnight log: fix/profile-load (from origin/main)

- Profile: if loading the saved payment details failed, the form showed blank fields (or this phone's own copy of the UPI ID) with no word why. Saving from there would quietly put the QR choice back to "Generate from my UPI ID" (a blank UPI ID can't be saved, so that part was safe). The payment section now says "Couldn't load your saved payment details: ... Reload before saving here." Lint 28 (same as main), build OK. Not run against a database (no .env, by design).

## Waiting list
- Nothing waiting.
