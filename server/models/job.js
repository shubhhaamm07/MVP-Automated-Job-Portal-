const mongoose = require('mongoose');
const { safeApplicationUrl } = require('../lib/jobs');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  location: { type: String, default: 'Location not listed' },
  description: { type: String, default: '' },
  department: { type: String, default: '' },
  employmentType: { type: String, default: '' },
  workplaceType: { type: String, enum: ['Remote', 'Hybrid', 'On-site', 'Not specified'], default: 'Not specified' },
  applyLink: { type: String, required: true, unique: true, validate: value => Boolean(safeApplicationUrl(value)) },
  source: { type: String, enum: ['Greenhouse', 'Lever'], required: true },
  sourceKey: { type: String, index: true },
  active: { type: Boolean, default: true, index: true },
  lastSeenAt: Date,
}, { timestamps: true });
jobSchema.index({ company: 1, active: 1 });
module.exports = mongoose.models.Job || mongoose.model('Job', jobSchema);
