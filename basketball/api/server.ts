import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = 8080;

const app = express();
const PORT = Number(process.env.PORT ?? DEFAULT_PORT);
const NODE_ENV = process.env.NODE_ENV ?? 'development';

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// Serve the built Vite SPA. When compiled, this file lives at
// dist-server/api/server.js so the frontend bundle is two levels up.
const staticDir = path.resolve(__dirname, '../../dist');
app.use(express.static(staticDir, { index: 'index.html' }));

// SPA fallback: any request not matched above returns index.html
app.use((_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`basketball server listening on :${PORT} (${NODE_ENV})`);
});
