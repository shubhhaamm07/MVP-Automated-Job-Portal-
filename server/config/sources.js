const defaults = [
  { company: 'Airbnb', provider: 'Greenhouse', board: 'airbnb' },
  { company: 'Stripe', provider: 'Greenhouse', board: 'stripe' },
  { company: 'Palantir', provider: 'Lever', board: 'palantir' },
];
module.exports = function getSources() {
  const sources = process.env.JOB_SOURCES ? JSON.parse(process.env.JOB_SOURCES) : defaults;
  if (!Array.isArray(sources) || !sources.length || sources.some(item =>
    !item || typeof item.company !== 'string' || !item.company.trim() ||
    !['Greenhouse', 'Lever'].includes(item.provider) || typeof item.board !== 'string' || !/^[a-z0-9_-]+$/i.test(item.board))) {
    throw new Error('JOB_SOURCES must be an array of { company, provider: Greenhouse or Lever, board }.');
  }
  return sources;
};
