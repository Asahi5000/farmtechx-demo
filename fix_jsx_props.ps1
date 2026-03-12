# Fix bare =Colors.xxx in JSX props → ={Colors.xxx}
# StyleSheet context (color: Colors.xxx) is unaffected because it uses : not =

$files = @(
  'C:\Users\Admin\Downloads\LayasPinas\app\auth\onboarding.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\auth\signin.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\auth\email-signup.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\auth\success.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\auth\forgot-password.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\(tabs)\home.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\(tabs)\profile.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\trip-planner.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\byahe.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\byahe-upload.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\trips.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\bucket-list.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\discover-spots.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\components\CustomTabBar.tsx',
  'C:\Users\Admin\Downloads\LayasPinas\app\itinerary\[id].tsx'
)

$totalFixes = 0

foreach ($fp in $files) {
  if (!(Test-Path $fp)) { Write-Host "SKIP: $fp"; continue }

  $original = [System.IO.File]::ReadAllText($fp, [System.Text.Encoding]::UTF8)

  # Fix: =Colors.word  →  ={Colors.word}
  # The negative lookbehind (?<![{]) ensures we don't double-wrap already-fixed ones
  # We also handle the case ="Colors.word" (string-wrapped) → ={Colors.word}
  $fixed = [regex]::Replace($original, '=Colors\.(\w+)', '={Colors.$1}')

  # Also fix string-wrapped: ="Colors.word" → ={Colors.word}
  $fixed = [regex]::Replace($fixed, '="Colors\.(\w+)"', '={Colors.$1}')

  $count = 0
  $temp = $original
  # Count how many bare =Colors. were present
  $matches = [regex]::Matches($original, '=Colors\.\w+')
  $count = $matches.Count
  $totalFixes += $count

  if ($fixed -ne $original) {
    [System.IO.File]::WriteAllText($fp, $fixed, [System.Text.Encoding]::UTF8)
    Write-Host "FIXED $count JSX prop(s): $fp"
  } else {
    Write-Host "CLEAN: $fp"
  }
}

Write-Host "`nTotal bare =Colors. props fixed: $totalFixes"
Write-Host "Done."
