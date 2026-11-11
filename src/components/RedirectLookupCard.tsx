import React, { useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { extractShortCode } from '../utils/shortener';

export interface LookupResult {
  shortCode: string;
  status: 307 | 404;
  targetUrl?: string;
  detail?: string;
  timestamp: string;
}

interface RedirectLookupCardProps {
  lookupResult: LookupResult | null;
  isResolving: boolean;
  onResolveCode: (code: string) => Promise<void>;
}

export const RedirectLookupCard: React.FC<RedirectLookupCardProps> = ({
  lookupResult,
  isResolving,
  onResolveCode,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const extracted = extractShortCode(codeInput);
    if (!extracted) {
      setInputError('Enter a 6-digit numeric short code (e.g. 482910) or full short URL.');
      return;
    }
    setInputError(null);
    await onResolveCode(extracted);
  };

  return (
    <section
      id="lookup"
      aria-labelledby="lookup-heading"
      className="theme-surface border theme-border rounded-xl p-6 transition-colors"
    >
      <div className="pb-4 border-b theme-border">
        <h2 id="lookup-heading" className="text-base font-semibold theme-text-primary">
          Test Redirect Lookup
        </h2>
        <p className="text-xs theme-text-muted mt-1">
          Verify <code className="font-mono theme-text-secondary">GET /&#123;short_code&#125;</code> against{' '}
          <code className="font-mono theme-text-secondary">url_store</code>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4" noValidate>
        <label
          htmlFor="short-code-lookup"
          className="block text-xs font-medium theme-text-secondary mb-1.5"
        >
          6-Digit Code or Short URL
        </label>
        <div className="flex gap-2">
          <input
            id="short-code-lookup"
            type="text"
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value);
              if (inputError) setInputError(null);
            }}
            placeholder="482910"
            className="w-full px-3.5 py-2 text-sm font-mono tabular-nums theme-input border rounded-lg focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={isResolving}
            className="px-4 py-2 text-xs font-semibold theme-btn-primary rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Resolve</span>
          </button>
        </div>

        {inputError && (
          <p role="alert" className="mt-2 text-xs font-medium theme-text-danger">
            {inputError}
          </p>
        )}
      </form>

      <div className="mt-5 pt-4 border-t theme-border">
        {lookupResult ? (
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between theme-text-muted font-mono tabular-nums">
              <span>GET /{lookupResult.shortCode}</span>
              <span
                className={
                  lookupResult.status === 307
                    ? 'font-semibold theme-text-success'
                    : 'font-semibold theme-text-danger'
                }
              >
                {lookupResult.status === 307
                  ? 'HTTP 307 RedirectResponse'
                  : 'HTTP 404 Not Found'}
              </span>
            </div>

            {lookupResult.status === 307 && lookupResult.targetUrl ? (
              <div className="pt-1">
                <p className="theme-text-muted mb-1">Redirect Location:</p>
                <a
                  href={lookupResult.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono theme-text-primary font-medium break-all hover:underline inline-flex items-center gap-1"
                >
                  <span>{lookupResult.targetUrl}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </a>
              </div>
            ) : (
              <p className="font-mono theme-text-danger">
                &#123;&quot;detail&quot;: &quot;{lookupResult.detail || 'URL not found.'}&quot;&#125;
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs theme-text-muted">
            Enter a 6-digit code above or click &ldquo;Test 307&rdquo; on any row in the session store to inspect the redirect response.
          </p>
        )}
      </div>
    </section>
  );
};
