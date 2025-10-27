#!/bin/bash

# Update Supabase Email Templates for PKCE Flow
# This script updates the password reset email template to work with SvelteKit SSR

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Supabase Email Template Updater ===${NC}"
echo ""

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: SUPABASE_ACCESS_TOKEN environment variable is not set${NC}"
    echo ""
    echo "To get your Personal Access Token:"
    echo "1. Go to: https://supabase.com/dashboard/account/tokens"
    echo "2. Click 'Generate New Token'"
    echo "3. Give it a name (e.g., 'Email Template Update')"
    echo "4. Copy the token"
    echo ""
    echo "Then run:"
    echo -e "${YELLOW}export SUPABASE_ACCESS_TOKEN=\"your-token-here\"${NC}"
    echo ""
    exit 1
fi

# Project details
PROJECT_REF="cfblmkzleqtvtfxujikf"
API_URL="https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth"

echo "Project: $PROJECT_REF"
echo "Updating email templates..."
echo ""

# Read the site URL from .env
SITE_URL=$(grep "PUBLIC_SUPABASE_URL" .env | cut -d'=' -f2 | tr -d '"' | sed 's/https:\/\/[^.]*\.supabase\.co/http:\/\/localhost:5173/')

if [ -z "$SITE_URL" ]; then
    SITE_URL="http://localhost:5173"
fi

echo "Site URL: $SITE_URL"
echo ""

# Password Reset Template (Recovery)
echo -e "${YELLOW}Updating Password Reset template...${NC}"
RECOVERY_CONTENT='<h2>Reset Password</h2>

<p>Follow this link to reset your password for {{ .SiteURL }}:</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/account/set-password">
    Reset Password
  </a>
</p>

<p>If you didn'\''t request this password reset, you can safely ignore this email.</p>

<p><strong>This link expires in 1 hour.</strong></p>'

# Signup Confirmation Template
echo -e "${YELLOW}Updating Signup Confirmation template...${NC}"
CONFIRMATION_CONTENT='<h2>Confirm Your Email</h2>

<p>Follow this link to confirm your email address for {{ .SiteURL }}:</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard">
    Confirm Email
  </a>
</p>

<p>If you didn'\''t create an account, you can safely ignore this email.</p>

<p><strong>This link expires in 24 hours.</strong></p>'

# Magic Link Template
echo -e "${YELLOW}Updating Magic Link template...${NC}"
MAGIC_LINK_CONTENT='<h2>Sign In to {{ .SiteURL }}</h2>

<p>Click this link to sign in:</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/dashboard">
    Sign In
  </a>
</p>

<p>If you didn'\''t request this, you can safely ignore this email.</p>

<p><strong>This link expires in 1 hour.</strong></p>'

# Update via API
RESPONSE=$(curl -s -X PATCH "$API_URL" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"mailer_subjects_recovery\": \"Reset Your Password\",
    \"mailer_templates_recovery_content\": $(echo "$RECOVERY_CONTENT" | jq -Rs .),
    \"mailer_subjects_confirmation\": \"Confirm Your Signup\",
    \"mailer_templates_confirmation_content\": $(echo "$CONFIRMATION_CONTENT" | jq -Rs .),
    \"mailer_subjects_magic_link\": \"Your Magic Link\",
    \"mailer_templates_magic_link_content\": $(echo "$MAGIC_LINK_CONTENT" | jq -Rs .)
  }")

# Check for errors
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${RED}Error updating templates:${NC}"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Email templates updated successfully!${NC}"
echo ""
echo "Updated templates:"
echo "  ✓ Password Reset (Recovery)"
echo "  ✓ Signup Confirmation"
echo "  ✓ Magic Link"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test engineer creation flow"
echo "2. Check email - link should go to: localhost:5173/auth/confirm?token_hash=..."
echo "3. Click link - should redirect to /account/set-password"
echo "4. Set password - should work!"
echo ""
