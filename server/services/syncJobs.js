const Job = require('../models/job');
const getSources = require('../config/sources');
const providers = { Greenhouse: require('../scraper/greenhouseScraper'), Lever: require('../scraper/leverScraper') };
let running = false;
let lastStarted = 0;

async function syncJobs() {
  if (running || Date.now() - lastStarted < 60000) {
    const error = new Error('A sync is running or just finished. Try again in a minute.'); error.status = 429; throw error;
  }
  const sources = getSources();
  running = true; lastStarted = Date.now();
  const results = [];
  try {
    for (const source of sources) {
      const sourceKey = `${source.provider}:${source.board}`;
      try {
        const jobs = await providers[source.provider](source.board);
        const seenAt = new Date();
        let inserted = 0, updated = 0;
        // Keep required application query parameters (for example gh_jid) when deduplicating.
        for (const job of jobs) {
          const result = await Job.updateOne({ applyLink: job.applyLink }, {
            $set: { ...job, company: source.company, sourceKey, active: true, lastSeenAt: seenAt },
          }, { upsert: true, runValidators: true });
          inserted += result.upsertedCount; updated += result.modifiedCount;
        }
        // Expire jobs only after this board has been fetched AND fully saved successfully.
        const expired = await Job.updateMany({ sourceKey, active: true, lastSeenAt: { $lt: seenAt } }, { $set: { active: false } });
        results.push({ company: source.company, source: source.provider, fetched: jobs.length, inserted, updated, expired: expired.modifiedCount, success: true });
      } catch {
        results.push({ company: source.company, source: source.provider, success: false, error: 'Could not sync this board. Existing listings were retained.' });
      }
    }
    return { results, newJobs: results.reduce((sum, item) => sum + (item.inserted || 0), 0), syncedAt: new Date().toISOString() };
  } finally { running = false; }
}
module.exports = syncJobs;
