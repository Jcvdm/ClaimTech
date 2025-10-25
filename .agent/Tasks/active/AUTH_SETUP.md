# Authentication Setup - ClaimTech

## 🎯 Overview

This document describes the authentication system implemented for ClaimTech using Supabase Auth with SvelteKit SSR.

## ✅ What's Been Implemented

### 1. Branch Setup
- **Branch:** `feature/auth-setup`
- **Purpose:** Isolate auth changes from production
- **Supabase:** Will create preview branch automatically when PR is opened

### 2. Package Installation
- ✅ Installed `@supabase/ssr` for proper server-side auth handling
- ✅ Updated Supabase client configuration for SSR compatibility

### 3. Database Schema
- **Migration:** `supabase/migrations/043_auth_setup.sql`
- **Table:** `user_profiles`
  - Extends `auth.users` with application-specific data
  - Fields: `id`, `email`, `full_name`, `role`, `province`, `company`, `is_active`
  - Roles: `admin` (full access) or `engineer` (limited access)
  - Province field for engineer appointment matching
  - Company field for engineer affiliation

#### Row Level Security (RLS) Policies
- Users can read/update their own profile
- Admins can read/update/delete all profiles
- Auto-creates profile on user signup via trigger

### 4. Server-Side Auth Configuration

#### `src/hooks.server.ts`
- Creates Supabase SSR client for each request
- Validates JWT tokens using `safeGetSession()`
- Auth guard middleware:
  - Redirects unauthenticated users to `/auth/login`
  - Redirects authenticated users away from auth pages
  - Public routes: `/auth/login`, `/auth/signup`, `/auth/callback`, `/auth/confirm`

#### `src/app.d.ts`
- TypeScript types for `App.Locals` and `App.PageData`
- Includes `supabase`, `session`, `user`, and `safeGetSession`

### 5. Supabase Client Updates

#### `src/lib/supabase.ts`
- Updated to use `createBrowserClient` from `@supabase/ssr`
- Properly typed with `Database` type

#### `src/lib/supabase-server.ts`
- Kept for service role operations (storage, bypassing RLS)
- Added note to use `event.locals.supabase` for authenticated operations

### 6. Root Layout Updates

#### `src/routes/+layout.server.ts`
- Loads session and user data server-side using `safeGetSession()`

#### `src/routes/+layout.ts`
- Creates browser Supabase client
- Declares `supabase:auth` dependency for invalidation
- Returns session, supabase client, and user

### 7. Auth Routes

#### Login Page (`/auth/login`)
- Email/password form
- Error handling
- Link to signup page
- Redirects to home on success

#### Signup Page (`/auth/signup`)
- Full name, email, password, role fields
- Role selection: Admin or Engineer
- Success message with email confirmation instructions
- Metadata passed to trigger for profile creation

#### Callback Route (`/auth/callback`)
- Handles OAuth callbacks
- Exchanges code for session
- Redirects to intended destination

#### Confirm Route (`/auth/confirm`)
- Handles email confirmation links
- Verifies OTP tokens
- Redirects on success or shows error

#### Error Page (`/auth/auth-code-error`)
- Displays authentication errors
- Link back to login

#### Logout Route (`/auth/logout`)
- **Implementation:** Form action in `+page.server.ts` (NOT `+server.ts`)
- Calls `supabase.auth.signOut()` to clear session
- Redirects to `/auth/login` with 303 status
- **Why form action:** Compatible with `use:enhance` in form submissions
- **File:** `src/routes/auth/logout/+page.server.ts`

### 8. App Layout Updates

#### `src/routes/(app)/+layout.svelte`
- Shows user email in header
- User menu dropdown with logout button
- Uses Lucide icons (User, LogOut)
- Click outside to close menu

## 🔐 User Roles

### Admin Users
- Full access to all routes and features
- Can manage all data (clients, requests, inspections, assessments)
- Can create/edit/delete other users
- Can view all profiles

### Engineer Users
- Limited access (to be implemented)
- Will have restricted routes based on role
- Can only access assigned work
- Province-based appointment matching

## 🚀 Next Steps

### 1. Apply Migration to Supabase
You need to apply the migration to your Supabase preview branch:

