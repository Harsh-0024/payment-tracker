# Overnight notes: payment-tracker (`fix/friend-delete-confirm`)

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

## Waiting list

- Nothing blocked.
