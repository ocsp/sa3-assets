Write-Host("cwebp running in lossless mode")
Write-Host("in which a small quality factor enables faster compression speed but produces a larger file")
Write-Host("maximum compression is achieved by using a value of 100 (default)")
Write-Host("")
Get-ChildItem -Path .\* -Include *.jpg, *.png | ForEach-Object -Process {
    $oldName = $_.Name
    $newName = $_.BaseName + ".webp"
    cwebp.exe -lossless -q 100 $oldName -o $newName
}
Pause
