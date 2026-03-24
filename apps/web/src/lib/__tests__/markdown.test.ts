import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../markdown';

describe('parseMarkdown', () => {
  it('renders bold text', () => {
    expect(parseMarkdown('**hello**')).toContain('<strong>hello</strong>');
  });

  it('renders italic text', () => {
    expect(parseMarkdown('_world_')).toContain('<em>world</em>');
  });

  it('renders a link', () => {
    const result = parseMarkdown('[click](https://example.com)');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('click');
  });

  it('strips raw <script> tags — XSS protection', () => {
    const result = parseMarkdown('<script>alert("xss")</script>Hello');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('Hello');
  });

  it('strips raw <img onerror> tags', () => {
    const result = parseMarkdown('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('<img');
    expect(result).not.toContain('onerror');
  });

  it('handles empty string without throwing', () => {
    expect(() => parseMarkdown('')).not.toThrow();
  });
});
