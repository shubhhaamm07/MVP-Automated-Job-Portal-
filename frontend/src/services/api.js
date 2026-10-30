const API_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
async function request(path, signal) {
  let response;
  try { response = await fetch(`${API_URL}${path}`, { signal: signal || AbortSignal.timeout(15000) }); }
  catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') throw error;
    throw new Error('We couldn’t connect to the job service. Check your connection and try again.');
  }
  let data;
  try { data = await response.json(); } catch { throw new Error(response.ok ? 'The job service returned an unexpected response. Please try again.' : 'The job service is temporarily unavailable. Please try again.'); }
  if (!response.ok) throw new Error(data.error || 'The job service is unavailable. Please try again.');
  return data;
}
export async function getJobs(filters, signal) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
  const data = await request(`/jobs?${query}`, signal);
  if (!Array.isArray(data.jobs) || !Number.isFinite(data.total)) throw new Error('The job service returned an unexpected response.');
  return data;
}
export const getMeta = signal => request('/jobs/meta', signal);
export const getJob = (id, signal) => request(`/jobs/${encodeURIComponent(id)}`, signal);
