import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import meetingRoutes from './routes/meetings.js';
import workspaceRoutes from './routes/workspaces.js';
import aiRoutes from './routes/ai.js';
import { attachSocketHandlers } from './socket.js';

const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const io = new Server(server, { cors: { origin: clientUrl, methods: ['GET','POST'] } });

app.use(cors({ origin: clientUrl }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'IntellMeet API' }));
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/ai', aiRoutes);
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

attachSocketHandlers(io);

const port = Number(process.env.PORT || 5000);
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/intellmeet')
  .then(() => server.listen(port, () => console.log(`IntellMeet API running on http://localhost:${port}`)))
  .catch((err) => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
