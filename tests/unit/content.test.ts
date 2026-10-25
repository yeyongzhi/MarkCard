import { describe, expect, it } from 'vitest'
import { splitCards, renderMarkdown } from '../../src/features/markdown'
import { validateDocument } from '../../src/features/persistence'

describe('manual card breaks', () => {
  it('splits only the explicit top level marker', () => {
    expect(splitCards('# A\n\n---\n\nB\n\n<!-- card-break -->\n\n# C').cards).toHaveLength(2)
  })
  it('recognizes a standalone marker without surrounding blank lines', () => {
    expect(splitCards('第一张\n<!-- card-break -->\n第二张').cards).toHaveLength(2)
  })
  it('preserves markers in fences and nested quotes', () => {
    expect(
      splitCards('```html\n<!-- card-break -->\n```\n\n> <!-- card-break -->').cards,
    ).toHaveLength(1)
    expect(splitCards('```\n<!-- card-break -->').cards).toHaveLength(1)
    expect(
      splitCards('- 列表\n  <!-- card-break -->\n\n> 引用\n> <!-- card-break -->').cards,
    ).toHaveLength(1)
  })
  it('ignores empty leading, trailing and consecutive cards with a count', () => {
    const result = splitCards(
      '<!-- card-break -->\n\nA\n\n<!-- card-break -->\n<!-- card-break -->',
    )
    expect(result.cards).toHaveLength(1)
    expect(result.ignored).toBe(3)
  })
})
describe('untrusted content', () => {
  it('does not execute raw HTML or dangerous links', () => {
    const result = renderMarkdown(
      '<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n[good](https://example.com)',
    )
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('href="javascript:')
    expect(result).toContain('noopener noreferrer')
  })
  it('does not embed remote or arbitrary blob images', () => {
    expect(renderMarkdown('![remote](https://example.com/a.png)')).not.toContain('<img')
    expect(renderMarkdown('![fake](blob:untrusted)')).not.toContain('<img')
  })
  it('allows only resolved local asset URLs', () => {
    expect(
      renderMarkdown('![local](asset:abc)', { abc: 'blob:http://localhost/trusted' }),
    ).toContain('src="blob:http://localhost/trusted"')
  })
  it('renders unknown code languages as escaped plain text', () => {
    expect(renderMarkdown('```unknown\n<img onerror=alert(1)>\n```')).toContain('&lt;img')
  })
})
const draft = {
  schemaVersion: 1,
  markdown: '# Hello',
  templateId: 'cream',
  styleOverrides: {},
  signature: { visible: true, author: '', source: '', dateText: '' },
  assetIds: [],
}
describe('project import validation', () => {
  it('rejects future schemas without mutating the source', () => {
    const future = { ...draft, schemaVersion: 99 }
    expect(() => validateDocument(future)).toThrow('版本')
    expect(future.schemaVersion).toBe(99)
  })
  it('rejects oversized dimensions and CSS injection', () => {
    expect(() => validateDocument({ ...draft, styleOverrides: { width: 10000 } })).toThrow('范围')
    expect(() =>
      validateDocument({ ...draft, styleOverrides: { textColor: 'url(https://evil.test)' } }),
    ).toThrow('颜色')
    expect(() => validateDocument({ ...draft, styleOverrides: { customCSS: 'body{}' } })).toThrow(
      '不支持',
    )
  })
  it('keeps only declared document fields', () => {
    expect(validateDocument({ ...draft, malicious: 'ignored' })).not.toHaveProperty('malicious')
  })
})
