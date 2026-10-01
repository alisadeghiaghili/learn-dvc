import { describe, expect, it } from 'vitest';
import { parseVisitorSvg } from '../src/ui/visitor-counter';

describe('parseVisitorSvg', () => {
  it('parses simple integer count from svg', () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <text x="20" y="14">Visitors</text>
        <text x="50" y="14">42</text>
      </svg>
    `;
    expect(parseVisitorSvg(svg)).toBe(42);
  });

  it('parses formatted counts with commas', () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <text>Visitors</text>
        <text>1,450</text>
      </svg>
    `;
    expect(parseVisitorSvg(svg)).toBe(1450);
  });

  it('parses abbreviation suffixes K and M', () => {
    const svgK = `<svg><text>Visitors</text><text>2.5K</text></svg>`;
    expect(parseVisitorSvg(svgK)).toBe(2500);

    const svgM = `<svg><text>Visitors</text><text>1.2M</text></svg>`;
    expect(parseVisitorSvg(svgM)).toBe(1200000);
  });

  it('returns null on invalid or missing numbers', () => {
    const svg = `<svg><text>Visitors</text></svg>`;
    expect(parseVisitorSvg(svg)).toBeNull();
  });
});
