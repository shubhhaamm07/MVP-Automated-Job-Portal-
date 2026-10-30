import Icon from './Icon';
export default function Navbar({ view, onView, savedCount }) {
  return <header className="site-header">
    <div className="header-inner">
      <a className="brand" href="#discover" onClick={() => onView('discover')} aria-label="NextRole home"><span className="brand-mark"><span/><span/><span/></span>nextrole<span className="brand-period">.</span></a>
      <nav className="main-nav" aria-label="Main navigation">
        <button className={view === 'discover' ? 'nav-item active' : 'nav-item'} onClick={() => onView('discover')}><Icon name="search" size={17}/>Discover jobs</button>
        <button className={view === 'saved' ? 'nav-item active' : 'nav-item'} onClick={() => onView('saved')}><Icon name="bookmark" size={17}/>Saved jobs{savedCount > 0 && <span className="nav-count">{savedCount}</span>}</button>
        <button className={view === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => onView('dashboard')}><Icon name="grid" size={17}/>Overview</button>
      </nav>
      <a href="#jobs" className="header-cta" onClick={() => onView('discover')}>Find your next role <Icon name="diagonal" size={17}/></a>
    </div>
  </header>;
}
