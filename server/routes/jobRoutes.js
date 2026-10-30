const express = require('express');
const { timingSafeEqual } = require('node:crypto');
const controller = require('../controllers/jobController');
const router = express.Router();
router.get('/', controller.getJobs);
router.get('/meta', controller.getMeta);
router.get('/scrape', (_req, res) => res.status(405).set('Allow', 'POST').json({ error: 'Use POST /api/jobs/sync with an admin bearer token.' }));
router.post('/sync', (req, res, next) => {
  const secret = process.env.SYNC_TOKEN;
  if (!secret) return res.status(503).json({ error: 'Manual sync is disabled. Configure SYNC_TOKEN or use npm run sync.' });
  const supplied = Buffer.from(req.get('Authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return res.status(401).json({ error: 'An admin token is required.' });
  next();
}, controller.scrapeAndSaveJobs);
router.get('/:id', controller.getJob);
module.exports = router;
