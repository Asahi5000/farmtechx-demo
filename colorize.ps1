$root = 'C:\Users\Admin\Downloads\LayasPinas'

$files = @(
  'app\auth\onboarding.tsx',
  'app\auth\signin.tsx',
  'app\auth\email-signup.tsx',
  'app\auth\success.tsx',
  'app\auth\forgot-password.tsx',
  'app\(tabs)\home.tsx',
  'app\(tabs)\profile.tsx',
  'app\trip-planner.tsx',
  'app\itinerary\[id].tsx',
  'app\byahe.tsx',
  'app\byahe-upload.tsx',
  'app\trips.tsx',
  'app\bucket-list.tsx',
  'app\discover-spots.tsx',
  'components\CustomTabBar.tsx'
)

$importLine = "import { Colors } from '@/constants/Colors';"

$results = @()

foreach ($file in $files) {
  $fullPath = Join-Path $root $file
  if (!(Test-Path $fullPath)) {
    $results += [PSCustomObject]@{ File=$file; Status='SKIP(not found)'; Changes=0 }
    continue
  }

  $original = Get-Content $fullPath -Raw -Encoding UTF8
  $content = $original

  # Add import if not already present
  $addedImport = $false
  if ($content -notmatch 'constants/Colors') {
    $lines = $content -split "`r?`n"
    $lastImportIdx = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
      if ($lines[$i] -match '^import ') { $lastImportIdx = $i }
    }
    if ($lastImportIdx -ge 0) {
      $linesList = [System.Collections.Generic.List[string]]$lines
      $linesList.Insert($lastImportIdx + 1, $importLine)
      $content = $linesList -join "`n"
    } else {
      $content = $importLine + "`n" + $content
    }
    $addedImport = $true
  }

  # ---------- Brand/primary colors ----------
  $content = $content.Replace("'#0FA3E2'", 'Colors.primary')
  $content = $content.Replace('"#0FA3E2"', 'Colors.primary')
  $content = $content.Replace("'#49C9FF'", 'Colors.primaryLight')
  $content = $content.Replace('"#49C9FF"', 'Colors.primaryLight')
  $content = $content.Replace("'#0D9488'", 'Colors.primary')
  $content = $content.Replace('"#0D9488"', 'Colors.primary')
  $content = $content.Replace("'#0D6E6E'", 'Colors.primaryDark')
  $content = $content.Replace('"#0D6E6E"', 'Colors.primaryDark')
  $content = $content.Replace("'#1EABAB'", 'Colors.primary')
  $content = $content.Replace('"#1EABAB"', 'Colors.primary')
  $content = $content.Replace("'#14B8A6'", 'Colors.primaryLight')
  $content = $content.Replace('"#14B8A6"', 'Colors.primaryLight')
  # Blue → teal
  $content = $content.Replace("'#2563eb'", 'Colors.primary')
  $content = $content.Replace('"#2563eb"', 'Colors.primary')
  $content = $content.Replace("'#2563EB'", 'Colors.primary')
  $content = $content.Replace('"#2563EB"', 'Colors.primary')
  # ---------- Amber/secondary ----------
  $content = $content.Replace("'#F59E0B'", 'Colors.secondary')
  $content = $content.Replace('"#F59E0B"', 'Colors.secondary')
  $content = $content.Replace("'#f59e0b'", 'Colors.secondary')
  # ---------- Success/green ----------
  $content = $content.Replace("'#10B981'", 'Colors.success')
  $content = $content.Replace('"#10B981"', 'Colors.success')
  $content = $content.Replace("'#10b981'", 'Colors.success')
  # ---------- Error/red ----------
  $content = $content.Replace("'#EF4444'", 'Colors.error')
  $content = $content.Replace('"#EF4444"', 'Colors.error')
  $content = $content.Replace("'#ef4444'", 'Colors.error')
  # ---------- Background ----------
  $content = $content.Replace("'#F9FAFB'", 'Colors.background')
  $content = $content.Replace('"#F9FAFB"', 'Colors.background')
  $content = $content.Replace("'#f9fafb'", 'Colors.background')
  # ---------- Dark text ----------
  $content = $content.Replace("'#1F2937'", 'Colors.dark')
  $content = $content.Replace('"#1F2937"', 'Colors.dark')
  $content = $content.Replace("'#1f2937'", 'Colors.dark')
  # ---------- Gray ----------
  $content = $content.Replace("'#6B7280'", 'Colors.gray')
  $content = $content.Replace('"#6B7280"', 'Colors.gray')
  $content = $content.Replace("'#6b7280'", 'Colors.gray')
  # ---------- Light gray / borders ----------
  $content = $content.Replace("'#E5E7EB'", 'Colors.lightGray')
  $content = $content.Replace('"#E5E7EB"', 'Colors.lightGray')
  $content = $content.Replace("'#e5e7eb'", 'Colors.lightGray')
  # ---------- White ----------
  $content = $content.Replace("'#FFFFFF'", 'Colors.white')
  $content = $content.Replace('"#FFFFFF"', 'Colors.white')
  $content = $content.Replace("'#ffffff'", 'Colors.white')
  $content = $content.Replace('"#ffffff"', 'Colors.white')
  # ---------- Black ----------
  $content = $content.Replace("'#000000'", 'Colors.black')
  $content = $content.Replace('"#000000"', 'Colors.black')

  # Count rough changes
  $changes = 0
  $patternList = @('Colors.primary','Colors.primaryLight','Colors.primaryDark','Colors.secondary','Colors.success','Colors.error','Colors.background','Colors.dark','Colors.gray','Colors.lightGray','Colors.white','Colors.black')
  foreach ($p in $patternList) {
    $changes += ([regex]::Matches($content, [regex]::Escape($p))).Count - ([regex]::Matches($original, [regex]::Escape($p))).Count
  }

  if ($content -ne $original) {
    [System.IO.File]::WriteAllText($fullPath, $content, [System.Text.Encoding]::UTF8)
    $results += [PSCustomObject]@{ File=$file; Status='UPDATED'; Import=$addedImport; Changes=$changes }
  } else {
    $results += [PSCustomObject]@{ File=$file; Status='NO_CHANGE'; Import=$false; Changes=0 }
  }
}

Write-Host "`n=== Color Standardization Results ==="
$results | Format-Table File, Status, Import, Changes -AutoSize
Write-Host "Done."
