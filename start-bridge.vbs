' Starts the bridge without opening a console window, and starts it again if it ever exits.
' Paths are resolved from this file's own location, so the project can live anywhere.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
bridgeDir = fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), "bridge")
sh.CurrentDirectory = bridgeDir
Do
  sh.Run "node """ & fso.BuildPath(bridgeDir, "index.js") & """", 0, True
  WScript.Sleep 5000
Loop
