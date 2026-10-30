const { test } = require('node:test');
const assert = require('node:assert/strict');
const Job = require('../models/job');

test('sync counts actual insertions, updates existing jobs, retains failed sources and expires missing jobs only for successful sources', async () => {
  const originalFetch = global.fetch;
  const originalUpdate = Job.updateOne;
  const originalMany = Job.updateMany;
  const previousSources = process.env.JOB_SOURCES;
  const calls = [], expired = [];
  try {
    process.env.JOB_SOURCES = JSON.stringify([
      { company: 'Working', provider: 'Greenhouse', board: 'working' },
      { company: 'Failed', provider: 'Greenhouse', board: 'failed' },
    ]);
    global.fetch = async url => {
      if (url.includes('/failed/')) throw new Error('Network failure');
      return { ok: true, json: async () => ({ jobs: [
        { title: 'New job', absolute_url: 'https://example.com/?gh_jid=new' },
        { title: 'Existing job', absolute_url: 'https://example.com/?gh_jid=existing' },
      ] }) };
    };
    Job.updateOne = async (filter, update) => {
      calls.push({ filter, update });
      return filter.applyLink.includes('new') ? { upsertedCount: 1, modifiedCount: 0 } : { upsertedCount: 0, modifiedCount: 1 };
    };
    Job.updateMany = async filter => { expired.push(filter); return { modifiedCount: 3 }; };
    const result = await require('../services/syncJobs')();
    assert.equal(result.newJobs, 1); assert.equal(result.results[0].updated, 1);
    assert.equal(result.results[0].expired, 3); assert.equal(result.results[1].success, false);
    assert.equal(calls[0].update.$set.active, true);
    assert.equal(expired.length, 1); assert.equal(expired[0].sourceKey, 'Greenhouse:working');
    assert.ok(expired[0].lastSeenAt.$lt instanceof Date);
    await assert.rejects(require('../services/syncJobs')(), { status: 429 });
  } finally {
    global.fetch = originalFetch; Job.updateOne = originalUpdate; Job.updateMany = originalMany;
    if (previousSources === undefined) delete process.env.JOB_SOURCES; else process.env.JOB_SOURCES = previousSources;
  }
});
