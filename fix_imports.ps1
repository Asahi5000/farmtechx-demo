# Fix missing Colors imports in files processed with CRLF endings
# The color replacements worked, but the import insert had CRLF split issues in some files

$importLine = "import { Colors } from '@/constants/Colors';"

$files = @(
  'C:\Users\Admin\Downloads\LayasPinas\app\auth\onboarding.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\auth\signin.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\auth\email-signup.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\auth\success.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\auth\forgot-password.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\(tabs)\home.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\trip-planner.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\byahe.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\byahe-upload.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\trips.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\bucket-list.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\discover-spots.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\itinerary\[id].tsx',
  'C:\Users\Admin\Downloads\LayasPinas\components\CustomTabBar.tsx'
)

foreach ($fp in $files) {
  if (!(Test-Path $fp)) { Write-Host "SKIP: $fp"; continue }
  $content = [System.IO.File]::ReadAllText($fp, [System.Text.Encoding]::UTF8)

  # If Colors tokens are used but import is missing, add it
  if (($content -match 'Colors\.') -and ($content -notmatch "constants/Colors")) {
    # Find the position of the first empty line after imports
    # Use regex to find location after last 'from ...' line
    $pattern = "(?m)(^import .+?;\r?\n)"
    $matches = [regex]::Matches($content, $pattern)
    if ($matches.Count -gt 0) {
      $lastMatch = $matches[$matches.Count - 1]
      $insertPos = $lastMatch.Index + $lastMatch.Length
      $content = $content.Insert($insertPos, $importLine + "`r`n")
      [System.IO.File]::WriteAllText($fp, $content, [System.Text.Encoding]::UTF8)
      Write-Host "FIXED import: $fp"
    }
  } elseif ($content -match "constants/Colors") {
    Write-Host "OK (import present): $fp"
  } else {
    Write-Host "NO Colors tokens: $fp"
  }
}
Write-Host "Done."
