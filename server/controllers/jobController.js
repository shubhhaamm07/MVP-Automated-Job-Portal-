const mongoose = require('mongoose');
const Job = require('../models/job');
const { buildQuery } = require('../lib/jobs');
const syncJobs = require('../services/syncJobs');

exports.getJobs = async (req, res) => {
  const { filter, page, limit, sort } = buildQuery(req.query);
  const order = { newest: { createdAt: -1, _id: -1 }, oldest: { createdAt: 1, _id: 1 }, title: { title: 1, _id: 1 }, company: { company: 1, _id: 1 } }[sort];
  const total = await Job.countDocuments(filter);
  const pages = Math.ceil(total / limit);
  const currentPage = Math.min(page, Math.max(1, pages));
  const jobs = await Job.find(filter).sort(order).skip((currentPage - 1) * limit).limit(limit).lean();
  res.json({ jobs, total, page: currentPage, pages, limit });
};
exports.getMeta = async (_req, res) => {
  const active = { active: { $ne: false } };
  const [total, companies, departments, employmentTypes, sources, latest] = await Promise.all([
    Job.countDocuments(active), Job.distinct('company', active), Job.distinct('department', active),
    Job.distinct('employmentType', active), Job.distinct('source', active),
    Job.findOne(active).sort({ lastSeenAt: -1 }).select('lastSeenAt').lean(),
  ]);
  res.json({ total, companies: companies.filter(Boolean).sort(), departments: departments.filter(Boolean).sort(), employmentTypes: employmentTypes.filter(Boolean).sort(), sources: sources.filter(Boolean).sort(), lastSyncedAt: latest?.lastSeenAt || null });
};
exports.getJob = async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: 'Invalid job ID.' });
  const job = await Job.findOne({ _id: req.params.id, active: { $ne: false } }).lean();
  if (!job) return res.status(404).json({ error: 'This job is no longer available.' });
  res.json(job);
};
exports.scrapeAndSaveJobs = async (_req, res) => {
  const result = await syncJobs();
  const anySuccess = result.results.some(item => item.success);
  res.status(anySuccess ? 200 : 502).json({ ...result, ...(anySuccess ? {} : { error: 'All job sources failed. Existing jobs were retained.' }) });
};
