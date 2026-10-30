module.exports = async function fetchJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json', 'User-Agent': 'NextRole-JobPortal/1.0' },
  });
  if (!response.ok) throw new Error(`Job provider returned HTTP ${response.status}.`);
  return response.json();
};
