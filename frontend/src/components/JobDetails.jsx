import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { getJob } from '../services/api';
import { safeUrl } from '../lib/jobs';
export default function JobDetails({ job, saved, onSave, onClose }) {
  const dialogRef = useRef(null);
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const focusBefore = document.activeElement;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 15000);
    getJob(job._id, controller.signal).then(data => { if (!disposed) setDetail({ data }); }).catch(error => {
      if (disposed) return;
      if (!controller.signal.aborted) setDetail({ error: error.message });
      else setDetail({ error: 'The job service took too long to respond. Close this panel and try again.' });
    });
    return () => {
      disposed = true; clearTimeout(timeout); controller.abort(); dialog.close();
      document.body.style.overflow = previousOverflow; focusBefore?.focus();
    };
  }, [job._id]);
  const current = detail?.data || job;
  const link = detail?.data && safeUrl(current.applyLink);
  return <dialog ref={dialogRef} className="job-dialog" aria-labelledby="detail-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialogRef.current) onClose(); }}>
    <div className="dialog-content">
      <div className="dialog-top"><span className="eyebrow">YOUR NEXT CHAPTER</span><button className="icon-button" onClick={onClose} aria-label="Close job details"><Icon name="close"/></button></div>
      <div className="detail-company"><span className="company-avatar peach">{current.company.slice(0, 1)}</span><span>{current.company} <small>via {current.source}</small></span></div>
      <h2 id="detail-title">{current.title}</h2>
      <p className="job-location"><Icon name="pin" size={17}/>{current.location}</p>
      <div className="job-tags">{[current.workplaceType !== 'Not specified' && current.workplaceType, current.employmentType, current.department].filter(Boolean).map(value => <span className="tag" key={value}>{value}</span>)}</div>
      <div className="detail-description"><h3>About this opportunity</h3>{!detail ? <p role="status">Checking this role’s availability…</p> : detail.error ? <p className="detail-error" role="alert">{detail.error} Your saved copy is still available below, but availability could not be confirmed.</p> : null}<p className="description-text">{current.description || 'Visit the company’s application page for the complete job description, requirements, and benefits.'}</p></div>
      <div className="detail-actions">{link ? <a className="button button-dark" href={link} target="_blank" rel="noopener noreferrer">Apply on company site <Icon name="diagonal" size={18}/></a> : <button className="button button-dark" disabled>{detail?.error ? 'Availability unconfirmed' : 'Checking availability…'}</button>}<button className="button button-outline" onClick={() => onSave(current)}><Icon name="bookmark" size={17}/>{saved ? 'Saved' : 'Save role'}</button></div>
      <p className="detail-note">Applications open on the employer’s website. Saving a job here does not submit an application.</p>
    </div>
  </dialog>;
}
