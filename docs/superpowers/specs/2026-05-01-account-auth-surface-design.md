# Account Auth Surface Design

## Goal

Move email/password authentication out of the Account status panel into a focused auth surface, while improving signup validation and copy.

## Decisions

- Account remains the entry point from the workbench chrome.
- Signed-out Account shows storage/cache status plus clear `Sign in` and `Sign up` actions.
- Selecting either action opens a dedicated auth surface:
  - Desktop: centered dialog.
  - Mobile: bottom sheet behavior through the existing responsive dialog classes.
- Sign-in mode shows email and password only.
- Signup mode shows email, password, and confirm password.
- Password confirmation appears only in signup mode.
- Signup success clears password fields but keeps email available for sign-in.
- Failed validation keeps field values so users can correct one field.

## Error Copy

- Do not show raw Supabase password-policy text.
- Local password validation says: `Password needs lowercase, uppercase, number, and symbol.`
- Password mismatch says: `Passwords do not match.`
- Duplicate signup must not reveal whether an email exists. Supabase returns an obfuscated success for existing confirmed users when email confirmation is enabled. Use neutral copy: `If this email can create an account, we sent a confirmation link. Already signed up? Sign in or check your inbox.`

## Supabase Behavior

The app keeps using browser-side Supabase auth APIs:

- `signInWithPassword`
- `signUp`
- `signInWithOAuth`

No client-side user-existence lookup is added because that would create email enumeration risk. The neutral signup success message handles both first signup and protected duplicate signup.

## Files

- `frontend/src/components/auth/sign-in-panel.tsx`: split the form into sign-in and signup modes with validation and better copy.
- `frontend/src/components/auth/sign-in-panel.test.tsx`: cover mode-specific fields, validation, values retained on failure, and signup success clearing password fields.
- `frontend/src/components/viewer/workbench/account-dialog.tsx`: replace inline auth form with Account actions and nested auth surface state.
- `frontend/src/components/viewer/feed-workbench-auth.test.tsx`: cover Account opening auth actions from signed-out state.

## Testing

- Run focused Vitest tests for auth components.
- Run typecheck and lint.
- Use browser verification on mobile and desktop viewport for Account -> Sign up -> confirm password visibility and Sign in -> no confirm password.
