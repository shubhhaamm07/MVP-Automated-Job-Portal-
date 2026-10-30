function safeApplicationUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ['gh_src', 'lever-source', 'source'].includes(key)) url.searchParams.delete(key);
    }
    url.hash = '';
    return url.href;
  } catch { return null; }
}

function plainText(value = '') {
  // Greenhouse escapes HTML; decode before removing tags. Render only as React text.
  const decode = text => text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code) => {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    if (code[0] !== '#') return named[code.toLowerCase()] ?? entity;
    const number = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '';
  });
  return decode(decode(String(value)))
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(?:p|div|h[1-6]|ul|ol|li|br)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim().slice(0, 80000);
}

function workplaceType(value = '') {
  if (/hybrid/i.test(value)) return 'Hybrid';
  if (/remote/i.test(value)) return 'Remote';
  if (/on[- ]?site/i.test(value)) return 'On-site';
  return 'Not specified';
}
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildQuery(params) {
  const filter = { active: { $ne: false } };
  const read = (key, max = 150) => {
    if (params[key] === undefined) return '';
    if (typeof params[key] !== 'string' || params[key].length > max) {
      const error = new Error(`Invalid ${key} parameter.`); error.status = 400; throw error;
    }
    return params[key].trim();
  };
  const q = read('q'), location = read('location');
  if (q) filter.$or = ['title', 'company', 'department'].map(key => ({ [key]: { $regex: escapeRegex(q), $options: 'i' } }));
  if (location) filter.location = { $regex: escapeRegex(location), $options: 'i' };
  for (const key of ['company', 'department', 'workplaceType', 'employmentType', 'source']) {
    const value = read(key); if (value) filter[key] = value;
  }
  const integer = (key, fallback, max) => {
    const value = read(key, 8);
    if (!value) return fallback;
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) {
      const error = new Error(`Invalid ${key} parameter.`); error.status = 400; throw error;
    }
    return Number(value);
  };
  const sort = read('sort') || 'newest';
  if (!['newest', 'oldest', 'title', 'company'].includes(sort)) {
    const error = new Error('Invalid sort parameter.'); error.status = 400; throw error;
  }
  return { filter, page: integer('page', 1, 100000), limit: integer('limit', 12, 100), sort };
}
module.exports = { safeApplicationUrl, plainText, workplaceType, buildQuery };
