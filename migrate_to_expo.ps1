# Eazy-pay Migration Script
echo "🧹 Cleaning up old project files..."
Remove-Item -Recurse -Force android, ios, capacitor.config.ts, package-lock.json -ErrorAction SilentlyContinue

echo "🚀 Initializing Native Android structure for Expo..."
cd mobile
npx expo prebuild --platform android --no-install --non-interactive

echo "📲 Migrating Android Widget files..."
$native_res = "android/app/src/main/res"
$native_java = "android/app/src/main/java/com/eazypay/app"

# Ensure directories exist
New-Item -ItemType Directory -Force -Path "$native_res/layout", "$native_res/xml", "$native_res/drawable"

# Restore Widget Files
Get-Content -Path "../widget_backup_layout.xml" | Set-Content -Path "$native_res/layout/quick_buy_widget.xml"
Get-Content -Path "../widget_backup_info.xml" | Set-Content -Path "$native_res/xml/quick_buy_widget_info.xml"
Get-Content -Path "../widget_backup_bg.xml" | Set-Content -Path "$native_res/drawable/widget_background.xml"
Get-Content -Path "../widget_backup_prov.java" | Set-Content -Path "$native_java/QuickBuyWidget.java"

echo "✅ Migration Complete!"
echo "📦 To build your APK, run: eas build -p android --profile preview"
