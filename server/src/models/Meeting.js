import mongoose from 'mongoose';
const actionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  owner: { type: String, default: 'Unassigned' },
  dueDate: { type: String, default: '' },
  done: { type: Boolean, default: false }
}, { _id: true });
const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, default: '' },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  scheduledAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['scheduled','live','ended'], default: 'scheduled' },
  transcript: { type: String, default: '' },
  summary: { type: String, default: '' },
  actionItems: [actionSchema],
  chatLog: [{ senderName: String, senderId: String, text: String, sentAt: { type: Date, default: Date.now } }]
}, { timestamps: true });
export default mongoose.model('Meeting', meetingSchema);
