# Supabase Branching Strategy for Claimtech

## 🌿 Overview

This document explains how Claimtech uses Supabase branches integrated with GitHub for development, staging, and production environments.

## 📊 Branch Structure

```
GitHub Repository: Jcvdm/ClaimTech
├── main (production)     → Supabase Production Database
├── staging               → Supabase Staging Branch (auto-created on PR)
└── dev (development)     → Supabase Development Branch (auto-created on PR)
```

### Branch Details

| Git Branch | Purpose | Supabase Branch | Auto-Created | Data |
|------------|---------|-----------------|--------------|------|
| **main** | Production | Production (cfblmkzleqtvtfxujikf) | No (default) | Full production data |
| **staging** | Pre-production testing | Auto-created on PR | Yes | Schema only |
| **dev** | Active development | Auto-created on PR | Yes | Schema only |

---

## 🔑 Environment Configuration

### How the App Knows Which Branch to Connect To

The app uses **environment variables** to determine which Supabase instance to connect to. SvelteKit supports multiple environment files based on the `mode`.

### Environment Files Structure

```
.env                    # Default (production)
.env.local              # Local overrides (gitignored)
.env.development        # Development mode
.env.staging            # Staging mode
```

### Configuration Files

#### `.env` (Production - Default)
```bash
# Production Supabase Configuration
PUBLIC_SUPABASE_URL=https://cfblmkzleqtvtfxujikf.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key_here
```

#### `.env.development` (Development Branch)
```bash
# Development Branch Supabase Configuration
# Get these from Supabase Dashboard → Branches → development → Settings → API
PUBLIC_SUPABASE_URL=https://[dev-branch-ref].supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_dev_branch_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_dev_branch_service_key_here
```

#### `.env.staging` (Staging Branch)
```bash
# Staging Branch Supabase Configuration
# Get these from Supabase Dashboard → Branches → staging → Settings → API
PUBLIC_SUPABASE_URL=https://[staging-branch-ref].supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_staging_branch_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_staging_branch_service_key_here
```

---

## 🚀 Running the App with Different Branches

### NPM Scripts (package.json)

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite dev",
    "dev:staging": "vite dev --mode staging",
    "dev:development": "vite dev --mode development",
    "build": "vite build",
    "build:staging": "vite build --mode staging",
    "build:development": "vite build --mode development",
    "preview": "vite preview"
  }
}
```

### Usage

```bash
# Run with production database (default)
npm run dev

# Run with staging branch
npm run dev:staging

# Run with development branch
npm run dev:development

# Build for production
npm run build

# Build for staging
npm run build:staging
```

---

## 🔄 How GitHub Integration Works

### 1. Automatic Preview Branches

When you create a Pull Request on GitHub, Supabase automatically:
1. Creates a preview branch
2. Copies the schema from production
3. Provides unique URL and API keys
4. Links the preview to your PR

### 2. Branch Lifecycle

```
Developer creates PR (dev → main)
    ↓
Supabase creates preview branch
    ↓
Developer tests changes in preview
    ↓
PR is merged to main
    ↓
Supabase updates production
    ↓
