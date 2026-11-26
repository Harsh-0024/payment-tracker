# Overnight log: fix/delete-errors (from origin/main)

- Removing a friend (Friends) and removing a member from a group (Groups) ignored the database's answer: if the delete failed, the page reloaded as if it had worked and the friend or member was still there with no word why. Both now show the error and stay put. Lint 28 (same as main), build OK. Not run against a database (no .env, by design).

## Waiting list
- Delete account (src/DeleteAccount.jsx) removes the profile photo and QR image before it calls `delete_my_account`. If that call fails, the account stays but its photo and QR are already gone. Moving the removal after the call is only safe if storage still accepts the signed-out user's token or the SQL function cleans storage itself; that function's SQL is not in the repo, so this waits for a look at the database side.
