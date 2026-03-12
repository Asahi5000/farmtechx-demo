$src = 'C:\Users\Admin\Downloads\LayasPinas\app\itinerary\[id].tsx'
$importLine = "import { Colors } from '@/constants/Colors';"
$original = [System.IO.File]::ReadAllText($src, [System.Text.Encoding]::UTF8)
$content = $original

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
  }
}

$content = $content.Replace("'#1EABAB'", 'Colors.primary')
$content = $content.Replace('"#1EABAB"', 'Colors.primary')
$content = $content.Replace("'#0D9488'", 'Colors.primary')
$content = $content.Replace('"#0D9488"', 'Colors.primary')
$content = $content.Replace("'#10B981'", 'Colors.success')
$content = $content.Replace('"#10B981"', 'Colors.success')
$content = $content.Replace("'#F59E0B'", 'Colors.secondary')
$content = $content.Replace('"#F59E0B"', 'Colors.secondary')
$content = $content.Replace("'#EF4444'", 'Colors.error')
$content = $content.Replace('"#EF4444"', 'Colors.error')
$content = $content.Replace("'#F9FAFB'", 'Colors.background')
$content = $content.Replace('"#F9FAFB"', 'Colors.background')
$content = $content.Replace("'#1F2937'", 'Colors.dark')
$content = $content.Replace('"#1F2937"', 'Colors.dark')
$content = $content.Replace("'#6B7280'", 'Colors.gray')
$content = $content.Replace('"#6B7280"', 'Colors.gray')
$content = $content.Replace("'#E5E7EB'", 'Colors.lightGray')
$content = $content.Replace('"#E5E7EB"', 'Colors.lightGray')
$content = $content.Replace("'#FFFFFF'", 'Colors.white')
$content = $content.Replace('"#FFFFFF"', 'Colors.white')
$content = $content.Replace("'#ffffff'", 'Colors.white')
$content = $content.Replace("'#000000'", 'Colors.black')
$content = $content.Replace('"#000000"', 'Colors.black')
$content = $content.Replace("'#0FA3E2'", 'Colors.primary')
$content = $content.Replace('"#0FA3E2"', 'Colors.primary')

if ($content -ne $original) {
  [System.IO.File]::WriteAllText($src, $content, [System.Text.Encoding]::UTF8)
  Write-Host "itinerary/[id].tsx UPDATED"
} else {
  Write-Host "itinerary/[id].tsx NO CHANGE"
}
