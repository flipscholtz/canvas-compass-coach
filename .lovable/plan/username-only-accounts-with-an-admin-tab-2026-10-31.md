# Username-only accounts with an Admin tab

## Result
Manage accounts entirely inside CanvasStack: users enter only a username and password, and authorised administrators can add or remove users from an Admin tab. No personal email addresses or backend Users screen are needed.

## Security adjustment
Keep the existing Cloud authentication engine behind the scenes rather than replacing it with browser-stored passwords or a hardcoded admin check. The app will create the internal account addresses itself through a protected server action, avoiding the backend screen's domain restriction. This differs from removing Cloud's user system, but preserves the protections around existing private scenarios and sessions.

The administrator username will be `admin`. Use a new private password during setup because the password supplied in chat is now disclosed; do not embed it in source code or store it as plain text. Administrative permission belongs to a protected server-side role, not a username comparison.

## Changes
1. Provide a secure, owner-authorised setup for the first `admin` account, with no public first-user or first-login admin promotion.
2. Add an Admin tab visible only after verified administrator permission. Every account-management action independently checks that permission on the server.
3. Add username/password account creation with confirmed internal accounts, normalised unique usernames, useful validation and no public signup.
4. Show usernames in the Admin tab and require confirmation before removing an account. Explain that removal deletes that user's private saved scenarios; protect the current administrator from self-removal.
5. Preserve existing account IDs, private scenarios, shared demos, coaching, reports and version history. Ordinary users cannot list accounts or access account-management actions.
6. Update App updates and the account-management instructions.

## Technical details
- Use authenticated TanStack server functions with a protected `user_roles` table and server-side role checks before dynamically loading the privileged client.
- Continue using existing authenticated route and token middleware, account-keyed browser drafts and owner-scoped scenario policies.
- Provision the first administrator only through an owner-authorised setup; if owner identity cannot be verified, stop and request that setup rather than exposing a public bootstrap action.
- Do not disable existing sign-in or delete current accounts during this change.

## Verification
Test username-only creation and sign-in, duplicate username handling, admin-only listing/creation/removal, denial for ordinary and signed-out users, self-removal protection, account isolation and preserved demos. Exercise creation, login, scenario save/load and removal through the app with authorised test accounts; report any blocked verification explicitly.