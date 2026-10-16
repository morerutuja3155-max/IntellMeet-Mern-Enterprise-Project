import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, avatarColor: u.avatarColor });
const sign = (u) => jwt.sign({ sub: u._id.toString() }, process.env.JWT_SECRET || 'development_only_change_me', { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8)
      return res.status(400).json({ message: 'Enter a name, valid email, and password of at least 8 characters.' });
    if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (e) { res.status(500).json({ message: 'Could not create account.' }); }
});
router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
  res.json({ token: sign(user), user: publicUser(user) });
});
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
export default router;