**Option A: Via Supabase Dashboard**
1. Open PR: `feature/auth-setup` → `dev`
2. Supabase will comment with preview branch details
3. Go to Supabase Dashboard → SQL Editor
4. Copy contents of `supabase/migrations/043_auth_setup.sql`
5. Run the migration

**Option B: Via Supabase CLI**
```bash
# Link to your project
supabase link --project-ref cfblmkzleqtvtfxujikf

# Push migration
supabase db push
```

### 2. Configure Supabase Auth Settings

In Supabase Dashboard → Authentication:

**Email Templates:**
- Update confirmation email redirect URL
- Update password reset redirect URL

**Site URL:**
- Development: `http://localhost:5173`
- Production: Your Vercel/Netlify URL

**Redirect URLs (whitelist):**
- `http://localhost:5173/auth/callback`
- `http://localhost:5173/auth/confirm`
- `https://your-domain.vercel.app/auth/callback`
- `https://your-domain.vercel.app/auth/confirm`

**Email Auth:**
- Enable email/password authentication
- Configure email confirmation (optional for dev)

### 3. Create Environment File for Auth Branch

Create `.env.auth` (or update `.env.development`):
```bash
# Get these from Supabase Dashboard → Branches → [preview-branch] → Settings → API
PUBLIC_SUPABASE_URL=https://[preview-branch-ref].supabase.co
PUBLIC_SUPABASE_ANON_KEY=[preview-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[preview-service-key]
```

### 4. Test the Auth Flow

```bash
# Run with auth branch environment
npm run dev

# Test:
# 1. Visit http://localhost:5173 (should redirect to /auth/login)
# 2. Click "Sign up" and create an account
# 3. Check email for confirmation (if enabled)
# 4. Sign in with credentials
# 5. Should redirect to dashboard
# 6. Click user menu and sign out
```

### 5. Implement Role-Based Access Control

**For Engineer Users:**
- Create route guards based on `user_profiles.role`
- Restrict access to certain pages
- Filter data based on user assignments
- Implement province-based filtering

**Example in `+page.server.ts`:**
```typescript
export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
  if (!session) {
    redirect(303, '/auth/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  // Check if admin
  if (profile?.role !== 'admin') {
    redirect(303, '/unauthorized')
  }

  // Continue with page logic...
}
```

### 6. Update Existing Services

Update services to use authenticated Supabase client:
- Pass `event.locals.supabase` instead of importing global client
- This ensures RLS policies are respected
- User context is maintained

### 7. Tighten RLS Policies

Currently, most tables have permissive dev policies. Update them to:
- Check user authentication
- Enforce role-based access
- Filter data by user assignments

### 8. Add User Management UI

Create admin pages for:
- Listing all users
- Creating new users
- Editing user roles/details
- Deactivating users

## 📝 Testing Checklist

- [ ] Migration applied successfully
- [ ] Can sign up new user
- [ ] Email confirmation works (if enabled)
- [ ] Can sign in with credentials
- [ ] Session persists across page reloads
- [ ] Protected routes redirect to login
- [ ] Auth pages redirect to home when logged in
- [ ] User menu shows correct email
- [ ] Logout works correctly
- [ ] User profile created in database
- [ ] Role is set correctly (admin/engineer)

## 🔒 Security Notes

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use preview branch for testing** - Don't test auth on production
3. **Service role key** - Only use in server-side code, never expose to browser
4. **RLS policies** - Must be tightened before production
5. **Email confirmation** - Should be enabled in production
6. **Password requirements** - Currently 6 chars minimum, consider stronger requirements

## 📚 Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [SvelteKit SSR with Supabase](https://supabase.com/docs/guides/auth/server-side/sveltekit)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [SvelteKit Hooks](https://kit.svelte.dev/docs/hooks)

## 🎉 Summary

The authentication foundation is now in place! The system supports:
- ✅ Email/password authentication
- ✅ User profiles with roles (admin/engineer)
- ✅ Server-side session validation
- ✅ Protected routes
- ✅ Login/signup/logout flows
- ✅ User menu in app header

Next steps are to apply the migration, configure Supabase settings, test the flow, and implement role-based access control throughout the app.

