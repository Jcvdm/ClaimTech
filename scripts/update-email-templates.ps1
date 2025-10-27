# Update Supabase Email Templates for PKCE Flow
# PowerShell version for Windows

Write-Host "=== Supabase Email Template Updater ===" -ForegroundColor Green
Write-Host ""

# Check if SUPABASE_ACCESS_TOKEN is set
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "Error: SUPABASE_ACCESS_TOKEN environment variable is not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "To get your Personal Access Token:"
    Write-Host "1. Go to: https://supabase.com/dashboard/account/tokens"
    Write-Host "2. Click 'Generate New Token'"
    Write-Host "3. Give it a name (e.g., 'Email Template Update')"
    Write-Host "4. Copy the token"
    Write-Host ""
    Write-Host "Then run:" -ForegroundColor Yellow
    Write-Host '$env:SUPABASE_ACCESS_TOKEN="your-token-here"' -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Project details
$PROJECT_REF = "cfblmkzleqtvtfxujikf"
$API_URL = "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth"

Write-Host "Project: $PROJECT_REF"
Write-Host "Updating email templates..."
Write-Host ""

# Site URL (change to your production URL when deploying)
$SITE_URL = "http://localhost:5173"

Write-Host "Site URL: $SITE_URL"
Write-Host ""

# Password Reset Template (Recovery)
Write-Host "Updating Password Reset template..." -ForegroundColor Yellow
$RECOVERY_CONTENT = @"
<h2>Reset Password</h2>

<p>Follow this link to reset your password for {{ .SiteURL }}:</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/account/set-password">
    Reset Password
  </a>
</p>

<p>If you didn't request this password reset, you can safely ignore this email.</p>

<p><strong>This link expires in 1 hour.</strong></p>
"@

# Signup Confirmation Template
Write-Host "Updating Signup Confirmation template..." -ForegroundColor Yellow
$CONFIRMATION_CONTENT = @"
<h2>Confirm Your Email</h2>

<p>Follow this link to confirm your email address for {{ .SiteURL }}:</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard">
    Confirm Email
  </a>
</p>

<p>If you didn't create an account, you can safely ignore this email.</p>

<p><strong>This link expires in 24 hours.</strong></p>
"@

# Magic Link Template
Write-Host "Updating Magic Link template..." -ForegroundColor Yellow
$MAGIC_LINK_CONTENT = @"
<h2>Sign In to {{ .SiteURL }}</h2>

<p>Click this link to sign in:</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/dashboard">
    Sign In
  </a>
</p>

<p>If you didn't request this, you can safely ignore this email.</p>

<p><strong>This link expires in 1 hour.</strong></p>
"@

# Build request body
$body = @{
    mailer_subjects_recovery = "Reset Your Password"
    mailer_templates_recovery_content = $RECOVERY_CONTENT
    mailer_subjects_confirmation = "Confirm Your Signup"
    mailer_templates_confirmation_content = $CONFIRMATION_CONTENT
    mailer_subjects_magic_link = "Your Magic Link"
    mailer_templates_magic_link_content = $MAGIC_LINK_CONTENT
} | ConvertTo-Json

# Update via API
try {
    $headers = @{
        "Authorization" = "Bearer $env:SUPABASE_ACCESS_TOKEN"
        "Content-Type" = "application/json"
    }

    $response = Invoke-RestMethod -Uri $API_URL -Method PATCH -Headers $headers -Body $body

    Write-Host ""
    Write-Host "✓ Email templates updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Updated templates:"
    Write-Host "  ✓ Password Reset (Recovery)"
    Write-Host "  ✓ Signup Confirmation"
    Write-Host "  ✓ Magic Link"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Test engineer creation flow"
    Write-Host "2. Check email - link should go to: localhost:5173/auth/confirm?token_hash=..."
    Write-Host "3. Click link - should redirect to /account/set-password"
    Write-Host "4. Set password - should work!"
    Write-Host ""
}
catch {
    Write-Host "Error updating templates:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
