import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { generateShortCode } from './src/utils/shortener';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mirrors FastAPI's in-memory url_store: dict[str, str] = {}
  // Seeded with two deterministic entries so the session starts populated and testable
  const urlStore: Record<string, string> = {
    '482910': 'https://fastapi.tiangolo.com/tutorial/first-steps/',
    '739104': 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
  };

  const metadataStore: Record<string, { createdAt: string; clicks: number }> = {
    '482910': { createdAt: '2026-11-10T21:30:00.000Z', clicks: 4 },
    '739104': { createdAt: '2026-11-10T21:38:00.000Z', clicks: 2 },
  };

  // Exact FastAPI endpoint: @app.post('/shorten')
  app.post('/shorten', (req, res) => {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!url) {
      res.status(422).json({ detail: 'Field "url" is required.' });
      return;
    }

    const shortCode = generateShortCode(urlStore);
    urlStore[shortCode] = url;
    metadataStore[shortCode] = {
      createdAt: new Date().toISOString(),
      clicks: 0,
    };

    res.json({
      short_url: `http://localhost:8000/${shortCode}`,
    });
  });

  // Auxiliary endpoint to inspect in-memory url_store state and test redirects safely inside iframe
  app.get('/api/store', (_req, res) => {
    const items = Object.entries(urlStore)
      .map(([shortCode, originalUrl]) => ({
        shortCode,
        shortUrl: `http://localhost:8000/${shortCode}`,
        originalUrl,
        createdAt: metadataStore[shortCode]?.createdAt || new Date().toISOString(),
        clicks: metadataStore[shortCode]?.clicks ?? 0,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ store: urlStore, items });
  });

  app.get('/api/resolve/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    if (shortCode in urlStore) {
      if (metadataStore[shortCode]) {
        metadataStore[shortCode].clicks += 1;
      }
      res.json({
        short_code: shortCode,
        target_url: urlStore[shortCode],
        status: 307,
        clicks: metadataStore[shortCode]?.clicks ?? 1,
      });
    } else {
      res.status(404).json({ detail: 'URL not found.' });
    }
  });

  app.delete('/api/store/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    if (shortCode in urlStore) {
      delete urlStore[shortCode];
      delete metadataStore[shortCode];
      res.json({ deleted: shortCode });
    } else {
      res.status(404).json({ detail: 'URL not found.' });
    }
  });

  app.delete('/api/store', (_req, res) => {
    for (const key of Object.keys(urlStore)) {
      delete urlStore[key];
      delete metadataStore[key];
    }
    res.json({ cleared: true });
  });

  // Exact FastAPI endpoint: @app.get('/{short_code}') for 6-digit codes
  app.get(/^\/(\d{6})$/, (req, res) => {
    const shortCode = req.params[0];
    if (shortCode in urlStore) {
      if (metadataStore[shortCode]) {
        metadataStore[shortCode].clicks += 1;
      }
      res.redirect(307, urlStore[shortCode]);
    } else {
      res.status(404).json({ detail: 'URL not found.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
