#!/bin/bash
# Installs Elden Mod Manager on Steam Deck: downloads the latest Linux release
# (or uses a local build, for testing — see --zip/--dir below), installs it
# under ~/.local/share, creates a launch wrapper with the flags needed for the
# on-screen keyboard/overlay to work under gamescope, and (re)registers it as
# a non-Steam game for every local Steam user profile.
set -euo pipefail

REPO_OWNER="Mkeefeus"
REPO_NAME="Elden-Mod-Manager"
ASSET_PATTERN='^eldenmodmanager-.*-linux-portable-x64\.zip$'

APP_DISPLAY_NAME="Elden Mod Manager"
INSTALL_DIR="$HOME/.local/share/elden-mod-manager"
EXECUTABLE_PATH="$INSTALL_DIR/elden-mod-manager"
WRAPPER_PATH="$INSTALL_DIR/launch.sh"
LOG_DIR="$HOME/.config/elden-mod-manager/logs"
LOG_FILE="$LOG_DIR/steam-launch.log"

log() { echo "[install-steamdeck] $*"; }
die() {
  echo "[install-steamdeck] ERROR: $*" >&2
  exit 1
}
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "Required command '$1' not found."; }

usage() {
  cat <<'USAGE'
Usage: install-steamdeck.sh [--zip PATH | --dir PATH]

  --zip PATH   Install from a local release zip instead of downloading the
               latest GitHub release (e.g. a build produced by `pnpm make`).
  --dir PATH   Install from a local, already-extracted build directory
               instead of downloading (e.g. `out/Elden Mod Manager-linux-x64`).
  -h, --help   Show this help.

With no arguments, downloads and installs the latest published GitHub release.
USAGE
}

