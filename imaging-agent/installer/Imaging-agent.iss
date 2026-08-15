; DentC Imaging Agent installer.
;
; Per-user, no-admin install (PrivilegesRequired=lowest + an install dir under
; %LocalAppData%, not Program Files — Program Files needs elevation, which
; contradicts BUILD.md's "no admin needed" goal). Registers the agent to
; auto-start via the HKCU Run key and launches it immediately after install,
; matching imaging-agent/BUILD.md steps 2-3.
;
; Build with (after installing Inno Setup 6): ISCC Imaging-agent.iss
; Output: installer\Output\Imaging-agent-Setup.exe

#define MyAppName "DentC Imaging Agent"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "DentC"
#define MyAppExeName "Imaging-agent.exe"

[Setup]
AppId={{9E6F2C2B-6C0A-4C2E-9C6E-DENTC-IMAGING-AGENT}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\DentC
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=Output
OutputBaseFilename=Imaging-agent-Setup
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
DisableWelcomePage=no
DisableDirPage=yes
DisableReadyPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
; Per-user auto-start (HKCU, not HKLM — no admin needed).
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
    ValueType: string; ValueName: "DentCImagingAgent"; \
    ValueData: """{app}\{#MyAppExeName}"""; Flags: uninsdeletevalue

[Run]
; A previous install's agent may still be running (auto-started via the Run
; key from an earlier session) — stop it first so the freshly installed
; version ends up the only one running, not a stale one still holding the
; port. Also covers `_take_over_port` in agent/__main__.py itself as a
; second line of defense (e.g. a manual double-click while one's already
; running).
Filename: "{cmd}"; Parameters: "/C taskkill /IM {#MyAppExeName} /F"; \
    Flags: runhidden; RunOnceId: "StopPreviousAgent"
; Launch immediately after install so scanning unlocks without a reboot.
Filename: "{app}\{#MyAppExeName}"; Description: "Start {#MyAppName} now"; \
    Flags: nowait postinstall skipifsilent runasoriginaluser

[UninstallRun]
; Best-effort: stop the running agent before removing files.
Filename: "{cmd}"; Parameters: "/C taskkill /IM {#MyAppExeName} /F"; Flags: runhidden; RunOnceId: "StopAgent"
