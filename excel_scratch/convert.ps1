$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$workbook = $excel.Workbooks.Open("C:\Users\Janus\Downloads\flujo de caja 2025 a 12 marzo 2026.xlsx")
foreach ($worksheet in $workbook.Worksheets) {
    $sheetName = $worksheet.Name
    $csvPath = "C:\Users\Janus\PROYECTO\excel_scratch\sheet_$($sheetName).csv"
    $worksheet.SaveAs($csvPath, 6) # 6 is CSV
}
$workbook.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
