# Overnight log: fix/delete-errors (from origin/main)

- Removing a friend (Friends) and removing a member from a group (Groups) ignored the database's answer: if the delete failed, the page reloaded as if it had worked and the friend or member was still there with no word why. Both now show the error and stay put. Lint 28 (same as main), build OK. Not run against a database (no .env, by design).

## Waiting list
- Nothing waiting.
