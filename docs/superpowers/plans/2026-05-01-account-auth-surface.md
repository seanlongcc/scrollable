# Account Auth Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a focused auth surface launched from Account, with signup-only password confirmation and safer validation copy.

**Architecture:** Keep Account responsible for status, storage, and launch actions. Keep `SignInPanel` responsible for Supabase auth calls and form validation, with a mode prop for sign-in vs signup. Avoid user-existence checks; Supabase duplicate signup stays intentionally ambiguous and UI copy reflects that.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Radix dialog wrappers, Supabase SSR/browser client, Vitest Testing Library.

---

### Task 1: Auth Form Behavior

**Files:**

- Modify: `frontend/src/components/auth/sign-in-panel.tsx`
- Modify: `frontend/src/components/auth/sign-in-panel.test.tsx`

- [x] **Step 1: Write failing tests**

Add tests that assert signup mode shows a confirm-password field, sign-in mode does not, mismatched signup passwords do not call Supabase, weak passwords show local copy, and successful signup clears password fields but keeps email.

- [x] **Step 2: Run focused test to verify failure**

Run: `npm --workspace frontend run test -- src/components/auth/sign-in-panel.test.tsx`

Expected: FAIL because `SignInPanel` has no mode prop, no confirm password field, and no local auth validation helpers.

- [x] **Step 3: Implement form modes and validation**

Update `SignInPanel` to accept `mode?: "sign-in" | "sign-up"`, render confirm password only for signup, add local password checks, map Supabase password-policy errors to short copy, and use neutral signup success copy.

- [x] **Step 4: Run focused test to verify pass**

Run: `npm --workspace frontend run test -- src/components/auth/sign-in-panel.test.tsx`

Expected: PASS.

### Task 2: Account Auth Surface

**Files:**

- Modify: `frontend/src/components/viewer/workbench/account-dialog.tsx`
- Modify: `frontend/src/components/viewer/feed-workbench-auth.test.tsx`

- [x] **Step 1: Write failing tests**

Add tests that open Account while signed out, click `Sign up`, and see signup mode with confirm password. Add a second assertion that `Sign in` mode has no confirm password.

- [x] **Step 2: Run focused test to verify failure**

Run: `npm --workspace frontend run test -- src/components/viewer/feed-workbench-auth.test.tsx`

Expected: FAIL because signed-out Account currently renders the auth form inline instead of action buttons and a nested auth surface.

- [x] **Step 3: Implement account launch actions and nested auth dialog**

In `AccountDialog`, replace inline signed-out `SignInPanel` with `Sign in` and `Sign up` buttons. Add local state for auth mode. Render a nested `Dialog` with `SignInPanel mode={authMode}` and a title of `Sign in` or `Sign up`. Use existing responsive centered dialog classes so mobile keeps sheet behavior.

- [x] **Step 4: Run focused test to verify pass**

Run: `npm --workspace frontend run test -- src/components/viewer/feed-workbench-auth.test.tsx`

Expected: PASS.

### Task 3: Verification

**Files:**

- No new source files expected.

- [x] **Step 1: Run auth test set**

Run: `npm --workspace frontend run test -- src/components/auth/sign-in-panel.test.tsx src/components/viewer/feed-workbench-auth.test.tsx`

Expected: PASS.

- [x] **Step 2: Run typecheck and lint**

Run: `npm run typecheck`

Run: `npm run lint`

Expected: PASS.

- [x] **Step 3: Browser check**

Use local dev server at `http://localhost:3000`. Verify mobile and desktop:

- Account opens from workbench.
- Signed-out Account shows storage/cache status and auth action buttons.
- `Sign up` opens auth surface with confirm password.
- `Sign in` opens auth surface without confirm password.
- Weak password shows short local copy, not raw Supabase policy text.
