#!/usr/bin/env bash
# Patches the auto-generated iOS project so it matches feature parity with
# Android. Runs on Codemagic right after `npx cap add ios` / `cap sync ios`.
#
# Adds:
#   - NSCameraUsageDescription      (camera plugin)
#   - NSPhotoLibraryUsageDescription (photo picker)
#   - NSPhotoLibraryAddUsageDescription (saving photos)
#   - CFBundleURLTypes — registers cleverdog:// for Supabase deep links
#   - aps-environment entitlement — push notifications

set -euo pipefail

PLIST="ios/App/App/Info.plist"
ENTITLEMENTS="ios/App/App/App.entitlements"

if [ ! -f "$PLIST" ]; then
  echo "Info.plist not found at $PLIST — did 'cap add ios' run?"
  exit 1
fi

# Helper: add a string key if missing; replace if present.
upsert_string() {
  local key="$1"
  local value="$2"
  if /usr/libexec/PlistBuddy -c "Print :$key" "$PLIST" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Set :$key '$value'" "$PLIST"
  else
    /usr/libexec/PlistBuddy -c "Add :$key string '$value'" "$PLIST"
  fi
  echo "  [Info.plist] $key set"
}

upsert_string NSCameraUsageDescription \
  "CleverDog behöver tillgång till kameran för att du ska kunna ta foton på din hund."
upsert_string NSPhotoLibraryUsageDescription \
  "CleverDog behöver tillgång till dina foton för att du ska kunna välja en bild på din hund."
upsert_string NSPhotoLibraryAddUsageDescription \
  "CleverDog sparar foton du tar i din kamerarulle."

# CFBundleURLTypes for the cleverdog:// scheme.
if ! /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$PLIST" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$PLIST"
fi
# Replace any existing entries we might have written previously.
/usr/libexec/PlistBuddy -c "Delete :CFBundleURLTypes" "$PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLName string 'se.cleverdog.kundportal'" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string 'cleverdog'" "$PLIST"
echo "  [Info.plist] CFBundleURLTypes set for cleverdog://"

# Push notifications entitlement. Create the file if needed.
if [ ! -f "$ENTITLEMENTS" ]; then
  cat > "$ENTITLEMENTS" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>aps-environment</key>
  <string>production</string>
</dict>
</plist>
EOF
  echo "  [entitlements] created with aps-environment=production"
else
  if /usr/libexec/PlistBuddy -c "Print :aps-environment" "$ENTITLEMENTS" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Set :aps-environment production" "$ENTITLEMENTS"
  else
    /usr/libexec/PlistBuddy -c "Add :aps-environment string production" "$ENTITLEMENTS"
  fi
  echo "  [entitlements] aps-environment=production"
fi

# Background mode so push wakes the app.
if ! /usr/libexec/PlistBuddy -c "Print :UIBackgroundModes" "$PLIST" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes array" "$PLIST"
fi
# Add 'remote-notification' if missing.
if ! /usr/libexec/PlistBuddy -c "Print :UIBackgroundModes" "$PLIST" | grep -q 'remote-notification'; then
  /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes: string 'remote-notification'" "$PLIST"
  echo "  [Info.plist] UIBackgroundModes += remote-notification"
fi

echo "iOS config patched."
