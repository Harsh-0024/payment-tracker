# Overnight log: fix/search-errors (from origin/main)

- Search (the 🔍 box) loads UPI payments separately from entries and friends. If that load failed, it said nothing: UPI payments were simply missing from the results, which read as "nothing matches". It now shows an amber line under the tabs ("UPI payments couldn't be loaded, so they aren't in these results"), cleared when a later load (each focus on the box) works. Lint 28 (same as main), build OK. Not run against a database (no .env, by design).

## Waiting list
- Nothing waiting.
