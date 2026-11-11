import React from 'react';

interface HeaderProps {
  onFocusShortener: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onFocusShortener }) => {
  return (
    <header className="w-full theme-surface border-b theme-border transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#shortener"
          className="text-lg font-bold tracking-tight theme-text-primary whitespace-nowrap shrink-0"
        >
          FastShort
        </a>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium theme-text-secondary"
        >
          <a
            href="#shortener"
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Shortener
          </a>
          <a
            href="#store"
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Session Store
          </a>
          <a
            href="#lookup"
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Redirect Lookup
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onFocusShortener}
            className="px-4 py-2 text-xs font-semibold theme-btn-primary rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            New Short Link
          </button>
        </div>
      </div>
    </header>
  );
};
