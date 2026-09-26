# VibeMap — نسخة الويب

هذا الفرع فيه نسخة الويب من تطبيق VibeMap وسكربت الرفع على السيرفر.

## الرفع أو التحديث على السيرفر
من طرفية السيرفر (root):

```bash
curl -fsSL https://raw.githubusercontent.com/s7saiagent-glitch/vibemap-server/vibemap-web/deploy.sh | bash -s -- DOMAIN
```

استبدل DOMAIN بالدومين (مثال: vibemap.s7sai.cloud). نفس الأمر يحدّث الموقع لأي إصدار جديد، ويحتفظ بآخر 3 نسخ احتياطية في /var/www/vibemap.
