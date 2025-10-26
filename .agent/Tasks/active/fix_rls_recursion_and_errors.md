# Fix RLS Recursion and Application Errors

**Status:** 🔄 IN PROGRESS
**Priority:** CRITICAL
**Created:** October 25, 2025
**Estimated Time:** 45-50 minutes

---

## Problem Statement

Four critical issues identified in the ClaimTech application:

1. **CRITICAL - RLS Infinite Recursion**: `user_profiles` table policies cause infinite recursion, blocking all login attempts
2. **SECURITY - Insecure Auth**: API routes use `getSession()` instead of secure `safeGetSession()`
3. **WARNING - Svelte 5 State References**: State variables referenced in module scope capture initial values
4. **DEPRECATION - Svelte Component**: `<svelte:component>` deprecated in runes mode

---

## Root Cause Analysis

### Issue 1: RLS Infinite Recursion (CRITICAL)

**Error**: `infinite recursion detected in policy for relation "user_profiles"`

**Root Cause**: RLS policies on `user_profiles` table query the same table to check admin status:

```sql
-- Migration 043, lines 45-86
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles  -- ⚠️ Queries same table = recursion!
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**Why This Happens**:
1. User tries to login → Need to load user profile
2. SELECT from `user_profiles` → Triggers RLS policy
3. Policy checks "is user admin?" → Queries `user_profiles` table
4. That SELECT triggers RLS policy again → Infinite loop
5. PostgreSQL detects recursion and throws error

**Files Affected**:
- `supabase/migrations/043_auth_setup.sql` (lines 32-86) - Original policies
- `supabase/migrations/046_secure_rls_policies.sql` - Helper functions (not used)
- All user profile loading operations

**Impact**: Complete application failure - users cannot log in

---

### Issue 2: Insecure Authentication (SECURITY)

**Warning**: `Using the user object as returned from supabase.auth.getSession() could be insecure!`

**Root Cause**: Two API routes use `getSession()` on server-side without validating JWT tokens:

```typescript
// src/routes/api/document/[...path]/+server.ts, line 31
const { data: { session } } = await locals.supabase.auth.getSession();
// ⚠️ Doesn't validate JWT - reads from cookies directly
```

**Why This is Insecure**:
- `getSession()` reads session from cookies without verification
- Doesn't check if JWT token is valid, expired, or tampered
- Attacker could forge session cookie to bypass auth

**Files Affected**:
- `src/routes/api/document/[...path]/+server.ts` (line 31)
- `src/routes/api/photo/[...path]/+server.ts` (line 49)

**Impact**: Potential authentication bypass on storage proxy endpoints

---

### Issue 3: Svelte 5 State Reference Warnings

**Warning**: `This reference only captures the initial value of [variable]. Did you mean to reference it inside a closure instead?`

**Root Cause**: State variables referenced in module-scope navigation array:

```typescript
// Sidebar.svelte, lines 45-51
let newRequestCount = $state(0);

