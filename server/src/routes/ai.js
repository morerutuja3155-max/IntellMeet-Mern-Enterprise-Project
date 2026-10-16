import { Router } from 'express';
import OpenAI from 'openai';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth);
router.post('/meeting-notes', async (req, res) => {
  const transcript = String(req.body.transcript || '').trim();
  if (transcript.length < 20) return res.status(400).json({ message: 'Add more transcript text before generating notes.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ message: 'AI is not configured. Add OPENAI_API_KEY to server/.env and restart the server.' });
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Turn meeting transcript into useful business notes. Return JSON with keys summary (string), actionItems (array of objects with text, owner, dueDate). Do not invent decisions or deadlines; use Unassigned or empty dueDate when unclear.' },
        { role: 'user', content: transcript.slice(0, 30000) }
      ]
    });
    const data = JSON.parse(response.choices[0].message.content || '{}');
    res.json({ summary: String(data.summary || ''), actionItems: Array.isArray(data.actionItems) ? data.actionItems.slice(0, 30) : [] });
  } catch (e) {
    console.error('AI notes failed:', e.message);
    res.status(502).json({ message: 'AI notes could not be generated. Check the server API key and model access.' });
  }
});
export default router;
