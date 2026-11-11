import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRight, Check, Copy, Link2 } from 'lucide-react';
import { Header } from './components/Header';
import { RedirectLookupCard, LookupResult } from './components/RedirectLookupCard';
import { UrlStoreTable } from './components/UrlStoreTable';
import {
  ShortenedItem,
  extractShortCode,
  validateUrl,
} from './utils/shortener';

type BackendTarget = 'preview' | 'localhost8000';

const PRESET_URLS = [
  {
    label: 'FastAPI Docs',
    url: 'https://fastapi.tiangolo.com/advanced/response-headers/',
  },
  {
    label: 'Python Secrets',
    url: 'https://docs.python.org/3/library/secrets.html',
  },
  {
    label: 'Tailwind CSS',
    url: 'https://tailwindcss.com/docs/installation',
  },
];

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendTarget, setBackendTarget] = useState<BackendTarget>('preview');
  const [latestCreated, setLatestCreated] = useState<ShortenedItem | null>(null);
  const [items, setItems] = useState<ShortenedItem[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [connectionNote, setConnectionNote] = useState<string | null>(null);

  const loadStore = useCallback(async () => {
    try {
      const response = await fetch('/api/store');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.items)) {
          setItems(data.items);
        }
      }
    } catch {
      // Keep current items if offline
    } finally {
      setIsLoadingStore(false);
    }
  }, []);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  const shortenWithFetch = async (rawUrl: string) => {
    const check = validateUrl(rawUrl);
    if (!check.valid || !check.normalizedUrl) {
      setValidationError(check.error || 'Please enter a valid URL.');
      return;
    }

    setValidationError(null);
    setConnectionNote(null);
    setIsSubmitting(true);

    const targetUrl = check.normalizedUrl;

    try {
      let shortUrlResponse: { short_url: string } | null = null;

      if (backendTarget === 'localhost8000') {
        try {
          const directRes = await fetch('http://localhost:8000/shorten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetUrl }),
          });
          if (directRes.ok) {
            shortUrlResponse = await directRes.json();
          }
        } catch {
          setConnectionNote(
            'http://localhost:8000 was unreachable from browser; routed via built-in FastAPI mirror (/shorten).'
          );
        }
      }

      if (!shortUrlResponse) {
        const response = await fetch('/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Failed to shorten URL.');
        }

        const data: { short_url: string } = await response.json();
        shortUrlResponse = data;
      }

      if (!shortUrlResponse) {
        throw new Error('Empty response from /shorten endpoint.');
      }

      const shortUrl = shortUrlResponse.short_url;
      const shortCode = extractShortCode(shortUrl) || '000000';

      const newItem: ShortenedItem = {
        shortCode,
        shortUrl,
        originalUrl: targetUrl,
        createdAt: new Date().toISOString(),
        clicks: 0,
      };

      setLatestCreated(newItem);
      setUrlInput('');
      await loadStore();
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Unable to connect to /shorten endpoint.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await shortenWithFetch(urlInput);
  };

  const handleCopyUrl = async (shortUrl: string, shortCode: string) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
    } catch {
      // Clipboard fallback
    }
    setCopiedCode(shortCode);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === shortCode ? null : prev));
    }, 1800);
  };

  const handleResolveCode = async (shortCode: string) => {
    setIsResolving(true);
    try {
      const response = await fetch(`/api/resolve/${shortCode}`);
      if (response.ok) {
        const data = await response.json();
        setLookupResult({
          shortCode,
          status: 307,
          targetUrl: data.target_url,
          timestamp: new Date().toISOString(),
        });
        await loadStore();
      } else {
        const errData = await response.json().catch(() => ({ detail: 'URL not found.' }));
        setLookupResult({
          shortCode,
          status: 404,
          detail: errData.detail || 'URL not found.',
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      setLookupResult({
        shortCode,
        status: 404,
        detail: 'URL not found.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsResolving(false);
    }
  };

  const handleDeleteCode = async (shortCode: string) => {
    try {
      await fetch(`/api/store/${shortCode}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.shortCode !== shortCode));
      if (latestCreated?.shortCode === shortCode) {
        setLatestCreated(null);
      }
    } catch {
      // Ignore network error
    }
  };

  const handleClearAll = async () => {
    try {
      await fetch('/api/store', { method: 'DELETE' });
      setItems([]);
      setLatestCreated(null);
      setLookupResult(null);
    } catch {
      // Ignore network error
    }
  };

  const handleSeedSample = async () => {
    await shortenWithFetch('https://fastapi.tiangolo.com/tutorial/first-steps/');
  };

  const focusShortener = () => {
    const inputEl = document.getElementById('destination-url') as HTMLInputElement | null;
    if (inputEl) {
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      inputEl.focus();
    }
  };

  return (
    <div className="min-h-screen flex flex-col theme-canvas">
      <Header onFocusShortener={focusShortener} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Primary Hero & Shortener Workspace */}
        <section
          id="shortener"
          aria-labelledby="hero-heading"
          className="theme-surface border theme-border rounded-xl p-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-6 border-b theme-border">
            <div>
              <div className="flex items-center gap-2 text-xs theme-text-muted font-mono mb-2">
                <span>POST /shorten</span>
                <span aria-hidden="true">·</span>
                <span>GET /&#123;short_code&#125;</span>
                <span aria-hidden="true">·</span>
                <span>secrets.choice(string.digits)</span>
              </div>
              <h1
                id="hero-heading"
                className="text-2xl sm:text-3xl font-bold tracking-tight theme-text-primary"
                style={{ textWrap: 'balance' }}
              >
                Minimalist FastAPI URL Shortener
              </h1>
              <p className="text-sm theme-text-secondary mt-1.5 max-w-2xl">
                Lightweight frontend wired with standard <code className="font-mono text-xs theme-text-primary">fetch()</code> to your in-memory{' '}
                <code className="font-mono text-xs theme-text-primary">url_store</code> dictionary. Generates 6-digit numeric short codes without database overhead.
              </p>
            </div>

            {/* Interactive Endpoint Mode Selector */}
            <div className="shrink-0">
              <span className="block text-xs font-medium theme-text-muted mb-1.5">
                Fetch Target Endpoint
              </span>
              <div
                role="group"
                aria-label="Fetch Target Endpoint"
                className="inline-flex items-center gap-1 p-1 theme-subtle rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => {
                    setBackendTarget('preview');
                    setConnectionNote(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    backendTarget === 'preview'
                      ? 'theme-surface theme-text-primary shadow-xs border theme-border'
                      : 'theme-text-secondary hover:opacity-90'
                  }`}
                >
                  Same-Origin (/shorten)
                </button>
                <button
                  type="button"
                  onClick={() => setBackendTarget('localhost8000')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer font-mono ${
                    backendTarget === 'localhost8000'
                      ? 'theme-surface theme-text-primary shadow-xs border theme-border'
                      : 'theme-text-secondary hover:opacity-90'
                  }`}
                >
                  http://localhost:8000
                </button>
              </div>
            </div>
          </div>

          {/* URL Shortener Form */}
          <form onSubmit={handleFormSubmit} className="mt-6" noValidate>
            <label
              htmlFor="destination-url"
              className="block text-xs font-semibold theme-text-primary mb-2"
            >
              Destination URL
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Link2
                  className="w-4 h-4 theme-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="destination-url"
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="https://example.com/your-long-destination-path"
                  className="w-full pl-10 pr-4 py-3 text-sm theme-input border rounded-lg focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 text-sm font-semibold theme-btn-primary rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isSubmitting ? 'Shortening...' : 'Shorten URL'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {validationError && (
              <p role="alert" className="mt-2.5 text-xs font-medium theme-text-danger">
                {validationError}
              </p>
            )}

            {connectionNote && (
              <p className="mt-2.5 text-xs theme-text-warning">
                {connectionNote}
              </p>
            )}

            {/* Quick sample presets */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs theme-text-muted">
              <span>Quick fill:</span>
              {PRESET_URLS.map((preset, idx) => (
                <React.Fragment key={preset.label}>
                  {idx > 0 && <span aria-hidden="true">·</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput(preset.url);
                      setValidationError(null);
                    }}
                    className="theme-text-secondary hover:underline font-medium cursor-pointer"
                  >
                    {preset.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </form>

          {/* Latest Shortened URL Result Banner */}
          {latestCreated && (
            <div
              role="status"
              aria-live="polite"
              className="mt-6 pt-6 border-t theme-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs theme-text-success font-medium">
                  <span>Short URL Generated</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Code: {latestCreated.shortCode}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={`/${latestCreated.shortCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-mono font-semibold theme-text-primary hover:underline tabular-nums truncate"
                  >
                    {latestCreated.shortUrl}
                  </a>
                </div>
                <p className="text-xs theme-text-muted truncate">
                  Redirects (307) to: {latestCreated.originalUrl}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyUrl(latestCreated.shortUrl, latestCreated.shortCode)
                  }
                  className="px-4 py-2 text-xs font-semibold theme-btn-secondary border rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedCode === latestCreated.shortCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 theme-text-success" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 theme-text-muted" aria-hidden="true" />
                      <span>Copy Short URL</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleResolveCode(latestCreated.shortCode)}
                  className="px-4 py-2 text-xs font-semibold theme-btn-primary rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Verify Redirect
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Two-column workspace: In-Memory Session Store (8 cols) + Redirect Lookup (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <UrlStoreTable
              items={items}
              isLoading={isLoadingStore}
              onCopyUrl={handleCopyUrl}
              copiedCode={copiedCode}
              onTestRedirect={handleResolveCode}
              onDeleteCode={handleDeleteCode}
              onClearAll={handleClearAll}
              onSeedSample={handleSeedSample}
            />
          </div>

          <div className="lg:col-span-4">
            <RedirectLookupCard
              lookupResult={lookupResult}
              isResolving={isResolving}
              onResolveCode={handleResolveCode}
            />
          </div>
        </div>
      </main>

      <footer className="w-full border-t theme-border theme-surface mt-12 transition-colors">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs theme-text-muted">
          <span>FastShort — Minimalist Frontend for FastAPI In-Memory URL Shortener</span>
          <div className="flex items-center gap-2 font-mono">
            <span>POST /shorten</span>
            <span aria-hidden="true">·</span>
            <span>GET /&#123;short_code&#125;</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
