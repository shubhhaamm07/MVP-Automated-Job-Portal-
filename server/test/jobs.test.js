const { test } = require('node:test');
const assert = require('node:assert/strict');
const { safeApplicationUrl, plainText, workplaceType, buildQuery } = require('../lib/jobs');
const getSources = require('../config/sources');

test('application URLs retain required job identity parameters while removing tracking', () => {
  assert.equal(safeApplicationUrl('https://example.com/careers?gh_jid=123&utm_source=portal#apply'), 'https://example.com/careers?gh_jid=123');
  assert.notEqual(safeApplicationUrl('https://example.com/?gh_jid=1'), safeApplicationUrl('https://example.com/?gh_jid=2'));
});
test('application URLs reject script, insecure, relative, and credential URLs', () => {
  for (const url of ['javascript:alert(1)', 'http://example.com', '/apply', 'https://user:password@example.com', 'invalid']) assert.equal(safeApplicationUrl(url), null);
});
test('descriptions decode HTML safely and preserve readable paragraphs', () => {
  assert.equal(plainText('&lt;p&gt;Build &amp;amp; grow&lt;/p&gt;&lt;p&gt;Join us&lt;/p&gt;'), 'Build & grow\n\nJoin us');
  assert.equal(plainText('<script>alert(1)</script><p>Hello</p>'), 'Hello');
  assert.equal(plainText('&#x110000;'), '');
});
test('work styles do not infer on-site work from an ordinary city', () => {
  assert.equal(workplaceType('London'), 'Not specified');
  assert.equal(workplaceType('US - Remote'), 'Remote');
  assert.equal(workplaceType('New York Hybrid'), 'Hybrid');
  assert.equal(workplaceType('on-site'), 'On-site');
});
test('search is a literal string, with bounded pagination and allowed sorting', () => {
  const result = buildQuery({ q: 'C++ (Core)', page: '2', limit: '12', sort: 'title' });
  assert.equal(result.filter.$or[0].title.$regex, 'C\\+\\+ \\(Core\\)');
  assert.equal(result.page, 2); assert.equal(result.limit, 12); assert.equal(result.sort, 'title');
  assert.deepEqual(result.filter.active, { $ne: false });
});
test('query rejects operator objects, arrays, oversized values and invalid numbers', () => {
  for (const query of [{ q: { $ne: '' } }, { q: ['foo'] }, { q: 'a'.repeat(151) }, { page: '-1' }, { page: '1.1' }, { limit: '101' }, { sort: '__proto__' }]) {
    assert.throws(() => buildQuery(query), { status: 400 });
  }
});
test('company and team filters are exact values, not regular expressions', () => {
  const { filter } = buildQuery({ company: 'A.*', department: 'R&D', source: 'Lever' });
  assert.equal(filter.company, 'A.*'); assert.equal(filter.department, 'R&D');
});
test('source configuration rejects unsupported providers and arbitrary URL injection', () => {
  const before = process.env.JOB_SOURCES;
  try {
    process.env.JOB_SOURCES = '[{"company":"Example","provider":"Greenhouse","board":"../../evil"}]';
    assert.throws(getSources);
    process.env.JOB_SOURCES = '[{"company":"Example","provider":"Lever","board":"example"}]';
    assert.equal(getSources()[0].provider, 'Lever');
  } finally { if (before === undefined) delete process.env.JOB_SOURCES; else process.env.JOB_SOURCES = before; }
});

test('Greenhouse adapter maps published jobs and excludes unsafe application links', async () => {
  const original = global.fetch;
  try {
    global.fetch = async url => {
      assert.match(url, /boards-api.greenhouse.io\/v1\/boards\/example\/jobs\?content=true/);
      return { ok: true, json: async () => ({ jobs: [
        { title: 'Engineer', absolute_url: 'https://example.com/jobs?gh_jid=10', content: '&lt;p&gt;Build products&lt;/p&gt;', location: { name: 'Remote - US' }, departments: [{ name: 'Engineering' }] },
        { title: 'Bad URL', absolute_url: 'javascript:alert(1)' },
      ] }) };
    };
    const jobs = await require('../scraper/greenhouseScraper')('example');
    assert.equal(jobs.length, 1); assert.equal(jobs[0].department, 'Engineering');
    assert.equal(jobs[0].workplaceType, 'Remote'); assert.equal(jobs[0].description, 'Build products');
    assert.equal(jobs[0].employmentType, '');
  } finally { global.fetch = original; }
});
test('Lever adapter maps work type, employment type, and application URL', async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => ({ ok: true, json: async () => [
      { text: 'Designer', applyUrl: 'https://jobs.lever.co/example/id/apply', categories: { location: 'London', team: 'Design', commitment: 'Full-time' }, workplaceType: 'hybrid', descriptionPlain: 'Design useful things', lists: [{ text: 'Requirements', content: '<li>Design systems</li>' }] },
    ] });
    const [job] = await require('../scraper/leverScraper')('example');
    assert.equal(job.workplaceType, 'Hybrid'); assert.equal(job.employmentType, 'Full-time');
    assert.match(job.description, /Requirements\nDesign systems/);
  } finally { global.fetch = original; }
});
test('upstream errors and invalid response shapes fail visibly', async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => ({ ok: false, status: 429 });
    await assert.rejects(require('../scraper/greenhouseScraper')('example'), /HTTP 429/);
    global.fetch = async () => ({ ok: true, json: async () => ({ unexpected: true }) });
    await assert.rejects(require('../scraper/greenhouseScraper')('example'), /Unexpected/);
    await assert.rejects(require('../scraper/leverScraper')('example'), /Unexpected/);
  } finally { global.fetch = original; }
});
