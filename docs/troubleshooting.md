# Troubleshooting

**The game won't launch / "me3 executable not found"**
me3 ships bundled inside the app — this usually means the install is damaged or incomplete. Try reinstalling Elden Mod Manager from the latest [release](https://github.com/Mkeefeus/Elden-Mod-Manager/releases).

**A Nexus download never shows up**
Make sure you clicked **Manual Download** on the Nexus mod page, not "Vortex" or "Mod Manager Download." The app can't handle `nxm://` links — see [Get Mods & Nexus Integration](get-mods-and-nexus.md#nexus-mods-tab).

**Can't change the Mods/Tools folder**
The destination folder must be empty before you can move your mods/tools there. Pick an empty folder, or empty out the target folder first.

**A mod's DLL or executable wasn't auto-filled in the Configure Mod form**
Auto-detection only kicks in when there's exactly one matching file (`.dll` or the executable) in the extracted folder. If there's more than one, or none, set the field manually.

**"No mods are enabled in the active profile" in the Load Order window**
Load Order only shows mods that are already enabled. Enable at least one mod's checkbox on the Mods page first.

**"Edit Profile Settings" is missing or greyed out for a mod**
This option only appears for **Native** (DLL) mods, and it's only clickable once that mod is **enabled** in the active profile.

**"Edit INI Files" doesn't show up for a mod**
It only appears when the mod's installed folder actually contains `.ini` files.

**An imported profile shows mods as "Not Installed"**
See [Importing a Profile](profiles.md#importing-a-profile) — either match them to an already-installed mod, or use the **Get Mods** shortcut in the import modal to install them before completing the import. You can also complete the import anyway; unmatched mods just won't be included.

**A Windows tool (.exe) won't launch on Linux**
This usually means Elden Ring's Proton prefix, or a matching Proton build, couldn't be found. See [Linux Support](linux.md#running-windows-only-tools) for what's required.

**Where are the logs?**
Easiest way: open the menu bar and go to **Help → Collect Logs**. This zips your logs, `config.json`, and a listing of your Elden Ring install's files into `emm-logs.zip` on your Desktop — attach that when reporting a bug.

You can also get to the raw log file directly: it's named `EMM.log` in your OS's standard application-log directory (e.g. `%USERPROFILE%\AppData\Roaming\elden-mod-manager\logs` on Windows, `~/.config/elden-mod-manager/logs` on Linux), or open it via **Go → AppData Folder** in the menu bar.

**Still stuck?**
Open an issue on [GitHub Issues](https://github.com/Mkeefeus/Elden-Mod-Manager/issues) (or use **Help → Bug Report** in the menu bar) with details about your setup and, if relevant, the logs from Collect Logs above.
