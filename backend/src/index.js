import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { requireApiKey, asyncHandler, errorHandler } from './middleware.js';
import {
  getSettings,
  updateSettings,
  getProgramDay,
  resolveToday,
  getPrefillForDay,
  listSessions,
  getSession,
  createSession,
  getExerciseProgress,
  listLoggedExercises,
  getStats,
} from './queries.js';

const app = express();
app.use(express.json());

// CORS: allow the GitHub Pages origin (comma-separated list supported).
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
  })
);

// Health check (no auth) for Render.
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const api = express.Router();
api.use(requireApiKey);

api.get('/settings', asyncHandler(async (_req, res) => {
  res.json(await getSettings());
}));

api.put('/settings', asyncHandler(async (req, res) => {
  const { startDate, weightUnit } = req.body || {};
  res.json(await updateSettings({ startDate, weightUnit }));
}));

api.get('/today', asyncHandler(async (req, res) => {
  res.json(await resolveToday(req.query.date));
}));

api.get('/stats', asyncHandler(async (_req, res) => {
  res.json(await getStats());
}));

api.get('/program/day/:dayNumber', asyncHandler(async (req, res) => {
  const day = await getProgramDay(Number(req.params.dayNumber));
  if (!day) return res.status(404).json({ error: 'Day not found' });
  res.json(day);
}));

api.get('/prefill/day/:dayNumber', asyncHandler(async (req, res) => {
  const day = await getPrefillForDay(Number(req.params.dayNumber));
  if (!day) return res.status(404).json({ error: 'Day not found' });
  res.json(day);
}));

api.get('/sessions', asyncHandler(async (req, res) => {
  const { from, to, dayNumber } = req.query;
  res.json(await listSessions({
    from,
    to,
    dayNumber: dayNumber ? Number(dayNumber) : undefined,
  }));
}));

api.get('/sessions/:id', asyncHandler(async (req, res) => {
  const session = await getSession(Number(req.params.id));
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
}));

api.post('/sessions', asyncHandler(async (req, res) => {
  const { workoutDate, dayNumber, exertion, sessionNotes, logs } = req.body || {};
  if (!workoutDate || !dayNumber) {
    return res.status(400).json({ error: 'workoutDate and dayNumber are required' });
  }
  const session = await createSession({ workoutDate, dayNumber, exertion, sessionNotes, logs });
  res.status(201).json(session);
}));

api.get('/exercises', asyncHandler(async (_req, res) => {
  res.json(await listLoggedExercises());
}));

api.get('/progress/exercise/:name', asyncHandler(async (req, res) => {
  res.json(await getExerciseProgress(req.params.name));
}));

app.use('/api/v1', api);
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[api] listening on :${port}`);
});
