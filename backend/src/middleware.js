// Shared Express middleware: API key auth + async error wrapping.

export function requireApiKey(req, res, next) {
  const expected = process.env.API_KEY;
  // If no API_KEY is configured, allow through (useful for local dev). In
  // production on Render, always set API_KEY.
  if (!expected) return next();

  const provided = req.get('x-api-key');
  if (provided && provided === expected) return next();

  return res.status(401).json({ error: 'Unauthorized' });
}

// Wrap async route handlers so rejected promises hit the error handler.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, _req, res, _next) {
  console.error('[api error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
}
