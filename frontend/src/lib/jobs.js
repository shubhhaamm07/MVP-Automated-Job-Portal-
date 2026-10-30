export function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export function timeAgo(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Recently added';
  const days = Math.max(0, Math.floor((Date.now() - date) / 86400000));
  return days === 0 ? 'Added today' : days === 1 ? 'Added yesterday' : `Added ${days} days ago`;
}
export function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem('nextrole:saved') || '[]');
    return Array.isArray(value) ? value.filter(job => job && typeof job._id === 'string' && typeof job.title === 'string' && typeof job.company === 'string' && safeUrl(job.applyLink)).slice(0, 500) : [];
  } catch { return []; }
}
export function filterSaved(jobs, filters) {
  const q = filters.q.toLowerCase(), location = filters.location.toLowerCase();
  const result = jobs.filter(job =>
    (!q || [job.title, job.company, job.department].some(value => value?.toLowerCase().includes(q))) &&
    (!location || job.location?.toLowerCase().includes(location)) &&
    ['company', 'department', 'workplaceType', 'employmentType', 'source'].every(key => !filters[key] || job[key] === filters[key]));
  return result.sort((a, b) => {
    if (filters.sort === 'title' || filters.sort === 'company') return String(a[filters.sort] || '').localeCompare(String(b[filters.sort] || ''));
    return (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)) * (filters.sort === 'oldest' ? -1 : 1);
  });
}
