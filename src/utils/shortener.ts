import crypto from 'crypto';

export interface ShortenedItem {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  clicks: number;
}

export interface ValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
}

/**
 * Mirrors main.py:
 * def generate_short_code():
 *     characters = string.digits
 *     code = ''.join(secrets.choice(characters) for _ in range(6))
 *     return code
 */
export function generateShortCode(existingStore?: Record<string, string>): string {
  const digits = '0123456789';
  for (let attempt = 0; attempt < 25; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      const idx = typeof crypto?.randomInt === 'function'
        ? crypto.randomInt(0, 10)
        : Math.floor(Math.random() * 10);
      code += digits[idx];
    }
    if (!existingStore || !(code in existingStore)) {
      return code;
    }
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Validates that the URL string is non-empty and uses http:// or https://
 * with a valid hostname. Never substitutes fallback URLs when invalid.
 */
export function validateUrl(rawInput: string): ValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Please enter a destination URL to shorten.',
    };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      valid: false,
      error: 'URL must start with http:// or https:// (e.g. https://example.com).',
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'Only http:// and https:// protocols are supported.',
      };
    }
    if (!parsed.hostname || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')) {
      return {
        valid: false,
        error: 'Please enter a complete domain name (e.g. https://example.com/path).',
      };
    }
    return {
      valid: true,
      normalizedUrl: parsed.toString(),
    };
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format. Please enter a valid web address.',
    };
  }
}

/**
 * Extracts a 6-digit short code from either a raw code ("482910")
 * or a full short URL ("http://localhost:8000/482910").
 */
export function extractShortCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d{6}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/\/(\d{6})\/?$/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

export function validateShortCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

export function formatShortUrl(baseUrl: string, shortCode: string): string {
  const cleanBase = (baseUrl || 'http://localhost:8000').replace(/\/+$/, '');
  return `${cleanBase}/${shortCode}`;
}

export function filterShortenedLinks(
  items: ShortenedItem[],
  query: string
): ShortenedItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.shortCode.toLowerCase().includes(q) ||
      item.originalUrl.toLowerCase().includes(q) ||
      item.shortUrl.toLowerCase().includes(q)
  );
}

