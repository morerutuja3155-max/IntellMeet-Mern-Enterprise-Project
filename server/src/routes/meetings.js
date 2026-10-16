import { Router } from 'express';
import mongoose from 'mongoose';
import Meeting from '../models/Meeting.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth);
const idOk = (id) => mongoose.isValidObjectId(id);

router.get('/', async (req, res) => {
  const meetings = await Meeting.find({ $or: [{ host: req.user._id }, { participants: req.user._id }] })
    .sort({ scheduledAt: -1 }).populate('host', 'name email').lean();
  res.json({ meetings });
});
router.post('/', async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ message: 'Meeting title is required.' });
  const meeting = await Meeting.create({
    title, description: String(req.body.description || '').slice(0, 1000),
    host: req.user._id, participants: [req.user._id],
    scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : new Date()
  });
  res.status(201).json({ meeting });
});
router.post('/:id/join', async (req, res) => {
  if (!idOk(req.params.id)) return res.status(400).json({ message: 'Invalid meeting ID.' });
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found.' });
  // The meeting ID acts as the invite link. Require a signed-in account before joining.
  if (!meeting.participants.some(p => p.equals(req.user._id)) && !meeting.host.equals(req.user._id)) {
    meeting.participants.push(req.user._id);
    await meeting.save();
  }
  res.json({ meetingId: meeting._id, joined: true });
});
router.get('/:id', async (req, res) => {
  if (!idOk(req.params.id)) return res.status(400).json({ message: 'Invalid meeting ID.' });
  const meeting = await Meeting.findById(req.params.id).populate('host', 'name email');
  if (!meeting) return res.status(404).json({ message: 'Meeting not found.' });
  if (!meeting.host._id.equals(req.user._id) && !meeting.participants.some(p => p.equals(req.user._id)))
    return res.status(403).json({ message: 'You do not have access to this meeting.' });
  res.json({ meeting });
});
router.patch('/:id/notes', async (req, res) => {
  if (!idOk(req.params.id)) return res.status(400).json({ message: 'Invalid meeting ID.' });
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found.' });
  if (!meeting.host.equals(req.user._id) && !meeting.participants.some(p => p.equals(req.user._id)))
    return res.status(403).json({ message: 'Access denied.' });
  if (typeof req.body.transcript === 'string') meeting.transcript = req.body.transcript.slice(0, 100000);
  if (typeof req.body.summary === 'string') meeting.summary = req.body.summary.slice(0, 12000);
  if (Array.isArray(req.body.actionItems)) meeting.actionItems = req.body.actionItems.slice(0, 100);
  await meeting.save();
  res.json({ meeting });
});
router.patch('/:id/actions/:actionId', async (req, res) => {
  if (!idOk(req.params.id)) return res.status(400).json({ message: 'Invalid meeting ID.' });
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found.' });
  if (!meeting.host.equals(req.user._id) && !meeting.participants.some(p => p.equals(req.user._id)))
    return res.status(403).json({ message: 'Access denied.' });
  const action = meeting.actionItems.id(req.params.actionId);
  if (!action) return res.status(404).json({ message: 'Action item not found.' });
  action.done = Boolean(req.body.done);
  await meeting.save();
  res.json({ meeting });
});
export default router;
