# Fix malformed Colors import insertions across all app files.
# The original script used '^import ' to detect the last import line, which
# doesn't match the CLOSING line of multi-line imports (e.g. '} from ...;').
# This script: removes the Colors import from wherever it is, finds the TRUE
# last import ending line (matching '^import ' OR '^} from '), then reinserts.

$importLine = "import { Colors } from '@/constants/Colors';"

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
  'C:\Users\Admin\Downloads\LayasPinas\components\CustomTabBar.tsx'
)

foreach ($fp in $files) {
  if (!(Test-Path $fp)) { Write-Host "SKIP (not found): $fp"; continue }

  $original = [System.IO.File]::ReadAllText($fp, [System.Text.Encoding]::UTF8)

  # If Colors import not present, skip
  if ($original -notmatch [regex]::Escape($importLine)) {
    Write-Host "NO COLORS IMPORT: $fp"
    continue
  }

  # Split to lines (handle both CRLF and LF)
  $crlf = $original -match "`r`n"
  $lines = $original -split "`r?`n"

  # Step 1: Remove the Colors import line from wherever it is
  $colorsIdx = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Trim() -eq $importLine.Trim()) {
      $colorsIdx = $i
      break
    }
  }

  if ($colorsIdx -lt 0) {
    Write-Host "COLORS IMPORT NOT FOUND AS FULL LINE in: $fp"
    continue
  }

  $linesList = [System.Collections.Generic.List[string]]$lines
  $linesList.RemoveAt($colorsIdx)
  $lines = $linesList.ToArray()

  # Step 2: Find true last import ending line
  # Match lines that END an import block: 
  #   - Single-line: starts with 'import ' and ends with ';'
  #   - Multi-line closing: starts with '} from ' and ends with ';'
  $lastImportEnd = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $trimmed = $lines[$i].Trim()
    if (($trimmed -match "^import .+;$") -or
        ($trimmed -match "^import \{.*\}.*from .+;$") -or
        ($trimmed -match "^\} from ['""].+['""];?$")) {
      $lastImportEnd = $i
    }
  }

  if ($lastImportEnd -lt 0) {
    Write-Host "COULD NOT FIND END OF IMPORTS: $fp"
    continue
  }

  # Step 3: Insert Colors import right after the last import end
  $linesList = [System.Collections.Generic.List[string]]$lines
  $linesList.Insert($lastImportEnd + 1, $importLine)
  $lines = $linesList.ToArray()

  $sep = if ($crlf) { "`r`n" } else { "`n" }
  $newContent = $lines -join $sep

  if ($newContent -ne $original) {
    [System.IO.File]::WriteAllText($fp, $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "FIXED: $fp (was at line $($colorsIdx + 1), moved to line $($lastImportEnd + 2))"
  } else {
    Write-Host "ALREADY OK: $fp"
  }
}

# Handle itinerary separately due to bracket in path
$itinerary = 'C:\Users\Admin\Downloads\LayasPinas\app\itinerary\[id].tsx'
if (Test-Path $itinerary) {
  $original = [System.IO.File]::ReadAllText($itinerary, [System.Text.Encoding]::UTF8)
  if ($original -match [regex]::Escape($importLine)) {
    $crlf = $original -match "`r`n"
    $lines = $original -split "`r?`n"
    $colorsIdx = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
      if ($lines[$i].Trim() -eq $importLine.Trim()) { $colorsIdx = $i; break }
    }
    if ($colorsIdx -ge 0) {
      $linesList = [System.Collections.Generic.List[string]]$lines
      $linesList.RemoveAt($colorsIdx)
      $lines = $linesList.ToArray()
      $lastImportEnd = -1
      for ($i = 0; $i -lt $lines.Count; $i++) {
        $trimmed = $lines[$i].Trim()
        if (($trimmed -match "^import .+;$") -or ($trimmed -match "^\} from ['""].+['""];?$")) {
          $lastImportEnd = $i
        }
      }
      if ($lastImportEnd -ge 0) {
        $linesList = [System.Collections.Generic.List[string]]$lines
        $linesList.Insert($lastImportEnd + 1, $importLine)
        $sep = if ($crlf) { "`r`n" } else { "`n" }
        $newContent = $linesList.ToArray() -join $sep
        if ($newContent -ne $original) {
          [System.IO.File]::WriteAllText($itinerary, $newContent, [System.Text.Encoding]::UTF8)
          Write-Host "FIXED: itinerary/[id].tsx (moved to after line $($lastImportEnd + 1))"
        } else {
          Write-Host "ALREADY OK: itinerary/[id].tsx"
        }
      }
    }
  } else {
    Write-Host "NO COLORS IMPORT: itinerary/[id].tsx"
  }
}

Write-Host "`nDone. Verify the app compiles now."
