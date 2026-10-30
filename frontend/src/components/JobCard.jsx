import Icon from './Icon';
import { timeAgo } from '../lib/jobs';
export default function JobCard({ job, saved, onSave, onOpen, index = 0 }) {
  const palettes = ['lavender', 'peach', 'mint', 'blue'];
  const palette = palettes[[...job.company].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4];
  return <article className="job-card" style={{ '--card-delay': `${Math.min(index, 8) * 35}ms` }}>
    <div className="job-card-top">
      <span className={`company-avatar ${palette}`} aria-hidden="true">{job.company.slice(0, 1)}</span>
      <div className="company-info"><span className="company-name">{job.company}</span><span className="job-source">via {job.source}</span></div>
      <button className={`icon-button save-button ${saved ? 'is-saved' : ''}`} aria-label={`${saved ? 'Unsave' : 'Save'} ${job.title} at ${job.company}`} aria-pressed={saved} onClick={() => onSave(job)}><Icon name="bookmark" size={19}/></button>
    </div>
    <button className="job-title-button" onClick={() => onOpen(job)}><h3>{job.title}</h3></button>
    <p className="job-location"><Icon name="pin" size={15}/><span>{job.location || 'Location not listed'}</span></p>
    <div className="job-tags">{job.workplaceType && job.workplaceType !== 'Not specified' && <span className={job.workplaceType === 'Remote' ? 'tag remote' : 'tag'}>{job.workplaceType}</span>}{job.employmentType && <span className="tag">{job.employmentType}</span>}{job.department && <span className="tag department-tag">{job.department}</span>}{!job.department && !job.employmentType && (!job.workplaceType || job.workplaceType === 'Not specified') && <span className="tag">Explore opportunity</span>}</div>
    <div className="job-card-bottom"><span><Icon name="clock" size={14}/>{timeAgo(job.createdAt)}</span><button className="details-link" onClick={() => onOpen(job)}>View role <Icon name="diagonal" size={15}/></button></div>
  </article>;
}
