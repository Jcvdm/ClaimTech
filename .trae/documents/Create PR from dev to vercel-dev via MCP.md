## Assumption
- Create a pull request from `dev` (head) into `vercel-dev` (base) per your 3‑tier workflow. If you prefer `dev` → `main`, I will switch the base.

## Prerequisites
- Update the MCP GitHub token to have write access:
  - Classic PAT: grant `repo` scope.
  - Fine‑grained token: grant `Pull requests: Read and write` and `Contents: Read and write` for `Jcvdm/ClaimTech`.
- Ensure both branches exist on GitHub and `dev` is ahead of `vercel-dev`.

## Steps
- Create PR with:
  - Title: `Promote dev to vercel-dev`
  - Body: summary of changes (Vercel strategy, Supabase auth docs, PDF optimizations, performance, FRC handling).
  - Head: `dev`
  - Base: `vercel-dev`
  - Draft: `false`
- Optionally add labels and reviewers.

## Validation
- Retrieve PR details and share the PR URL.
- Confirm PR status is `open` and diff shows expected commits.
- Post checklist comment for Vercel Preview testing.

## Fallback
- If token remains limited:
  - Use compare URL: `https://github.com/Jcvdm/ClaimTech/compare/vercel-dev...dev?expand=1` to create the PR manually.
  - CLI alternative: `gh pr create --repo Jcvdm/ClaimTech --head dev --base vercel-dev --title "Promote dev to vercel-dev" --body "Merge latest development work into vercel-dev for cloud testing."`

## Next Actions
- Confirm token scope update or preferred base branch.
- I will execute the MCP PR creation and return the PR link for review.