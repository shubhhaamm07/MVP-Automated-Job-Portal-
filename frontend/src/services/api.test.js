import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getJobs } from './api.js';

test('network failures provide an actionable message instead of an empty job list', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(getJobs({}), /couldn’t connect/);
  } finally { globalThis.fetch = original; }
});
test('API error responses and non-JSON outages remain visible', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ error: 'The database is unavailable.' }) });
    await assert.rejects(getJobs({}), /database is unavailable/);
    globalThis.fetch = async () => ({ ok: false, json: async () => { throw new Error('HTML response'); } });
    await assert.rejects(getJobs({}), /temporarily unavailable/);
  } finally { globalThis.fetch = original; }
});
test('malformed successful responses are rejected and valid jobs are passed through', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ jobs: {}, total: 1 }) });
    await assert.rejects(getJobs({}), /unexpected response/);
    globalThis.fetch = async url => {
      assert.ok(url.includes('q=C%2B%2B')); assert.ok(url.includes('page=2'));
      return { ok: true, json: async () => ({ jobs: [], total: 0, page: 2 }) };
    };
    assert.deepEqual((await getJobs({ q: 'C++', page: 2 })).jobs, []);
  } finally { globalThis.fetch = original; }
});
