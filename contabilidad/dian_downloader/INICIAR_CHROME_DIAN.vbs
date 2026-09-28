Set WshShell = CreateObject("WScript.Shell")
Dim fso, debugDir, chromePath

Set fso = CreateObject("Scripting.FileSystemObject")
debugDir = WshShell.ExpandEnvironmentStrings("%TEMP%") & "\chrome_dian_debug"

If Not fso.FolderExists(debugDir) Then
    fso.CreateFolder(debugDir)
End If

' Buscar Chrome
chromePath = ""
If fso.FileExists("C:\Program Files\Google\Chrome\Application\chrome.exe") Then
    chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
ElseIf fso.FileExists("C:\Program Files (x86)\Google\Chrome\Application\chrome.exe") Then
    chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
ElseIf fso.FileExists(WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\Application\chrome.exe") Then
    chromePath = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\Application\chrome.exe"
End If

If chromePath <> "" Then
    WshShell.Run """" & chromePath & """" & " --remote-debugging-port=9222 --user-data-dir=""" & debugDir & """ ""https://catalogo-vpfe.dian.gov.co""", 1, False
Else
    WshShell.Run "chrome.exe --remote-debugging-port=9222 --user-data-dir=""" & debugDir & """ ""https://catalogo-vpfe.dian.gov.co""", 1, False
End If
