import { describe, expect, it } from 'vitest';
import {
  buildFilename,
  generateSvg,
  isValidUrl,
  validateInput,
} from './qr';

describe('isValidUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://x.io/path?q=1')).toBe(true);
  });

  it('rejects non-http(s) and malformed input', () => {
    expect(isValidUrl('ftp://x.io')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('example.com')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

describe('validateInput', () => {
  it('empty input is invalid with no message', () => {
    const result = validateInput('', false);
    expect(result.valid).toBe(false);
    expect(result.message).toBeUndefined();

    const whitespace = validateInput('   ', true);
    expect(whitespace.valid).toBe(false);
    expect(whitespace.message).toBeUndefined();
  });

  it('free-form non-empty text is valid', () => {
    expect(validateInput('hello world', true)).toEqual({ valid: true });
  });

  it('strict mode rejects invalid URLs with a message', () => {
    const result = validateInput('hello world', false);
    expect(result.valid).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it('strict mode accepts a valid URL', () => {
    expect(validateInput('https://example.com', false)).toEqual({
      valid: true,
    });
  });
});

describe('generateSvg', () => {
  it('returns non-trivial SVG markup', async () => {
    const svg = await generateSvg('https://example.com', { width: 256 });
    expect(svg).toContain('<svg');
    expect(svg.length).toBeGreaterThan(100);
  });
});

describe('buildFilename', () => {
  it('builds png and svg filenames', () => {
    expect(buildFilename('png')).toBe('qrcode.png');
    expect(buildFilename('svg')).toBe('qrcode.svg');
  });
});
