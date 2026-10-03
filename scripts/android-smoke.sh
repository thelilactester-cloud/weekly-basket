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
# uiautomator sometimes reports "could not get idle state" on a busy emulator: try a few times and keep its messages.
for i in 1 2 3 4 5; do
  adb shell uiautomator dump /sdcard/ui.xml >> smoke/uiautomator.txt 2>&1 \
    && adb pull /sdcard/ui.xml smoke/ui.xml >/dev/null 2>&1 && grep -q '<hierarchy' smoke/ui.xml && break
  sleep 4
done
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
# WebView text shows up as text="…" or, for some elements, as content-desc="…" (what screen readers read).
grep -o '\(text\|content-desc\)="[^"]\+"' smoke/ui.xml 2>/dev/null | head -40
echo "($(grep -o '<node ' smoke/ui.xml 2>/dev/null | wc -l) elements on screen)"
grep -q '="[^"]*\(Prepcart\|Where do you shop\)' smoke/ui.xml 2>/dev/null || {
  echo "The app opened but its screen is empty (or could not be read)."
  echo "── uiautomator ──"; cat smoke/uiautomator.txt
  echo "── screen dump (start) ──"; head -c 3000 smoke/ui.xml 2>/dev/null; echo
  echo "── app messages ──"; grep -i "console\|chromium" smoke/logcat.txt | grep -v "Handling local request" | tail -30
  exit 1
}
echo "OK: the app opened and shows its first screen."
