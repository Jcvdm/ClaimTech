# Email Template Update Scripts

## Overview

These scripts update Supabase email templates to work with SvelteKit SSR's PKCE flow. They fix the `otp_expired` error that occurs when clicking password reset links.

---

## Quick Start

### Option 1: PowerShell (Windows)

```powershell
# 1. Get your Personal Access Token from Supabase
# Go to: https://supabase.com/dashboard/account/tokens
# Click "Generate New Token" → Copy the token

# 2. Set the token as environment variable
$env:SUPABASE_ACCESS_TOKEN="your-token-here"

# 3. Run the script
.\scripts\update-email-templates.ps1
```

### Option 2: Bash (Linux/Mac/Git Bash)

```bash
# 1. Get your Personal Access Token from Supabase
# Go to: https://supabase.com/dashboard/account/tokens
# Click "Generate New Token" → Copy the token

# 2. Set the token as environment variable
export SUPABASE_ACCESS_TOKEN="your-token-here"

# 3. Run the script
chmod +x ./scripts/update-email-templates.sh
./scripts/update-email-templates.sh
```

---

## What Gets Updated

The script updates 3 email templates:

1. **Password Reset (Recovery)** ⭐ CRITICAL
   - Subject: "Reset Your Password"
   - Uses `{{ .TokenHash }}` for PKCE flow
   - Redirects to `/account/set-password`

2. **Signup Confirmation**
   - Subject: "Confirm Your Signup"
   - Uses `{{ .TokenHash }}` for PKCE flow
   - Redirects to `/dashboard`

3. **Magic Link**
   - Subject: "Your Magic Link"
   - Uses `{{ .TokenHash }}` for PKCE flow
   - Redirects to `/dashboard`

**Note:** Templates use `{{ .SiteURL }}` variable which expands to your configured Site URL. Make sure your Site URL is correct (see **Site URL Configuration** below).

---

## Site URL Configuration

**⚠️ IMPORTANT:** Email templates use `{{ .SiteURL }}` which is configured separately from the templates themselves.

### Check Current Site URL

```bash
# Set your access token
export SUPABASE_ACCESS_TOKEN="sbp_..."

# Check current Site URL
curl "https://api.supabase.com/v1/projects/cfblmkzleqtvtfxujikf" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | jq '.auth.site_url'
```

### Update Site URL

**For Development:**
```bash
curl -X PATCH "https://api.supabase.com/v1/projects/cfblmkzleqtvtfxujikf/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "http://localhost:5173",
    "uri_allow_list": "http://localhost:5173/**"
  }'
```

**For Production:**
```bash
curl -X PATCH "https://api.supabase.com/v1/projects/cfblmkzleqtvtfxujikf/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://yourapp.com",
    "uri_allow_list": "https://yourapp.com/**"
  }'
```

**Common Issue:**
- Email shows `http://localhost:3000` but app runs on `:5173`
- **Fix:** Update Site URL to correct port as shown above

---

## Getting a Personal Access Token

**Step-by-step:**

1. Navigate to: https://supabase.com/dashboard/account/tokens

2. Click **"Generate New Token"**

3. Enter a name: `Email Template Update`

4. Click **"Generate Token"**

