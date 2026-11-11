import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Search, Trash2 } from 'lucide-react';
import { ShortenedItem, filterShortenedLinks } from '../utils/shortener';

interface UrlStoreTableProps {
  items: ShortenedItem[];
  isLoading: boolean;
  onCopyUrl: (shortUrl: string, shortCode: string) => void;
  copiedCode: string | null;
  onTestRedirect: (shortCode: string) => void;
  onDeleteCode: (shortCode: string) => void;
  onClearAll: () => void;
  onSeedSample: () => void;
}

export const UrlStoreTable: React.FC<UrlStoreTableProps> = ({
  items,
  isLoading,
  onCopyUrl,
  copiedCode,
  onTestRedirect,
  onDeleteCode,
  onClearAll,
  onSeedSample,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredItems = filterShortenedLinks(items, searchQuery);

  return (
    <section
      id="store"
      aria-labelledby="store-heading"
      className="theme-surface border theme-border rounded-xl p-6 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b theme-border">
        <div>
          <h2 id="store-heading" className="text-base font-semibold theme-text-primary">
            In-Memory Session Store (<code className="font-mono text-sm">url_store</code>)
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs theme-text-muted mt-1 tabular-nums">
            <span className="whitespace-nowrap">{items.length} active mappings</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">6-digit numeric keys</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">In-memory dict</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <label htmlFor="filter-links" className="sr-only">
              Filter shortened URLs
            </label>
            <Search
              className="w-3.5 h-3.5 theme-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="filter-links"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter code or URL..."
              className="pl-8 pr-3 py-1.5 text-xs theme-input border rounded-lg focus:outline-none transition-colors w-44"
            />
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="px-3 py-1.5 text-xs font-medium theme-btn-secondary border rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Clear Store
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 space-y-3" aria-busy="true" aria-label="Loading session store">
          <div className="h-9 theme-subtle rounded animate-pulse" />
          <div className="h-9 theme-subtle rounded animate-pulse" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium theme-text-primary">
            <code className="font-mono">url_store</code> is currently empty
          </p>
          <p className="text-xs theme-text-muted mt-1 max-w-md mx-auto">
            Shorten a URL above using <code className="font-mono">POST /shorten</code> or load a sample mapping to test redirects.
          </p>
          <button
            type="button"
            onClick={onSeedSample}
            className="mt-4 px-4 py-2 text-xs font-semibold theme-btn-primary rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Shorten Sample FastAPI URL
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm theme-text-secondary">
            No shortened links match &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-2 text-xs font-medium theme-text-primary underline cursor-pointer"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b theme-border text-xs font-medium theme-text-muted">
                <th className="py-2.5 pr-3 font-medium">Short URL</th>
                <th className="py-2.5 px-3 font-medium">Destination URL</th>
                <th className="py-2.5 px-3 font-medium text-right">Hits</th>
                <th className="py-2.5 pl-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredItems.map((item) => {
                const isCopied = copiedCode === item.shortCode;
                return (
                  <tr
                    key={item.shortCode}
                    className="border-b theme-border last:border-b-0 theme-row-hover transition-colors"
                  >
                    <td className="py-3 pr-3 font-mono text-xs tabular-nums whitespace-nowrap">
                      <a
                        href={`/${item.shortCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="theme-text-secondary hover:underline inline-flex items-center gap-1"
                        title={`Open redirect ${item.shortUrl}`}
                      >
                        <span className="theme-text-muted">localhost:8000/</span>
                        <span className="font-semibold theme-text-primary">{item.shortCode}</span>
                        <ExternalLink className="w-3 h-3 theme-text-muted shrink-0" aria-hidden="true" />
                      </a>
                    </td>
                    <td className="py-3 px-3 text-xs theme-text-secondary max-w-[220px] truncate" title={item.originalUrl}>
                      {item.originalUrl}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs theme-text-secondary text-right tabular-nums whitespace-nowrap">
                      {item.clicks}
                    </td>
                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onCopyUrl(item.shortUrl, item.shortCode)}
                          aria-label={`Copy short URL for ${item.shortCode}`}
                          className="px-2.5 py-1 text-xs font-medium theme-btn-secondary border rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 theme-text-success" aria-hidden="true" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 theme-text-muted" aria-hidden="true" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onTestRedirect(item.shortCode)}
                          aria-label={`Test 307 redirect for ${item.shortCode}`}
                          className="px-2.5 py-1 text-xs font-medium theme-btn-secondary border rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Test 307
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteCode(item.shortCode)}
                          aria-label={`Delete short code ${item.shortCode}`}
                          className="p-1 theme-text-muted hover:opacity-80 rounded-md transition-colors cursor-pointer"
                          title={`Delete ${item.shortCode}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
