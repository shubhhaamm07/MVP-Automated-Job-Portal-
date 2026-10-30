import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeUrl, readSaved, filterSaved, timeAgo } from './jobs.js';
const jobs = [
  { _id: '1', title: 'C++ Engineer', company: 'One', department: 'Engineering', location: 'Remote - US', workplaceType: 'Remote', source: 'Greenhouse', createdAt: '2025-01-01' },
  { _id: '2', title: 'Designer', company: 'Two', department: 'Design', location: 'London', workplaceType: 'Hybrid', source: 'Lever', createdAt: '2025-02-01' },
];
const filters = { q: '', location: '', sort: 'newest' };
test('saved job filters combine search, location, company, and work style', () => {
  assert.equal(filterSaved(jobs, { ...filters, q: 'Engineer', location: 'US', workplaceType: 'Remote' }).length, 1);
  assert.equal(filterSaved(jobs, { ...filters, company: 'Two', workplaceType: 'Remote' }).length, 0);
  assert.equal(filterSaved(jobs, { ...filters, q: 'c++' })[0]._id, '1');
});
test('sorting saved jobs matches the selected option', () => {
  assert.equal(filterSaved(jobs, filters)[0]._id, '2');
  assert.equal(filterSaved(jobs, { ...filters, sort: 'oldest' })[0]._id, '1');
  assert.equal(filterSaved(jobs, { ...filters, sort: 'title' })[0]._id, '1');
});
test('invalid or blocked browser storage never breaks the page', () => {
  const previous = globalThis.localStorage;
  try {
    globalThis.localStorage = { getItem: () => '{bad json' }; assert.deepEqual(readSaved(), []);
    globalThis.localStorage = { getItem: () => JSON.stringify([null, { _id: 1 }, { ...jobs[0], applyLink: 'javascript:alert(1)' }, { ...jobs[1], applyLink: 'https://example.com/apply' }]) };
    assert.equal(readSaved().length, 1);
    globalThis.localStorage = { getItem: () => { throw new Error('Blocked'); } }; assert.deepEqual(readSaved(), []);
  } finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous; }
});
test('application links and invalid dates have safe behavior', () => {
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('https://example.com/apply'), 'https://example.com/apply');
  assert.equal(timeAgo('invalid'), 'Recently added');
  assert.equal(timeAgo(new Date(Date.now() + 86400000).toISOString()), 'Added today');
});
