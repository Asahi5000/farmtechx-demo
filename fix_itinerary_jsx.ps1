$fp = 'C:\Users\Admin\Downloads\LayasPinas\app\itinerary\[id].tsx'
$c = [System.IO.File]::ReadAllText($fp, [System.Text.Encoding]::UTF8)
$count = ([regex]::Matches($c, '=Colors\.\w+')).Count
$fixed = [regex]::Replace($c, '=Colors\.(\w+)', '={Colors.$1}')
if ($fixed -ne $c) {
  [System.IO.File]::WriteAllText($fp, $fixed, [System.Text.Encoding]::UTF8)
  Write-Host "FIXED $count JSX props in itinerary/[id].tsx"
} else {
  Write-Host "CLEAN - no bare =Colors. props found in itinerary/[id].tsx"
}
