const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const env = require('../config/env');

function extFromMime(mime) {
  if (!mime) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4')) return 'm4a';
  return 'webm';
}

async function saveAudioBuffer({ channelId, buffer, mimeType }) {
  const dir = path.join(process.cwd(), env.audioUploadDir, channelId);
  await fs.promises.mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${extFromMime(mimeType)}`;
  const fullPath = path.join(dir, filename);
  await fs.promises.writeFile(fullPath, buffer);
  const relativePath = path.join(env.audioUploadDir, channelId, filename);
  return relativePath;
}

async function deleteAudioFile(relativePath) {
  try {
    await fs.promises.unlink(path.join(process.cwd(), relativePath));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

module.exports = { saveAudioBuffer, deleteAudioFile };
