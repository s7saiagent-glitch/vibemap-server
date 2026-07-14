const sanitizeHtml = require('sanitize-html');

const STRIP_ALL = { allowedTags: [], allowedAttributes: {} };

function cleanValue(value) {
  if (typeof value === 'string') {
    return sanitizeHtml(value, STRIP_ALL).trim();
  }
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) out[key] = cleanValue(value[key]);
    return out;
  }
  return value;
}

// يعقّم كل النصوص بجسم الطلب لمنع XSS/HTML injection قبل أي معالجة
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanValue(req.body);
  }
  next();
}

module.exports = { sanitizeBody, cleanValue };
