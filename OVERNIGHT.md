# Overnight notes: payment-tracker (`fix/friend-delete-confirm`)

Part of the improvement run (with Liftbook and Muhurta). This branch is from `main` and never
committed to `main` itself. No `.env` here, so nothing touches live data.

### Branch `fix/friend-delete-confirm` (26 Nov)

- **The desktop Friends list asks before removing a friend.** Its Delete button removed the friend
  in one tap. The phone screen already asks "Remove <name>?". The desktop now asks the same and
  shows the error if the delete fails, where it used to fail silently. `npm run build` passes. `npm run lint`
  gives the same 28 problems as `main`, none new.

## Waiting list

- Nothing blocked.
