const { Pool } = require('pg');

// يقرأ إعدادات الاتصال من متغيرات البيئة القياسية PG* تلقائياً
const pool = new Pool();

pool.on('error', (err) => {
  console.error('خطأ غير متوقع باتصال قاعدة البيانات:', err);
});

module.exports = pool;
