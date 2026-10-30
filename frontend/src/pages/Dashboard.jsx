import Icon from '../components/Icon';
export default function Dashboard({ meta, saved, error, loading, onDiscover, onSaved, onRefresh }) {
  return <section className="overview-section" id="jobs">
    <div className="section-heading"><div><span className="eyebrow">A LITTLE PERSPECTIVE</span><h2>Your next move, at a glance.</h2><p>A simple view of your job search. One step at a time.</p></div><button className="button button-outline" onClick={onRefresh} disabled={loading}><Icon name="refresh" size={16}/>Refresh</button></div>
    {error && <div className="error-banner" role="alert"><Icon name="info"/><span>{error}</span></div>}
    <div className="overview-grid">
      <div className="overview-stat"><Icon name="briefcase"/><span className="overview-value">{meta ? meta.total.toLocaleString() : '—'}</span><h3>Open opportunities</h3><button className="text-button" onClick={onDiscover}>Explore jobs <Icon name="arrow" size={16}/></button></div>
      <div className="overview-stat"><Icon name="bookmark"/><span className="overview-value">{saved.length}</span><h3>Saved for later</h3><button className="text-button" onClick={onSaved}>Your shortlist <Icon name="arrow" size={16}/></button></div>
      <div className="overview-stat"><Icon name="globe"/><span className="overview-value">{meta ? meta.companies.length : '—'}</span><h3>Companies hiring</h3><p>From connected company career boards.</p></div>
    </div>
    <div className="search-guide"><span className="guide-number">01 — 03</span><h3>Good things start with a small step.</h3><div className="guide-grid"><p><b>01. Find your direction</b>Search by title, company, or team. Narrow down by location and work style.</p><p><b>02. Make a shortlist</b>Save the roles that feel right. Your shortlist stays in this browser.</p><p><b>03. Take the next step</b>Read the details, then apply directly on the company’s official career page.</p></div></div>
  </section>;
}
