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
Filename: "{cmd}"; Parameters: "/C taskkill /IM {#MyAppExeName} /F"; Flags: runhidden
; Launch immediately after install so scanning unlocks without a reboot.
Filename: "{app}\{#MyAppExeName}"; Description: "Start {#MyAppName} now"; \
    Flags: nowait postinstall skipifsilent runasoriginaluser

[UninstallRun]
; Best-effort: stop the running agent before removing files.
Filename: "{cmd}"; Parameters: "/C taskkill /IM {#MyAppExeName} /F"; Flags: runhidden; RunOnceId: "StopAgent"

[Code]
// Optional Vatech EzWebServer REST credentials, prompted once at install time
// and written to {app}\.env (agent/config.py loads this — see README.md's
// ".env file" section). Every clinic has its own EzDent-i user account, so
// this can't be baked into the installer itself; it has to be asked per
// install. Left blank, the agent falls back to watching the local export
// folder instead — this is optional, never a hard requirement to finish
// installing.
var
  CredsPage: TInputQueryWizardPage;

function EnvFileExists: Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\.env'));
end;

procedure InitializeWizard;
begin
  // NOTE: {app} isn't expandable yet this early (Inno raises "attempt to
  // expand the app constant before it was initialized" if you try) — the
  // EnvFileExists check has to happen later, in ShouldSkipPage below, not
  // here. This just creates the page unconditionally.
  CredsPage := CreateInputQueryPage(wpSelectTasks,
    'Vatech EzDent-i Account (optional)',
    'Enter a real EzDent-i user account for this clinic, if you have one ready.',
    'This lets the agent detect captures via Vatech''s own REST API instead of ' +
    'watching local files on this PC -- more reliable, but entirely optional. ' +
    'Leave both fields blank to skip; you can add this later by editing ".env" ' +
    'next to the installed program, or by re-running this installer.' + #13#10#13#10 +
    'Create this account inside EzDent-i itself: Settings > Environment > General ' +
    '> USER ACCOUNT MANAGER. Use a dedicated account for the agent, not a staff ' +
    'member''s personal login -- easier to rotate or revoke later without ' +
    'affecting anyone''s own access.');
  CredsPage.Add('Username (e.g. Master Admin):', False);
  CredsPage.Add('Password:', True);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  Username, Password: String;
begin
  Result := True;
  if (CredsPage = nil) or (CurPageID <> CredsPage.ID) then
    Exit;

  Username := Trim(CredsPage.Values[0]);
  Password := CredsPage.Values[1];
  if (Username <> '') and (Password = '') then
  begin
    MsgBox('Enter a password too, or clear the username to skip this step.', mbError, MB_OK);
    Result := False;
  end
  else if (Username = '') and (Password <> '') then
  begin
    MsgBox('Enter a username too, or clear the password to skip this step.', mbError, MB_OK);
    Result := False;
  end;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  // An existing .env means this is a reinstall/upgrade over an already-
  // configured agent — don't re-prompt and risk an accidental blank
  // overwrite of a working setup. {app} is safely expandable by this point.
  if (CredsPage <> nil) and (PageID = CredsPage.ID) then
    Result := EnvFileExists;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Username, Password: String;
  EnvLines: TArrayOfString;
begin
  if (CurStep <> ssPostInstall) or (CredsPage = nil) then
    Exit;

  Username := Trim(CredsPage.Values[0]);
  Password := CredsPage.Values[1];
  if (Username = '') or (Password = '') then
    Exit; // skipped -- agent falls back to folder-watch mode, no .env needed

  SetArrayLength(EnvLines, 2);
  // Quoted: dotenv strips matching quotes and preserves the value exactly,
  // including any special characters (@, #, spaces, ...) without needing
  // shell-style escaping -- the whole reason this is a file, not a prompt
  // asking someone to type `set VAR=...` correctly.
  EnvLines[0] := 'DENTC_AGENT_VATECH_REST_USERNAME="' + Username + '"';
  EnvLines[1] := 'DENTC_AGENT_VATECH_REST_PASSWORD="' + Password + '"';
  SaveStringsToFile(ExpandConstant('{app}\.env'), EnvLines, False);
end;
