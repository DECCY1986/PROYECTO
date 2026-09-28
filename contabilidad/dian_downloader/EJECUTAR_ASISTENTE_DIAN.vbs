Set WshShell = CreateObject("WScript.Shell")
Dim scriptDir
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Lanzar CMD visible ejecutando 2_ejecutar_descarga.bat o python directamente
WshShell.Run "cmd.exe /k ""cd /d """ & scriptDir & """ && python dian_downloader.py""", 1, False
