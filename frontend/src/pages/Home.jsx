import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Icon from '../components/Icon';
import JobCard from '../components/JobCard';
import JobDetails from '../components/JobDetails';
import Dashboard from './Dashboard';
import { getJobs, getMeta } from '../services/api';
import { filterSaved, readSaved } from '../lib/jobs';

const initialFilters = { q: '', location: '', company: '', department: '', employmentType: '', workplaceType: '', source: '', sort: 'newest', page: 1, limit: 12 };
const categories = ['All opportunities', 'Engineering', 'Design', 'Product', 'Marketing', 'Sales'];

function currentView() {
  return ['saved', 'dashboard'].includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'discover';
}
export default function Home() {
  const [view, setView] = useState(currentView);
  const [filters, setFilters] = useState(initialFilters);
  const [draft, setDraft] = useState({ q: '', location: '' });
  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null);
  const [metaError, setMetaError] = useState('');
  const [metaVersion, setMetaVersion] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [saved, setSaved] = useState(readSaved);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const jobsRef = useRef(null);
  const [readyKey, setReadyKey] = useState('');
  const queryKey = JSON.stringify(filters) + refresh;
  const busy = view === 'discover' && (loading || readyKey !== queryKey);

  useEffect(() => {
    const handler = () => {
      const next = window.location.hash.slice(1);
      if (!['discover', 'saved', 'dashboard'].includes(next)) return;
      setView(next); setFilters(initialFilters); setDraft({ q: '', location: '' });
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 15000);
    getMeta(controller.signal).then(data => { if (!disposed) { setMeta(data); setMetaError(''); } }).catch(() => { if (!disposed) { setMeta(null); setMetaError('We couldn’t load the live overview. Please try refreshing.'); } }).finally(() => { if (!disposed) setMetaVersion(refresh); });
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [refresh]);

  useEffect(() => {
    if (view !== 'discover') return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 15000);
    getJobs(filters, controller.signal).then(data => {
      if (!disposed) { setResult(data); setError(''); }
    }).catch(error => {
      if (!disposed) { setResult(null); setError(controller.signal.aborted ? 'The job service took too long to respond. Please try again.' : error.message); }
    }).finally(() => {
      if (!disposed) { setLoading(false); setReadyKey(queryKey); }
    });
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [filters, refresh, view, queryKey]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  function navigate(next) {
    setView(next); setFilters(initialFilters); setDraft({ q: '', location: '' }); setFiltersOpen(false);
    history.replaceState(null, '', `#${next}`);
    if (next !== 'discover') setTimeout(() => document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }
  function updateFilters(values) { setFilters(previous => ({ ...previous, ...values, page: 1 })); }
  function clearFilters() { setFilters(initialFilters); setDraft({ q: '', location: '' }); }
  function toggleSave(job) {
    const exists = saved.some(item => item._id === job._id);
    if (!exists && saved.length >= 500) { setNotice('Your shortlist is full. Remove a saved role before adding another.'); return; }
    const next = exists ? saved.filter(item => item._id !== job._id) : [job, ...saved];
    setSaved(next);
    try { localStorage.setItem('nextrole:saved', JSON.stringify(next)); setNotice(exists ? 'Role removed from your shortlist.' : 'Role saved. Your next chapter is taking shape.'); }
    catch { setNotice('Saved for this visit. Browser storage is unavailable, so changes may be lost when you leave.'); }
  }
  function search(event) {
    event.preventDefault(); updateFilters(draft);
    jobsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const savedFiltered = filterSaved(saved, filters);
  const total = view === 'saved' ? savedFiltered.length : result?.total || 0;
  const pages = Math.ceil(total / filters.limit);
  const currentPage = view === 'saved' ? Math.min(filters.page, Math.max(1, pages)) : result?.page || filters.page;
  const jobs = view === 'saved' ? savedFiltered.slice((currentPage - 1) * filters.limit, currentPage * filters.limit) : result?.jobs || [];
  const activeCount = ['company', 'department', 'workplaceType', 'employmentType', 'source'].filter(key => filters[key]).length;
  const hasFilters = activeCount > 0 || Boolean(filters.q || filters.location);
  const savedMeta = {
    companies: [...new Set(saved.map(job => job.company))].sort(),
    departments: [...new Set(saved.map(job => job.department).filter(Boolean))].sort(),
    employmentTypes: [...new Set(saved.map(job => job.employmentType).filter(Boolean))].sort(),
    sources: [...new Set(saved.map(job => job.source).filter(Boolean))].sort(),
  };
  const facets = view === 'saved' ? savedMeta : meta;
  const lastSynced = meta?.lastSyncedAt && !Number.isNaN(new Date(meta.lastSyncedAt).getTime()) ? new Date(meta.lastSyncedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;

  return <>
    <Navbar view={view} onView={navigate} savedCount={saved.length}/>
    <main id="main-content">
      <section className="hero page-width" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="hero-kicker"><span className="status-dot"/>A NEW CHAPTER STARTS HERE</span>
          <h1 id="hero-title">Your next role.<br/>A little more <span>you.<svg viewBox="0 0 270 18" aria-hidden="true"><path d="M4 12Q132-3 264 8"/></svg></span></h1>
          <p>Big ambitions. Better opportunities.<br/>Find work that fits who you are—and where you want to go.</p>
          <a className="button button-dark hero-button" href="#jobs" onClick={() => navigate('discover')}>Explore opportunities <Icon name="arrow" size={19}/></a>
          <div className="hero-footnote"><span className="small-spark"><Icon name="spark" size={15}/></span>Fresh possibilities, straight from company career pages.</div>
        </div>
        <div className="hero-art">
          <img src="/images/career-ascent.jpg" alt="Sculptural coral staircase with a glass ring and floating sphere, representing the next step in your career" fetchPriority="high" width="1536" height="1024"/>
          <div className="floating-note note-top"><span className="note-icon"><Icon name="spark" size={19}/></span><span>Room to grow.<small>A role to make your own.</small></span></div>
          <div className="floating-note note-bottom"><span className="step-number">↗</span><span>Your next big step<small>Starts with one possibility.</small></span></div>
          <span className="art-caption">A NEW PERSPECTIVE ON WORK. ↗</span>
        </div>
      </section>
      <section className="source-strip" aria-label="Job discovery benefits"><div className="page-width source-strip-inner"><span>LESS SCROLLING.<br/><b>MORE POSSIBILITY.</b></span><div><Icon name="briefcase" size={20}/>Direct from company boards</div><div><Icon name="bookmark" size={20}/>A shortlist that’s yours</div><div><Icon name="globe" size={20}/>Your next move, anywhere</div></div></section>
      <div className="page-width content-wrap">
      {view === 'dashboard' ? <Dashboard meta={meta} saved={saved} loading={metaVersion !== refresh} error={metaError} onDiscover={() => navigate('discover')} onSaved={() => navigate('saved')} onRefresh={() => setRefresh(value => value + 1)}/> : <section className="jobs-section" id="jobs" ref={jobsRef} aria-labelledby="jobs-title">
        <div className="section-heading"><div><span className="eyebrow">{view === 'saved' ? 'KEEP THE GOOD ONES CLOSE' : 'FIND WHAT MOVES YOU'}</span><h2 id="jobs-title">{view === 'saved' ? 'Your own little shortlist.' : 'Good work. Great possibilities.'}</h2><p>{view === 'saved' ? 'The roles you’ve saved, all in one place. Stored in this browser.' : 'Explore open roles and find a place to do your best work.'}</p></div><span className="section-aside"><span className={`status-dot ${meta ? '' : 'muted'}`}/>{view === 'saved' ? `${saved.length} saved ${saved.length === 1 ? 'role' : 'roles'}` : meta ? `${meta.total.toLocaleString()} open ${meta.total === 1 ? 'role' : 'roles'}` : 'Company career boards'}</span></div>
        <form className="search-bar" onSubmit={search} role="search"><label className="search-field"><Icon name="search"/><span className="sr-only">Job title, company, or team</span><input value={draft.q} onChange={event => setDraft({ ...draft, q: event.target.value })} placeholder="Job title, company, or team" maxLength={150}/></label><label className="location-field"><Icon name="pin"/><span className="sr-only">City, country, or remote</span><input value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })} placeholder="City, country, or remote" maxLength={150}/></label><button className="button button-coral" type="submit">Find my next role <Icon name="arrow" size={18}/></button></form>
        <div className="category-row" aria-label="Quick search categories">{categories.map((category, index) => <button key={category} className={`category ${index === 0 ? !filters.q ? 'selected' : '' : filters.q === category ? 'selected' : ''}`} onClick={() => { const q = index === 0 ? '' : category; setDraft(previous => ({ ...previous, q })); updateFilters({ q }); }}>{index === 0 && <Icon name="spark" size={15}/>} {category}</button>)}</div>
        <div className="job-layout"><aside className={`filter-panel ${filtersOpen ? 'filters-open' : ''}`} aria-label="Filter jobs"><div className="filter-heading"><h3><Icon name="filter" size={17}/> Refine your search</h3>{hasFilters && <button className="text-button" onClick={clearFilters}>Reset</button>}</div><div className="filter-mobile-content"><fieldset><legend>Work style</legend>{['', 'Remote', 'Hybrid', 'On-site'].map(type => <label className="radio-row" key={type}><input type="radio" name="workplaceType" checked={filters.workplaceType === type} onChange={() => updateFilters({ workplaceType: type })}/><span>{type || 'All work styles'}</span>{type === 'Remote' && <Icon name="globe" size={14}/>}</label>)}</fieldset><FilterSelect label="Company" value={filters.company} values={facets?.companies} onChange={company => updateFilters({ company })}/><FilterSelect label="Team" value={filters.department} values={facets?.departments} onChange={department => updateFilters({ department })}/><FilterSelect label="Employment type" value={filters.employmentType} values={facets?.employmentTypes} onChange={employmentType => updateFilters({ employmentType })}/><FilterSelect label="Job source" value={filters.source} values={facets?.sources} onChange={source => updateFilters({ source })}/><div className="filter-tip"><span className="tip-icon"><Icon name="spark" size={21}/></span><h4>Make room for<br/>what’s next.</h4><p>The right role might be one filter away.</p><span className="tip-line"/></div></div></aside>
        <div className="results-panel"><div className="results-toolbar"><p aria-live="polite">{view === 'discover' && busy ? 'Finding possibilities…' : <><strong>{total.toLocaleString()}</strong> {total === 1 ? 'opportunity' : 'opportunities'}{hasFilters ? ' found' : ' to explore'}</>}</p><div className="sort-controls"><button className="mobile-filter-button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(value => !value)}><Icon name="filter" size={16}/>Filters{activeCount ? ` (${activeCount})` : ''}</button><label className="sort-label">Sort by <select aria-label="Sort jobs" value={filters.sort} onChange={event => updateFilters({ sort: event.target.value })}><option value="newest">Newest added</option><option value="oldest">Oldest added</option><option value="title">Job title</option><option value="company">Company</option></select></label><button className="icon-button refresh-button" aria-label="Refresh job listings" onClick={() => setRefresh(value => value + 1)} disabled={view === 'discover' && busy}><Icon name="refresh" size={17}/></button></div></div>
        {hasFilters && <div className="active-filters">{Object.entries(filters).filter(([key, value]) => ['q', 'location', 'company', 'department', 'workplaceType', 'employmentType', 'source'].includes(key) && value).map(([key, value]) => <button key={key} onClick={() => { updateFilters({ [key]: '' }); if (key === 'q' || key === 'location') setDraft(previous => ({ ...previous, [key]: '' })); }}>{value}<Icon name="close" size={12}/><span className="sr-only">Remove {key} filter</span></button>)}<button className="clear-filters" onClick={clearFilters}>Clear all</button></div>}
        {view === 'discover' && busy ? <div className="jobs-grid" aria-busy="true" aria-label="Loading jobs">{Array.from({ length: 6 }, (_, index) => <div key={index} className="job-skeleton"><div/><div/><div/><div/></div>)}</div> : view === 'discover' && error ? <div className="empty-state error-state" role="alert"><span className="state-icon"><Icon name="globe" size={30}/></span><h3>We couldn’t reach the job board.</h3><p>{error}</p><button className="button button-dark" onClick={() => setRefresh(value => value + 1)}><Icon name="refresh" size={16}/>Try again</button></div> : jobs.length === 0 ? <div className="empty-state"><span className="state-icon"><Icon name={view === 'saved' ? 'bookmark' : 'search'} size={30}/></span><h3>{hasFilters ? 'Let’s widen the possibilities.' : view === 'saved' ? 'Your shortlist starts here.' : 'New possibilities are on their way.'}</h3><p>{hasFilters ? 'No roles match these filters. Try a broader search or a different location.' : view === 'saved' ? 'Tap the bookmark on a role you like. We’ll keep it here for your next visit.' : 'There are no imported jobs yet. Once company boards are connected and synced, open roles will appear here.'}</p><button className="button button-dark" onClick={hasFilters ? clearFilters : view === 'saved' ? () => navigate('discover') : () => setRefresh(value => value + 1)}>{hasFilters ? 'Clear filters' : view === 'saved' ? 'Discover jobs' : 'Refresh listings'}<Icon name="arrow" size={17}/></button></div> : <><div className="jobs-grid">{jobs.map((job, index) => <JobCard key={job._id} job={job} index={index} saved={saved.some(item => item._id === job._id)} onSave={toggleSave} onOpen={setSelected}/>)}</div>{pages > 1 && <nav className="pagination" aria-label="Job result pages"><button className="button button-outline" disabled={currentPage <= 1} onClick={() => setFilters(previous => ({ ...previous, page: currentPage - 1 }))}>Previous</button><span>Page {currentPage} of {pages}</span><button className="button button-outline" disabled={currentPage >= pages} onClick={() => setFilters(previous => ({ ...previous, page: currentPage + 1 }))}>Next <Icon name="arrow" size={15}/></button></nav>}</>}
        <div className="results-footnote"><span><Icon name="check" size={14}/>Apply directly with the employer</span>{lastSynced && view === 'discover' && <span>Last imported {lastSynced}</span>}</div></div></div>
      </section>}
      <section className="bottom-banner"><div><span className="eyebrow">A NOTE FOR YOUR NEXT CHAPTER</span><h2>You don’t need it all figured out.<br/>Just a good place to start.</h2></div><a href="#jobs" className="round-arrow" aria-label="Explore job opportunities" onClick={() => navigate('discover')}><Icon name="diagonal" size={28}/></a><span className="banner-orbit" aria-hidden="true"/></section>
      </div>
    </main>
    <footer className="site-footer page-width"><a className="brand" href="#discover" onClick={() => navigate('discover')}>nextrole<span className="brand-period">.</span></a><span>A little closer to what’s next.</span><span>Built for your next chapter. © {new Date().getFullYear()}</span></footer>
    <div className={`toast ${notice ? 'show' : ''}`} role="status" aria-live="polite">{notice && <><Icon name="check" size={17}/>{notice}</>}</div>
    {selected && <JobDetails key={selected._id} job={selected} saved={saved.some(job => job._id === selected._id)} onSave={toggleSave} onClose={() => setSelected(null)}/>}
  </>;
}
function FilterSelect({ label, values = [], value, onChange }) {
  return <label className="filter-select"><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}><option value="">All {label === 'Company' ? 'companies' : label === 'Team' ? 'teams' : label === 'Job source' ? 'sources' : 'types'}</option>{values.map(item => <option value={item} key={item}>{item}</option>)}</select></label>;
}