LOCAL_ZIP=""
LOCAL_DIR=""
while [ $# -gt 0 ]; do
  case "$1" in
    --zip)
      [ $# -ge 2 ] || die "--zip requires a path argument"
      LOCAL_ZIP="$2"
      shift 2
      ;;
    --dir)
      [ $# -ge 2 ] || die "--dir requires a path argument"
      LOCAL_DIR="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "Unknown argument: $1"
      ;;
  esac
done

[ -z "$LOCAL_ZIP" ] || [ -z "$LOCAL_DIR" ] || die "--zip and --dir are mutually exclusive"

require_cmd python3
require_cmd curl

TMP_DIR=$(mktemp -d)
STEAM_WAS_RUNNING=0

cleanup() {
  rm -rf "$TMP_DIR"
  # Not relaunching Steam ourselves: Steam has a known upstream bug where it
  # re-requests screen-sharing/PipeWire permission on every launch regardless
  # of how it's started (https://github.com/ValveSoftware/steam-for-linux/issues/8098),
  # so there's no launch mechanism from here that avoids it. Leave restarting
  # it to the user.
  if [ "$STEAM_WAS_RUNNING" -eq 1 ]; then
    log "Steam was closed to update shortcuts.vdf safely — please reopen it yourself."
  fi
}
trap cleanup EXIT

# --- 1. Obtain the release: local dir, local zip, or latest from GitHub ----

COPY_INSTALL=0

if [ -n "$LOCAL_DIR" ]; then
  [ -d "$LOCAL_DIR" ] || die "Local directory not found: $LOCAL_DIR"
  log "Using local build directory: $LOCAL_DIR"
  EXTRACT_DIR="$LOCAL_DIR"
  COPY_INSTALL=1
else
  if [ -n "$LOCAL_ZIP" ]; then
    [ -f "$LOCAL_ZIP" ] || die "Local zip not found: $LOCAL_ZIP"
    log "Using local release zip: $LOCAL_ZIP"
    ZIP_PATH="$LOCAL_ZIP"
  else
    log "Querying latest release from GitHub..."
    RELEASE_JSON=$(curl -fsSL "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest") || die "Failed to query latest release from GitHub API"

    DOWNLOAD_URL=$(printf '%s' "$RELEASE_JSON" | python3 -c '
import json, re, sys
pattern = re.compile(sys.argv[1])
data = json.load(sys.stdin)
for asset in data.get("assets", []):
    if pattern.match(asset["name"]):
        print(asset["browser_download_url"])
        break
' "$ASSET_PATTERN")

    [ -n "$DOWNLOAD_URL" ] || die "Could not find a linux-portable-x64 release asset. Is the latest release published (not a draft)?"

    ZIP_PATH="$TMP_DIR/release.zip"
    log "Downloading $DOWNLOAD_URL"
    curl -fL --progress-bar -o "$ZIP_PATH" "$DOWNLOAD_URL" || die "Download failed for $DOWNLOAD_URL"
  fi

  EXTRACT_DIR="$TMP_DIR/extracted"
  mkdir -p "$EXTRACT_DIR"
  python3 -c '
import sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    z.extractall(sys.argv[2])
' "$ZIP_PATH" "$EXTRACT_DIR"
fi

# --- 2. Install ---------------------------------------------------------

# The release contents may or may not be wrapped in a single top-level folder
# depending on how they were packaged — handle either case.
ENTRIES=("$EXTRACT_DIR"/*)
if [ "${#ENTRIES[@]}" -eq 1 ] && [ -d "${ENTRIES[0]}" ]; then
  SOURCE_DIR="${ENTRIES[0]}"
else
  SOURCE_DIR="$EXTRACT_DIR"
fi

log "Installing to $INSTALL_DIR"
rm -rf "$INSTALL_DIR"
mkdir -p "$(dirname "$INSTALL_DIR")"
if [ "$COPY_INSTALL" -eq 1 ]; then
  # --dir points at a directory the caller likely wants to reuse (e.g. a
  # pnpm make output folder) — copy it rather than moving it away.
  cp -r "$SOURCE_DIR" "$INSTALL_DIR"
else
  mv "$SOURCE_DIR" "$INSTALL_DIR"
fi

[ -f "$EXECUTABLE_PATH" ] || die "Executable not found at $EXECUTABLE_PATH after extraction — unexpected release layout."
chmod +x "$EXECUTABLE_PATH"
chmod +x "$INSTALL_DIR"/resources/me3/linux/me3

# --- 3. Write the launch wrapper --------------------------------------------

mkdir -p "$LOG_DIR"
cat >"$WRAPPER_PATH" <<EOF
#!/bin/bash
# Generated by install-steamdeck.sh — re-run that script to regenerate.
mkdir -p "$LOG_DIR"
exec "$EXECUTABLE_PATH" --no-sandbox --disable-gpu-sandbox > "$LOG_FILE" 2>&1
EOF
chmod +x "$WRAPPER_PATH"
log "Wrapper written to $WRAPPER_PATH"

# --- 4. Register as a non-Steam game for every local user profile ----------

STEAM_ROOTS=()
for candidate in "$HOME/.local/share/Steam" "$HOME/.steam/steam" "$HOME/.steam/root"; do
  if [ -d "$candidate/userdata" ]; then
    STEAM_ROOTS+=("$(realpath "$candidate")")
  fi
done

if [ "${#STEAM_ROOTS[@]}" -eq 0 ]; then
  log "No Steam installation found — skipping non-Steam game registration."
  exit 0
fi

mapfile -t STEAM_ROOTS < <(printf '%s\n' "${STEAM_ROOTS[@]}" | sort -u)

USERDATA_DIRS=()
for root in "${STEAM_ROOTS[@]}"; do
  for d in "$root"/userdata/*/; do
    [ -d "$d" ] && USERDATA_DIRS+=("${d%/}")
  done
done

if [ "${#USERDATA_DIRS[@]}" -eq 0 ]; then
  log "No Steam user profiles found — skipping non-Steam game registration."
  exit 0
fi

# Steam's binary shortcuts.vdf format is handled via the vendored
# ValvePython/vdf library (MIT license; see vendor/vdf/NOTICE in this repo).
# Downloaded here at runtime rather than embedded/bundled, so this script
# stays a single plain file you can curl and run directly.
VDF_LIB_DIR="$TMP_DIR/vdf_lib"
mkdir -p "$VDF_LIB_DIR/vdf"
VDF_RAW_BASE="https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/steam-deck/vendor/vdf"
log "Downloading vdf library..."
curl -fsSL -o "$VDF_LIB_DIR/vdf/__init__.py" "$VDF_RAW_BASE/__init__.py" || die "Failed to download vendor/vdf/__init__.py"
curl -fsSL -o "$VDF_LIB_DIR/vdf/vdict.py" "$VDF_RAW_BASE/vdict.py" || die "Failed to download vendor/vdf/vdict.py"

# Reads (and, in "write" mode, updates) a shortcuts.vdf's entry for
# app_name, matched by AppName. Reused for both the up-front "does anything
# actually need to change" check and the real update, so the two can never
# disagree about what counts as "up to date".
SHORTCUT_SCRIPT='
import sys, os, binascii
import vdf

def generate_appid(exe, name):
    crc = binascii.crc32((exe + name).encode("utf-8")) & 0xffffffff
    top = crc | 0x80000000
    return top - 0x100000000 if top >= 0x80000000 else top

def build_entry(app_name, exe_value, start_dir_value):
    return {
        "appid": generate_appid(exe_value, app_name),
        "AppName": app_name,
        "Exe": exe_value,
        "StartDir": start_dir_value,
        "icon": "",
        "ShortcutPath": "",
        "LaunchOptions": "",
        "IsHidden": 0,
        "AllowDesktopConfig": 1,
        "AllowOverlay": 1,
        "OpenVR": 0,
        "Devkit": 0,
        "DevkitGameID": "",
        "DevkitOverrideAppID": 0,
        "LastPlayTime": 0,
        "FlatpakAppID": "",
        "tags": {},
    }

def load_shortcuts(vdf_path):
    if os.path.exists(vdf_path) and os.path.getsize(vdf_path) > 0:
        with open(vdf_path, "rb") as f:
            return vdf.binary_loads(f.read(), mapper=dict, merge_duplicate_keys=True)
    return {"shortcuts": {}}

def find_entry(shortcuts, app_name):
    for key, entry in shortcuts.items():
        if isinstance(entry, dict) and entry.get("AppName") == app_name:
            return key, entry
    return None, None

def main():
    mode, vdf_path, app_name, exe_path, start_dir = sys.argv[1:6]
    exe_value = "\"" + exe_path + "\""
    start_dir_value = "\"" + start_dir + "\""

    data = load_shortcuts(vdf_path)
    shortcuts = data.setdefault("shortcuts", {})
    existing_key, existing_entry = find_entry(shortcuts, app_name)

    up_to_date = (
        existing_entry is not None
        and existing_entry.get("Exe") == exe_value
        and existing_entry.get("StartDir") == start_dir_value
    )

    if mode == "check":
        print("up_to_date" if up_to_date else "needs_update")
        return

    if up_to_date:
        print("unchanged")
        return

    entry = build_entry(app_name, exe_value, start_dir_value)
    if existing_key is not None:
        shortcuts[existing_key] = entry
    else:
        shortcuts[str(len(shortcuts))] = entry

    with open(vdf_path, "wb") as f:
        f.write(vdf.binary_dumps(data))
    print("updated")

main()
'

DIRS_NEEDING_UPDATE=()
for userdata_dir in "${USERDATA_DIRS[@]}"; do
  vdf_path="$userdata_dir/config/shortcuts.vdf"
  status=$(PYTHONPATH="$VDF_LIB_DIR" python3 -c "$SHORTCUT_SCRIPT" check "$vdf_path" "$APP_DISPLAY_NAME" "$WRAPPER_PATH" "$INSTALL_DIR/" 2>/dev/null) || status="needs_update"
  if [ "$status" != "up_to_date" ]; then
    DIRS_NEEDING_UPDATE+=("$userdata_dir")
  fi
done

if [ "${#DIRS_NEEDING_UPDATE[@]}" -eq 0 ]; then
  log "Non-Steam game shortcut already up to date — nothing to do."
  exit 0
fi

log "Shortcut needs to be added/updated for ${#DIRS_NEEDING_UPDATE[@]} Steam profile(s)."

if command -v steam >/dev/null 2>&1 && pgrep -x steam >/dev/null 2>&1; then
  STEAM_WAS_RUNNING=1
  log "Closing Steam..."
  steam -shutdown >/dev/null 2>&1 || true
  for _ in $(seq 1 30); do
    pgrep -x steam >/dev/null 2>&1 || break
    sleep 1
  done
  if pgrep -x steam >/dev/null 2>&1; then
    die "Steam did not shut down in time — aborting shortcut registration so it doesn't overwrite our changes. Close Steam manually and re-run this script."
  fi
fi

for userdata_dir in "${DIRS_NEEDING_UPDATE[@]}"; do
  config_dir="$userdata_dir/config"
  mkdir -p "$config_dir"
  vdf_path="$config_dir/shortcuts.vdf"

  backup_path=""
  if [ -f "$vdf_path" ]; then
    backup_path="$vdf_path.bak.$(date +%Y%m%d%H%M%S)"
    cp "$vdf_path" "$backup_path"
    log "Backed up $vdf_path to $backup_path"
  fi

  log "Registering non-Steam game in $vdf_path"
  if ! PYTHONPATH="$VDF_LIB_DIR" python3 -c "$SHORTCUT_SCRIPT" write "$vdf_path" "$APP_DISPLAY_NAME" "$WRAPPER_PATH" "$INSTALL_DIR/"; then
    log "Failed to update $vdf_path"
    if [ -n "$backup_path" ]; then
      cp "$backup_path" "$vdf_path"
      log "Restored original file from backup"
    fi
    die "Aborting Steam shortcut registration due to an error updating $vdf_path"
  fi
done

log "Done. Elden Mod Manager should appear as a non-Steam game after Steam restarts."