5. **Copy the token immediately** (you won't be able to see it again)

6. Set as environment variable:
   - **Windows PowerShell:** `$env:SUPABASE_ACCESS_TOKEN="your-token"`
   - **Bash/Linux/Mac:** `export SUPABASE_ACCESS_TOKEN="your-token"`

⚠️ **IMPORTANT:** Personal Access Tokens are different from your project's API keys (anon/service role). They're used for managing project settings via the Management API.

---

## Troubleshooting

### Error: "SUPABASE_ACCESS_TOKEN environment variable is not set"

**Solution:** Set the token as shown in the Quick Start section above.

### Error: "401 Unauthorized"

**Causes:**
- Token expired or invalid
- Token not set correctly
- Token doesn't have permission to modify project

**Solution:**
1. Generate a new token from Supabase dashboard
2. Make sure you're using the token from the correct organization
3. Set the token again: `$env:SUPABASE_ACCESS_TOKEN="new-token"`

### Issue: Email shows wrong port or domain

**Example:**
- Email: "...for http://localhost:3000"
- Expected: "...for http://localhost:5173"

**Cause:** Site URL is misconfigured

**Solution:** Update Site URL (see **Site URL Configuration** section above)

### Error: "jq: command not found" (Bash only)

**Solution:** Install jq:
- **Ubuntu/Debian:** `sudo apt-get install jq`
- **Mac:** `brew install jq`
- **Windows Git Bash:** Download from https://stedolan.github.io/jq/download/

**Alternative:** Use the PowerShell script instead (doesn't require jq)

### Script runs but templates not updated

**Check:**
1. Verify project ID in script matches your project: `cfblmkzleqtvtfxujikf`
2. Check Supabase dashboard: https://supabase.com/dashboard/project/cfblmkzleqtvtfxujikf/auth/templates
3. Look for error messages in script output

---

## Testing After Update

### 1. Test Engineer Creation

```bash
# In your app
1. Admin creates new engineer with email
2. Check inbox for "Reset Your Password" email
3. Verify link format: http://localhost:5173/auth/confirm?token_hash=...&type=recovery
4. Click link → Should redirect to /account/set-password
5. Enter password → Should redirect to /dashboard
6. Login with new password → Should succeed ✓
```

### 2. Test Forgot Password

```bash
1. Click "Forgot password?" on login page
2. Enter email → Submit
3. Check inbox for reset email
4. Click link → Should redirect to /account/set-password
5. Set password → Should work ✓
```

### What Success Looks Like

**Email link (correct):**
```
http://localhost:5173/auth/confirm?token_hash=abc123...&type=recovery&next=/account/set-password
```

**NOT this (old/broken):**
```
https://cfblmkzleqtvtfxujikf.supabase.co/auth/v1/verify?token=pkce_...
```

**Behavior:**
- ✓ Click link → Redirect to password form
- ✓ Enter password → Success
- ✓ No `otp_expired` error
- ✓ No redirect to login with error hash

---

## Manual Verification

You can also verify the templates were updated in the Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/cfblmkzleqtvtfxujikf/auth/templates
2. Select "Reset Password" template
3. Verify it contains: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}`
4. Should NOT contain: `{{ .ConfirmationURL }}`

---

## Production Deployment

**Before deploying to production:**

1. **Update Site URL Configuration** ⭐ **CRITICAL**

   Use the Management API to update Site URL:
   ```bash
   export SUPABASE_ACCESS_TOKEN="sbp_..."

   curl -X PATCH "https://api.supabase.com/v1/projects/cfblmkzleqtvtfxujikf/config/auth" \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "site_url": "https://yourapp.com",
       "uri_allow_list": "https://yourapp.com/**"
     }'
   ```

   Or set it in Supabase Dashboard:
   - Go to: Project Settings → Authentication → URL Configuration
   - Set "Site URL" to your production domain: `https://yourapp.com`
   - Add to "Redirect URLs": `https://yourapp.com/**`

2. **Verify Email Templates**

   Email templates use `{{ .SiteURL }}` which will now expand to your production domain. No need to update templates themselves.

3. **Test the Flow**

   - Create test user in production
   - Trigger password reset
   - Verify email link uses production domain
   - Test complete flow

---

## Related Documentation

- [Fix Password Reset Flow Task](../.agent/Tasks/active/fix_password_reset_flow.md) - Complete root cause analysis
- [Password Reset Flow SOP](../.agent/SOP/password_reset_flow.md) - Implementation guide
- [Supabase Email Templates Reference](../.agent/System/supabase_email_templates.md) - All template examples

---

## What's Next?

After running this script:

1. ✓ Email templates updated for PKCE flow
2. ✓ Verify Site URL is configured correctly
3. ✓ Password reset will work correctly
4. ✓ No more `otp_expired` errors

**Verify Site URL:**
```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."
curl "https://api.supabase.com/v1/projects/cfblmkzleqtvtfxujikf" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | jq '.auth.site_url'
```

Expected: `"http://localhost:5173"` (dev) or `"https://yourapp.com"` (production)

**Test the flow:**
- Create a new engineer
- Check email - link should use correct domain/port
- Click the email link
- Set password
- Celebrate!

---

**Questions or issues?** Check the main task documentation: `.agent/Tasks/active/fix_password_reset_flow.md`
