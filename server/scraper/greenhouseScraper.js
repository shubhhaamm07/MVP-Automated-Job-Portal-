const fetchJson = require('../lib/fetchJson');
const { safeApplicationUrl, plainText, workplaceType } = require('../lib/jobs');

module.exports = async function scrapeGreenhouse(board) {
  if (!/^[a-z0-9_-]+$/i.test(board)) throw new Error('Invalid Greenhouse board token.');
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
  if (!Array.isArray(data.jobs)) throw new Error('Unexpected Greenhouse response.');
  return data.jobs.filter(job => job.title && safeApplicationUrl(job.absolute_url)).map(job => ({
    title: job.title,
    location: job.location?.name || 'Location not listed',
    description: plainText(job.content),
    department: job.departments?.map(item => item.name.replace(/^\d{3,6}\s+/, '')).join(', ') || '',
    workplaceType: workplaceType(job.location?.name),
    employmentType: '',
    applyLink: safeApplicationUrl(job.absolute_url),
    source: 'Greenhouse',
  }));
};
