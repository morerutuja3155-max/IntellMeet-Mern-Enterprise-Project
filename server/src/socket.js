import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Meeting from './models/Meeting.js';

export function attachSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'development_only_change_me');
      const user = await User.findById(payload.sub).select('_id name email');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    socket.on('meeting:join', async ({ meetingId } = {}) => {
      try {
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) return socket.emit('meeting:error', { message: 'Meeting not found.' });
        const allowed = meeting.host.equals(socket.user._id) || meeting.participants.some(p => p.equals(socket.user._id));
        if (!allowed) return socket.emit('meeting:error', { message: 'You do not have access to this meeting.' });
        socket.join(meetingId);
        socket.to(meetingId).emit('peer:joined', { socketId: socket.id, user: { id: socket.user._id, name: socket.user.name } });
        const peers = [...(io.sockets.adapter.rooms.get(meetingId) || [])].filter(id => id !== socket.id);
        socket.emit('meeting:peers', { peers });
        socket.emit('chat:history', { messages: meeting.chatLog.slice(-100) });
      } catch { socket.emit('meeting:error', { message: 'Unable to join meeting.' }); }
    });
    socket.on('chat:message', async ({ meetingId, text } = {}) => {
      const messageText = String(text || '').trim().slice(0, 2000);
      if (!meetingId || !messageText) return;
      const message = { senderName: socket.user.name, senderId: socket.user._id.toString(), text: messageText, sentAt: new Date() };
      try {
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) return;
        const allowed = meeting.host.equals(socket.user._id) || meeting.participants.some(p => p.equals(socket.user._id));
        if (!allowed) return;
        meeting.chatLog.push(message);
        if (meeting.chatLog.length > 500) meeting.chatLog = meeting.chatLog.slice(-500);
        await meeting.save();
        io.to(meetingId).emit('chat:message', message);
      } catch {}
    });
    for (const event of ['webrtc:offer','webrtc:answer','webrtc:ice']) {
      socket.on(event, ({ to, meetingId, payload } = {}) => {
        if (to && meetingId) io.to(to).emit(event, { from: socket.id, meetingId, payload });
      });
    }
    socket.on('meeting:leave', ({ meetingId } = {}) => {
      if (meetingId) { socket.leave(meetingId); socket.to(meetingId).emit('peer:left', { socketId: socket.id }); }
    });
    socket.on('disconnecting', () => {
      for (const room of socket.rooms) if (room !== socket.id) socket.to(room).emit('peer:left', { socketId: socket.id });
    });
  });
}
