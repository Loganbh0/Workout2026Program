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
  listPrograms,
  getProgram,
  createProgram,
  updateProgram,
  activateProgram,
  getActiveProgram,
} from './queries.js';

const app = express();
app.use(express.json());

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

api.get('/programs', asyncHandler(async (_req, res) => {
  res.json(await listPrograms());
}));

api.post('/programs', asyncHandler(async (req, res) => {
  const program = await createProgram(req.body);
  res.status(201).json(program);
}));

api.get('/programs/:id', asyncHandler(async (req, res) => {
  const program = await getProgram(Number(req.params.id));
  if (!program) return res.status(404).json({ error: 'Program not found' });
  res.json(program);
}));

api.put('/programs/:id', asyncHandler(async (req, res) => {
  const { displayName } = req.body || {};
  const program = await updateProgram(Number(req.params.id), { displayName });
  if (!program) return res.status(404).json({ error: 'Program not found' });
  res.json(program);
}));

api.post('/programs/:id/activate', asyncHandler(async (req, res) => {
  const { startDate } = req.body || {};
  const program = await activateProgram(Number(req.params.id), { startDate });
  res.json(program);
}));

api.get('/today', asyncHandler(async (req, res) => {
  res.json(await resolveToday(req.query.date));
}));

api.get('/stats', asyncHandler(async (req, res) => {
  res.json(await getStats(req.query.scope));
}));

api.get('/program/day/:dayNumber', asyncHandler(async (req, res) => {
  const program = await getActiveProgram();
  if (!program) return res.status(404).json({ error: 'No active program' });
  const day = await getProgramDay(Number(req.params.dayNumber), program.id);
  if (!day) return res.status(404).json({ error: 'Day not found' });
  res.json(day);
}));

api.get('/prefill/day/:dayNumber', asyncHandler(async (req, res) => {
  const day = await getPrefillForDay(Number(req.params.dayNumber));
  if (!day) return res.status(404).json({ error: 'Day not found' });
  res.json(day);
}));

api.get('/sessions', asyncHandler(async (req, res) => {
  const { from, to, dayNumber, scope } = req.query;
  res.json(await listSessions({
    from,
    to,
    dayNumber: dayNumber ? Number(dayNumber) : undefined,
    scope,
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

api.get('/exercises', asyncHandler(async (req, res) => {
  res.json(await listLoggedExercises(req.query.scope));
}));

api.get('/progress/exercise/:name', asyncHandler(async (req, res) => {
  res.json(await getExerciseProgress(req.params.name, req.query.scope));
}));

app.use('/api/v1', api);
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[api] listening on :${port}`);
});