// Lines 69-81 - Used in navigation array
{ label: 'New Requests', badge: newRequestCount }  // Captures initial value 0
```

**Why This Happens**:
- Navigation array defined at module level captures initial state values
- When state updates, the `badge:` property still references old value
- Template uses direct refs (which ARE reactive), so it works anyway

**Files Affected**:
- `src/lib/components/layout/Sidebar.svelte` (lines 69, 76-81)

**Impact**: Code works but fragile - could break if refactored

---

### Issue 4: Svelte Component Deprecation

**Warning**: `<svelte:component> is deprecated in runes mode`

**Root Cause**: Using deprecated syntax for dynamic components:

```svelte
<!-- Sidebar.svelte, line 251 -->
<svelte:component this={item.icon} class="h-4 w-4" />
```

**Files Affected**:
- `src/lib/components/layout/Sidebar.svelte` (line 251)

**Impact**: Works now but will break in future Svelte versions

---

## Implementation Plan

### Phase 1: Fix RLS Infinite Recursion (15-20 min) - CRITICAL

**Solution**: Use JWT claims instead of database queries

**Why This Works**:
- Migration 045 already adds `user_role` to JWT via `custom_access_token_hook`
- JWT claims accessible via `auth.jwt() ->> 'user_role'`
- Reading JWT doesn't trigger RLS policies → No recursion

**Steps**:

1. Create migration `064_fix_user_profiles_rls_recursion.sql`
2. Drop 4 recursive policies:
   - "Admins can read all profiles"
   - "Admins can insert profiles"
   - "Admins can update all profiles"
   - "Admins can delete profiles"
3. Create new JWT-based policies:
   ```sql
   CREATE POLICY "Admins can read all profiles"
     ON user_profiles
     FOR SELECT
     USING (
       (auth.jwt() ->> 'user_role') = 'admin'  -- ✅ No recursion
       OR auth.uid() = id  -- Users can read own profile
     );
   ```
4. Apply migration using MCP
5. Test login with admin and engineer accounts

**Verification**:
- [ ] Admin can login without recursion error
- [ ] Engineer can login without recursion error
- [ ] Profile data loads correctly
- [ ] No errors in server logs

---

### Phase 2: Fix Auth Security (10 min) - SECURITY

**Solution**: Replace `getSession()` with `safeGetSession()`

**Why This Works**:
- `safeGetSession()` already implemented in `hooks.server.ts`
- Validates JWT by calling `getUser()` which contacts auth server
- Available as `locals.safeGetSession()`

**Steps**:

1. Update `src/routes/api/document/[...path]/+server.ts`:
   ```typescript
   const { session, user } = await locals.safeGetSession();
   if (!session || !user) {
     throw error(401, 'Authentication required');
   }
   ```

2. Update `src/routes/api/photo/[...path]/+server.ts`:
   - Same pattern as above

3. Test endpoints with valid/invalid tokens

**Verification**:
- [ ] Document endpoint requires valid auth
- [ ] Photo endpoint requires valid auth
- [ ] Invalid tokens rejected
- [ ] No security warnings in logs

---

### Phase 3: Fix Svelte 5 State Warnings (15 min)

**Solution**: Remove unused badge properties from navigation array

**Why This Works**:
- Template already uses direct state refs (which ARE reactive)
- The `badge:` properties in nav array aren't actually used for display
- Removing them eliminates the warning

**Steps**:

1. Update `src/lib/components/layout/Sidebar.svelte`:
   - Remove `badge:` properties from navigation array items
   - Keep state variables as-is (used reactively in template)
   - Add comment explaining pattern

2. Verify badges still update correctly

**Verification**:
- [ ] No state reference warnings in build output
- [ ] Badges display correctly
- [ ] Badge counts update when data changes

---

### Phase 4: Fix Svelte Component Deprecation (5 min)

**Solution**: Replace `<svelte:component>` with direct component reference

**Why This Works**:
- Svelte 5 supports direct component syntax
- Components are dynamic by default in runes mode

**Steps**:

1. Update `src/lib/components/layout/Sidebar.svelte` line 251:
   ```svelte
   <!-- BEFORE -->
   <svelte:component this={item.icon} class="h-4 w-4" />

   <!-- AFTER -->
   <item.icon class="h-4 w-4" />
   ```

2. Test icon rendering

**Verification**:
- [ ] Icons render correctly
- [ ] No deprecation warning
- [ ] Navigation works as expected

---

## Files Modified

### New Files (1)
- `supabase/migrations/064_fix_user_profiles_rls_recursion.sql` - Fix RLS recursion

### Modified Files (3)
- `src/routes/api/document/[...path]/+server.ts` - Security fix
- `src/routes/api/photo/[...path]/+server.ts` - Security fix
- `src/lib/components/layout/Sidebar.svelte` - Svelte warnings + deprecation

---

## Testing Checklist

### After Phase 1 (RLS)
- [ ] Login as admin - no recursion errors
- [ ] Login as engineer - no recursion errors
- [ ] Profile loads correctly
- [ ] Dashboard displays user info
- [ ] No errors in console/logs

### After Phase 2 (Auth)
- [ ] Document proxy works with valid auth
- [ ] Photo proxy works with valid auth
- [ ] Endpoints reject invalid tokens
- [ ] No security warnings

### After Phase 3 & 4 (Svelte)
- [ ] `npm run dev` shows no warnings
- [ ] All 7 navigation badges display
- [ ] Badge counts update correctly
- [ ] Icons render in navigation
- [ ] No console errors

---

## Rollback Plan

**Phase 1 Issues**:
- Revert migration 064
- Disable RLS temporarily if critical
- Check JWT claims are present

**Phase 2 Issues**:
- Revert to `getSession()` (with security note)
- Check `safeGetSession()` implementation

**Phase 3/4 Issues**:
- Revert Sidebar.svelte changes
- Git checkout previous version

---

## Success Criteria

- ✅ No RLS recursion errors
- ✅ Users can log in successfully
- ✅ Secure JWT validation on API routes
- ✅ No Svelte warnings in build output
- ✅ All navigation features work correctly
- ✅ Application fully functional

---

## Implementation Notes

### JWT Claims Structure
```json
{
  "user_role": "admin",
  "engineer_id": "uuid-string",
  "email": "user@example.com"
}
```

### Why JWT-Based Policies Work
- JWT claims evaluated by auth server
- No database query required
- Cannot trigger RLS policies
- Fast and secure

### Alternative Approaches Considered

**For RLS Recursion**:
1. ❌ Disable RLS - Not acceptable (security risk)
2. ❌ Use `is_admin()` function - Still queries user_profiles (recursion)
3. ✅ Use JWT claims - No database query (chosen)

**For Auth Security**:
1. ❌ Keep `getSession()` - Security risk
2. ❌ Call `getUser()` directly - Extra code
3. ✅ Use `safeGetSession()` - Already implemented (chosen)

---

## Related Documentation

- [RLS Security Hardening](./../Tasks/active/rls_security_hardening.md)
- [Auth Setup](./../Tasks/active/AUTH_SETUP.md)
- [Debugging Supabase Auth Hooks](../../SOP/debugging_supabase_auth_hooks.md)
- [Database Schema](../../System/database_schema.md)
- [Security Recommendations](../../System/security_recommendations.md)

---

**Implementation Start**: October 25, 2025
**Expected Completion**: October 25, 2025 (same day)
**Owner**: ClaimTech Development Team
