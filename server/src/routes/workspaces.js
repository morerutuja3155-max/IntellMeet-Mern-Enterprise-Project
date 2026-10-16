import { Router } from 'express';
import Workspace from '../models/Workspace.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth);
router.get('/', async (req, res) => {
  const workspaces = await Workspace.find({ $or: [{ owner: req.user._id }, { members: req.user._id }] })
    .populate('owner', 'name email').populate('members', 'name email').sort({ createdAt: -1 });
  res.json({ workspaces });
});
router.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Workspace name is required.' });
  const workspace = await Workspace.create({ name, description: String(req.body.description || '').slice(0, 500), owner: req.user._id, members: [req.user._id] });
  res.status(201).json({ workspace });
});
export default router;
