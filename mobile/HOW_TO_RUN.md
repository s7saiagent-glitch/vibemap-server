# كيف تشغّل VibeMap AR على جوالك

## الخطوة 1 — حمّل تطبيق Expo Go
- **أندرويد**: https://play.google.com/store/apps/details?id=host.exp.exponent
- **آيفون**: https://apps.apple.com/app/expo-go/id982107779

## الخطوة 2 — ثبّت Node.js على حاسوبك
- من الموقع: https://nodejs.org  (اضغط "LTS")

## الخطوة 3 — افتح Terminal/Command Prompt وشغّل:
```
cd vibemap-mobile
npm install
npx expo start --tunnel
```

## الخطوة 4 — امسح الـ QR Code
- **أندرويد**: افتح Expo Go وامسح الـ QR
- **آيفون**: افتح كاميرا الجوال وامسح الـ QR

---

## لبناء APK (أندرويد) للتوزيع:
```
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```
الـ APK يُرفع تلقائياً إلى Expo وتحصل على رابط التحميل.

## لبناء IPA (آيفون):
```
eas build --platform ios --profile preview
```
تحتاج حساب Apple Developer ($99/سنة).
