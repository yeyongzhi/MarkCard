import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'

Object.entries({ javascript, typescript, json, xml, css, bash, python, sql }).forEach(([n, l]) =>
  hljs.registerLanguage(n, l),
)
const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: false,
  highlight: (str, lang) =>
    lang && hljs.getLanguage(lang) ? hljs.highlight(str, { language: lang }).value : '',
})
md.block.ruler.before(
  'html_block',
  'card_break',
  (state, line, _end, silent) => {
    if (state.level !== 0 || state.blkIndent !== 0) return false
    if (state.parentType !== 'root' && !(silent && state.parentType === 'paragraph')) return false
    const text = state.src.slice(state.bMarks[line], state.eMarks[line])
    if (!/^ {0,3}<!-- card-break -->\s*$/.test(text)) return false
    if (!silent) {
      const token = state.push('card_break', '', 0)
      token.map = [line, line + 1]
      state.line = line + 1
    }
    return true
  },
  { alt: ['paragraph'] },
)
md.renderer.rules.card_break = () => ''
const escapeAttr = (value: string) => md.utils.escapeHtml(value)
md.renderer.rules.image = (tokens, idx, _opts, env) => {
  const token = tokens[idx]!
  const src = String(token.attrGet('src') ?? '')
  const id = src.startsWith('asset:') ? src.slice(6) : ''
  const url = id && (env as { assets?: Record<string, string> } | undefined)?.assets?.[id]
  return url
    ? `<img src="${escapeAttr(url)}" alt="${escapeAttr(token.content)}" />`
    : '<span class="image-placeholder">图片未加载 · 请插入本地图片替换</span>'
}
// Only internal asset references are added to the standard safe protocol rules.
const validateLink = md.validateLink.bind(md)
md.validateLink = (url) => /^asset:[a-zA-Z0-9-]+$/.test(url) || validateLink(url)
export function splitCards(source: string): { cards: string[]; ignored: number } {
  const tokens = md.parse(source, {})
  const breaks = tokens.filter((t) => t.type === 'card_break')
  if (!breaks.length) return { cards: source.trim() ? [source] : [], ignored: 0 }
  const lines = source.split('\n')
  const markers = new Set(breaks.map((t) => t.map![0]))
  const groups: string[] = []
  let group: string[] = []
  lines.forEach((line, i) => {
    if (markers.has(i)) {
      groups.push(group.join('\n'))
      group = []
    } else group.push(line)
  })
  groups.push(group.join('\n'))
  return { cards: groups.filter((g) => g.trim()), ignored: groups.filter((g) => !g.trim()).length }
}
export function renderMarkdown(source: string, assets: Record<string, string> = {}) {
  const raw = md.render(source, { assets })
  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'strong',
      'em',
      's',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'hr',
      'pre',
      'code',
      'span',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'start', 'title'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  })
  // Blob URLs here can only originate from the trusted in-memory asset map.
  const template = document.createElement('template')
  template.innerHTML = clean
  template.content.querySelectorAll('a').forEach((a) => {
    if (!/^(https?:|mailto:)/i.test(a.getAttribute('href') ?? '')) a.removeAttribute('href')
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
  })
  template.content.querySelectorAll('img').forEach((img) => {
    if (!Object.values(assets).includes(img.getAttribute('src') ?? '')) img.remove()
  })
  return template.innerHTML
}
