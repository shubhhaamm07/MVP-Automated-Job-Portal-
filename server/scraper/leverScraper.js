const fetchJson = require('../lib/fetchJson');
const { safeApplicationUrl, plainText, workplaceType } = require('../lib/jobs');

module.exports = async function scrapeLever(board) {
  if (!/^[a-z0-9_-]+$/i.test(board)) throw new Error('Invalid Lever board token.');
  const data = await fetchJson(`https://api.lever.co/v0/postings/${board}?mode=json`);
  if (!Array.isArray(data)) throw new Error('Unexpected Lever response.');
  return data.filter(job => job.text && safeApplicationUrl(job.applyUrl || job.hostedUrl)).map(job => ({
    title: job.text,
    location: job.categories?.location || 'Location not listed',
    description: [job.descriptionPlain || plainText(job.description), ...(job.lists || []).map(list => `${list.text}\n${plainText(list.content)}`), job.additionalPlain].filter(Boolean).join('\n\n'),
    department: job.categories?.team || job.categories?.department || '',
    employmentType: job.categories?.commitment || '',
    workplaceType: workplaceType(job.workplaceType),
    applyLink: safeApplicationUrl(job.applyUrl || job.hostedUrl),
    source: 'Lever',
  }));
};
