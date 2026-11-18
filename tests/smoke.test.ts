import { existsSync, readFileSync } from 'node:fs';
import { it, expect } from 'vitest';

it('builds with no external URLs in index.html', () => {
  const html = readFileSync('index.html', 'utf8');
  expect(html).not.toMatch(/https?:\/\//);
});

it('links the generated apple-touch-icon', () => {
  const html = readFileSync('index.html', 'utf8');
  expect(html).toContain('<link rel="apple-touch-icon" href="apple-touch-icon-180x180.png">');
  expect(existsSync('public/apple-touch-icon-180x180.png')).toBe(true);
});
