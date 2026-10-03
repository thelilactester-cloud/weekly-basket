#!/usr/bin/env bash
# Starts the Android test app on an emulator and checks that it opens and shows the app.
# Used by .github/workflows/publish.yml (job: android-smoke). Writes smoke/ (logcat, screenshot, screen text).
set -u
APK="${1:-prepcart.apk}"
PKG=com.prepcart.app
mkdir -p smoke
adb install -r "$APK" || exit 1
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 25
adb exec-out screencap -p > smoke/screen.png
adb logcat -d > smoke/logcat.txt
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 && adb pull /sdcard/ui.xml smoke/ui.xml >/dev/null 2>&1
echo "── crash check ──"
if grep -q "FATAL EXCEPTION" smoke/logcat.txt; then
  grep -A25 "FATAL EXCEPTION" smoke/logcat.txt | head -40
  echo "The app crashed on start."
  exit 1
fi
if [ -z "$(adb shell pidof "$PKG")" ]; then
  echo "The app is not running after start."
  tail -60 smoke/logcat.txt
  exit 1
fi
echo "── text on screen ──"
grep -o 'text="[^"]\+"' smoke/ui.xml 2>/dev/null | sed 's/text=//' | head -25
grep -q 'Prepcart\|Where do you shop' smoke/ui.xml 2>/dev/null || { echo "The app opened but its screen is empty."; grep -i "console\|chromium\|capacitor" smoke/logcat.txt | tail -30; exit 1; }
echo "OK: the app opened and shows its first screen."
