# ClaimTech Documentation

**Project**: ClaimTech (SVA — SvelteKit Validation App)
**Stack**: SvelteKit 5 + TypeScript + Tailwind CSS 4 + Supabase (PostgreSQL + Auth + Storage)
**Architecture**: Assessment-centric, 10-stage pipeline. Shop module is independent.
**Deployment**: Vercel — https://claimtech.vercel.app
**Supabase project ID**: `cfblmkzleqtvtfxujikf`

---

## What's in `.agent/`

| Subtree | Purpose | Authority |
|---|---|---|
| `Tasks/active/` | Current planning docs and PRDs being worked on | Authoritative — read this first |
| `Tasks/completed/` | Shipped work, kept as institutional memory ("why did we do X") | Reference — read for historical context |
| `Tasks/historical/` | Older completed work, archived | Reference |
| `Tasks/future/` | Wishlist / not yet started | Reference |
| `historical/System/` | Previously-active architecture reference docs (71 files) | **May be stale** — verify against code before trusting |
| `historical/SOP/` | Previously-active how-to guides (26 files) | **May be stale** — verify before trusting |
| `historical/README/` | Old layered index files (counts no longer match reality) | **Stale** — kept only for git history |
| `Design/`, `shadcn/`, `shadui/` | Design specs and shadcn primitive notes | Reference |
| `bugs_and_concerns.md`, `shop-schema.md`, `shop.md`, `production_checklist.md` | Working notes | Reference |

---

## How to use this directory

- **Need current planning context?** → `Tasks/active/`
- **Implementing a new feature?** → Add a planning doc to `Tasks/active/<FEATURE_NAME>.md` first, then dispatch a coder
- **Wondering how something used to work?** → Search `Tasks/completed/` or `historical/`
- **Need authoritative current architecture?** → Read the source code; `.agent/historical/System/` may be out of date

---

## Maintenance policy

- New planning docs → `Tasks/active/`
- Once shipped → `git mv` to `Tasks/completed/`
- Once superseded → `git mv` to `Tasks/historical/`
- The `historical/` subtree is **archive only** — don't add new files there

This README is intentionally short. The previous version maintained a layered index (`README/*.md`) with file counts that drifted out of sync with reality. That layered index is now in `historical/README/` for git history. If you need a current count, run `ls .agent/<subtree> | wc -l`.
