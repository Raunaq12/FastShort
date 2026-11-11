import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateShortCode,
  validateUrl,
  extractShortCode,
  validateShortCode,
  formatShortUrl,
  filterShortenedLinks,
  ShortenedItem,
} from './shortener';

test('generateShortCode returns a 6-digit numeric string', () => {
  for (let i = 0; i < 20; i++) {
    const code = generateShortCode();
    assert.equal(code.length, 6);
    assert.match(code, /^\d{6}$/);
  }
});

test('validateUrl accepts valid http and https URLs and rejects invalid ones', () => {
  const validHttps = validateUrl('https://fastapi.tiangolo.com/tutorial/');
  assert.equal(validHttps.valid, true);
  assert.equal(validHttps.normalizedUrl, 'https://fastapi.tiangolo.com/tutorial/');

  const validHttp = validateUrl('http://localhost:8000/docs');
  assert.equal(validHttp.valid, true);

  const empty = validateUrl('   ');
  assert.equal(empty.valid, false);
  assert.ok(empty.error);

  const missingProtocol = validateUrl('example.com/path');
  assert.equal(missingProtocol.valid, false);

  const invalidHost = validateUrl('https://notadomain');
  assert.equal(invalidHost.valid, false);
});

test('extractShortCode extracts 6-digit code from full URL or plain code', () => {
  assert.equal(extractShortCode('482910'), '482910');
  assert.equal(extractShortCode('http://localhost:8000/482910'), '482910');
  assert.equal(extractShortCode('https://example.com/123456/'), '123456');
  assert.equal(extractShortCode('abc123'), null);
  assert.equal(extractShortCode('12345'), null);
});

test('validateShortCode checks 6-digit numeric constraint', () => {
  assert.equal(validateShortCode('004912'), true);
  assert.equal(validateShortCode('999999'), true);
  assert.equal(validateShortCode('12a456'), false);
  assert.equal(validateShortCode('12345'), false);
});

test('formatShortUrl joins base URL and short code cleanly', () => {
  assert.equal(formatShortUrl('http://localhost:8000', '123456'), 'http://localhost:8000/123456');
  assert.equal(formatShortUrl('http://localhost:8000/', '654321'), 'http://localhost:8000/654321');
});

test('filterShortenedLinks filters by shortCode or originalUrl', () => {
  const sample: ShortenedItem[] = [
    {
      shortCode: '482910',
      shortUrl: 'http://localhost:8000/482910',
      originalUrl: 'https://fastapi.tiangolo.com/tutorial/first-steps/',
      createdAt: '2026-11-10T21:00:00.000Z',
      clicks: 3,
    },
    {
      shortCode: '901245',
      shortUrl: 'http://localhost:8000/901245',
      originalUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
      createdAt: '2026-11-10T21:05:00.000Z',
      clicks: 1,
    },
  ];

  assert.equal(filterShortenedLinks(sample, '').length, 2);
  assert.equal(filterShortenedLinks(sample, '482910').length, 1);
  assert.equal(filterShortenedLinks(sample, 'mozilla').length, 1);
  assert.equal(filterShortenedLinks(sample, 'nonexistent').length, 0);
});

