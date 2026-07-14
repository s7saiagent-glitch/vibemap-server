const cron = require('node-cron');
const pool = require('../db/pool');
const messagesDb = require('../db/messages');
const audioStorage = require('../services/audioStorage');

// يحذف الرسائل الصوتية المنتهية (حسب حد باقة المنشأة) وملفاتها من القرص
async function pruneExpiredMessages() {
  const expired = await messagesDb.findExpired();
  if (!expired.length) return;
  for (const message of expired) {
    await audioStorage.deleteAudioFile(message.audio_path);
  }
  await messagesDb.deleteByIds(expired.map((m) => m.id));
  console.log(`[تنظيف] حُذفت ${expired.length} رسالة صوتية منتهية`);
}

// يحذف القنوات المؤقتة المنتهية (48 ساعة) مع رسائلها وملفاتها (CASCADE بقاعدة البيانات)
async function pruneExpiredTemporaryChannels() {
  const { rows } = await pool.query(
    `SELECT id FROM channels WHERE type = 'temporary' AND expires_at <= now()`
  );
  if (!rows.length) return;
  for (const channel of rows) {
    const { rows: msgs } = await pool.query('SELECT audio_path FROM messages WHERE channel_id = $1', [channel.id]);
    for (const m of msgs) await audioStorage.deleteAudioFile(m.audio_path);
  }
  await pool.query(
    `DELETE FROM channels WHERE id = ANY($1::uuid[])`,
    [rows.map((r) => r.id)]
  );
  console.log(`[تنظيف] حُذفت ${rows.length} قناة مؤقتة منتهية`);
}

function startCleanupJobs() {
  // كل 15 دقيقة
  cron.schedule('*/15 * * * *', async () => {
    try {
      await pruneExpiredMessages();
      await pruneExpiredTemporaryChannels();
    } catch (err) {
      console.error('فشل مهمة التنظيف الدورية:', err);
    }
  });
}

module.exports = { startCleanupJobs, pruneExpiredMessages, pruneExpiredTemporaryChannels };
