# Overnight notes: payment-tracker (`fix/settle-toggle-error`)

Part of the improvement run (with Liftbook and Muhurta). This branch is from `main` and never
committed to `main` itself. No `.env` here, so nothing touches live data.

### Branch `fix/settle-toggle-error` (26 Nov)

- **Marking a payment Settled (or back to Pending) shows the error if it doesn't save.** The
  desktop Payments list dropped the error and reloaded, so the row just stayed as it was, with no
  word why. It now shows the message, as the delete beside it already did. This is the only
  Settled/Pending switch in the app. `npm run build` passes; `npm run lint` gives the same 28
  problems as `main`, none new. Not run against a database: no `.env`, by design.

## Waiting list

- Nothing blocked.