Preview branch is deleted (optional)
```

### 3. What Gets Synced

✅ **Automatically Synced:**
- Database migrations (`supabase/migrations/*.sql`)
- Edge functions (`supabase/functions/*`)
- Config files (`supabase/config.toml`)

❌ **Not Synced:**
- Application code (stays in GitHub only)
- Database data (stays in Supabase only)
- Storage files (stays in Supabase only)
- Environment variables (managed separately)

---

## 🎯 Development Workflow

### Scenario 1: Adding a New Feature

```bash
# 1. Start from main branch
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/new-assessment-fields

# 3. Make changes to code and database
# - Edit application code
# - Create migration: supabase/migrations/007_new_fields.sql

# 4. Commit and push
git add .
git commit -m "feat: add new assessment fields"
git push -u origin feature/new-assessment-fields

# 5. Create Pull Request on GitHub
# feature/new-assessment-fields → dev

# 6. Supabase automatically creates preview branch
# Test your changes using the preview branch URL

# 7. If tests pass, merge PR to dev
# 8. Test on dev branch

# 9. When ready for production, create PR: dev → main
# 10. Merge to deploy to production
```

### Scenario 2: Hotfix for Production

```bash
# 1. Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug

# 2. Fix the bug
# 3. Create migration if needed

# 4. Commit and push
git add .
git commit -m "fix: resolve critical bug"
git push -u origin hotfix/critical-bug

# 5. Create PR: hotfix/critical-bug → main
# 6. Test in preview branch
# 7. Merge directly to main (skip dev for urgent fixes)
```

### Scenario 3: Testing Before Production

```bash
# 1. Develop on dev branch
git checkout dev
# Make changes, test

# 2. Create PR: dev → staging
# 3. Test thoroughly on staging branch
# 4. If all good, create PR: staging → main
# 5. Deploy to production
```

---

## 📝 Getting Branch Credentials

### When Supabase Creates a Preview Branch:

1. **Via GitHub PR:**
   - Supabase comments on your PR with branch details
   - Click the link to view branch in Supabase Dashboard

2. **Via Supabase Dashboard:**
   - Go to: https://app.supabase.com/project/cfblmkzleqtvtfxujikf
   - Click **"Branches"** in sidebar
   - Select your preview branch
   - Go to **Settings** → **API**
   - Copy URL and keys

3. **Update Local Environment:**
   ```bash
   # Create .env.development or .env.staging
   PUBLIC_SUPABASE_URL=https://[branch-ref].supabase.co
   PUBLIC_SUPABASE_ANON_KEY=[branch-anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[branch-service-key]
   ```

---

## 🔒 Security Best Practices

### 1. Never Commit Actual Keys

Your `.gitignore` should include:
```
.env
.env.local
.env.development
.env.staging
.env.production
.env*.local
```

### 2. Use .env.example as Template

```bash
# .env.example (committed to Git)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
```

### 3. Separate Keys Per Environment

- ✅ Production keys for production
- ✅ Staging keys for staging
- ✅ Dev keys for dev branches
- ✅ Never use production keys in development

---

## 📊 Current Setup

### Git Branches (Created)

```bash
✅ main          # Production code
✅ dev           # Development code
✅ staging       # Staging/testing code
```

### Supabase Branches

```
✅ Production (cfblmkzleqtvtfxujikf)  # Main database
⏳ Preview branches created automatically on PR
```

### GitHub Integration

```
✅ Repository: Jcvdm/ClaimTech
✅ Production branch: master (syncs with main)
✅ Automatic branching: Enabled
✅ Deploy to production: Enabled
✅ Supabase changes only: Enabled
```

---

## 🆘 Troubleshooting

### Issue: Preview branch not created

**Solution:**
1. Check that PR includes Supabase-related changes
2. Verify GitHub integration is enabled
3. Check "Supabase changes only" setting
4. Manually create branch if needed

### Issue: Wrong database connection

**Solution:**
1. Check which npm script you're running
2. Verify `.env` file being loaded
3. Check URL in browser console:
   ```javascript
   console.log(import.meta.env.PUBLIC_SUPABASE_URL)
   ```

### Issue: Environment variables not updating

**Solution:**
1. Stop dev server
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Restart with correct mode: `npm run dev:development`

---

## 📚 Quick Reference

### Common Commands

```bash
# Switch branches
git checkout main
git checkout dev
git checkout staging

# Create feature branch
git checkout -b feature/name

# Push new branch
git push -u origin branch-name

# Run with different environments
npm run dev                    # Production
npm run dev:development        # Development
npm run dev:staging           # Staging
```

### Branch Naming Convention

```
main                          # Production
dev                          # Development
staging                      # Staging
feature/description          # New features
hotfix/description           # Bug fixes
```

---

## 🧹 Branch Hygiene (Recommended Next Steps)

If your current working branch `vercel-dev` is functionally the same as `dev`, align with the documented flow:

1. Align development branch
   - If `vercel-dev` ≈ `dev`, either rename it to `dev` or create `dev` and set it as the active development branch.
   - Ensure CI/CD and Supabase preview branches point to `dev` for day-to-day work.

2. Use short-lived feature branches
   - Create branches as `feature/<description>` for each unit of work.
   - Open PRs from `feature/*` into `dev`.

3. Promote via staging before production
   - When `dev` is stable, open PR `dev → staging` for pre-production testing.
   - After sign-off, open PR `staging → main` to release to production.

This keeps the environment mapping consistent:
```
main     → Production
staging  → Pre-production testing
dev      → Active development
```

> Note: If `vercel-dev` must remain for historical CI reasons, document it as an alias of `dev` and keep only one as the canonical target for PRs.

---

## 🔄 Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-23 | 1.0 | Initial setup with GitHub integration, dev and staging branches |

---

## 📖 Additional Resources

- [Supabase Branching Docs](https://supabase.com/docs/guides/platform/branching)
- [SvelteKit Environment Variables](https://kit.svelte.dev/docs/modules#$env-static-public)
- [Vite Modes](https://vitejs.dev/guide/env-and-mode.html)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

