' Starts the bridge without opening a console window.
' Paths are resolved from this file's own location, so the project can live anywhere.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
bridgeDir = fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), "bridge")
sh.CurrentDirectory = bridgeDir
sh.Run "node """ & fso.BuildPath(bridgeDir, "index.js") & """", 0, False
