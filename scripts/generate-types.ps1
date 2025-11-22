# Generate Supabase TypeScript types
# This script generates TypeScript types from the linked Supabase project

Write-Host "Generating Supabase types..." -ForegroundColor Cyan

# Generate types and save to file
$output = supabase gen types typescript --project-id cfblmkzleqtvtfxujikf --schema public 2>&1

# Check if the command was successful
if ($LASTEXITCODE -eq 0) {
    # Save to file
    $output | Out-File -FilePath "src/lib/types/database.generated.ts" -Encoding utf8
    Write-Host "[OK] Types generated successfully at src/lib/types/database.generated.ts" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to generate types" -ForegroundColor Red
    Write-Host $output
    exit 1
}

