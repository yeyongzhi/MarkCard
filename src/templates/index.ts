import type { CardStyle } from '@/types/document'

export const fonts = [
  { id: 'sans', name: '现代黑体', value: '"PingFang SC", "Microsoft YaHei", sans-serif' },
  { id: 'serif', name: '人文宋体', value: '"Songti SC", "SimSun", Georgia, serif' },
  { id: 'mono', name: '等宽字体', value: '"Cascadia Code", Consolas, monospace' },
]
export interface CardTemplate {
  id: string
  name: string
  english: string
  category: string
  description: string
  paper: string
  background: string
  ink: string
  accent: string
  defaults: CardStyle
}
const base: CardStyle = {
  width: 720,
  padding: 48,
  fontFamilyId: 'sans',
  fontSize: 16,
  lineHeight: 1,
  textColor: '#30332d',
  accentColor: '#546b42',
  backgroundId: 'template',
  backgroundColor: '#eef0e6',
  radius: 12,
  shadowId: 'soft',
  codeThemeId: 'light',
}
const definitions = [
  [
    'minimal',
    '极简白',
    'PURE WHITE',
    '简约',
    '让文字，自由呼吸',
    '#ffffff',
    '#e9ecef',
    '#2d333a',
    '#3e6557',
  ],
  [
    'cream',
    '奶油纸',
    'PAPER & THOUGHT',
    '人文',
    '把灵感，写在纸上',
    '#fcfaf3',
    '#e8e9d8',
    '#3f4137',
    '#637342',
  ],
  [
    'night',
    '墨色夜读',
    'AFTER HOURS',
    '深色',
    '留一盏灯给思考',
    '#222831',
    '#151a22',
    '#e3e6e9',
    '#9cc5c2',
  ],
  [
    'mint',
    '薄荷清新',
    'MINT NOTES',
    '清新',
    '一点清新，一点灵感',
    '#f1faf6',
    '#d6e9df',
    '#234d40',
    '#2b856b',
  ],
  [
    'sunset',
    '落日渐变',
    'GOLDEN HOUR',
    '渐变',
    '收藏日落时的想法',
    '#fffaf5',
    'linear-gradient(135deg,#f3d4b4,#e6a29c)',
    '#704839',
    '#b65f40',
  ],
  [
    'aurora',
    '极光紫',
    'AURORA',
    '渐变',
    '捕捉闪光的瞬间',
    '#faf7ff',
    'linear-gradient(135deg,#d7dcfa,#c6b1de,#eccee7)',
    '#473d60',
    '#805bb1',
  ],
  [
    'terminal',
    '终端代码',
    'HELLO, WORLD_',
    '深色',
    '写给创造者的笔记',
    '#172521',
    '#0e1b17',
    '#d8e9df',
    '#8ecea9',
  ],
  [
    'editorial',
    '杂志编辑',
    'THE EDIT',
    '人文',
    '每一个观点，都值得看见',
    '#fffdf9',
    '#e4ded5',
    '#242424',
    '#bd4f36',
  ],
  [
    'blueprint',
    '蓝图笔记',
    'IDEA BLUEPRINT',
    '清新',
    '让复杂的事情清晰起来',
    '#f2f6fc',
    '#dce7f4',
    '#274566',
    '#377cb1',
  ],
  [
    'newspaper',
    '复古报刊',
    'DAILY JOURNAL',
    '人文',
    '文字的分量，时间的质感',
    '#f4efdf',
    '#d8d2c1',
    '#363229',
    '#6b5842',
  ],
  [
    'notebook',
    '手帐便签',
    'LITTLE MOMENTS',
    '清新',
    '记下生活的小小片刻',
    '#fff9e4',
    '#e8e0d0',
    '#62543b',
    '#ad8543',
  ],
  [
    'quote',
    '大字金句',
    'WORDS TO KEEP',
    '简约',
    '简短的文字，长久的回响',
    '#efe8dd',
    '#ded6ca',
    '#403e38',
    '#8a644b',
  ],
] as const
export const templates: CardTemplate[] = definitions.map(
  ([id, name, english, category, description, paper, background, ink, accent]) => ({
    id,
    name,
    english,
    category,
    description,
    paper,
    background,
    ink,
    accent,
    defaults: {
      ...base,
      textColor: ink,
      accentColor: accent,
      backgroundColor: background.startsWith('#') ? background : '#e8dded',
      fontFamilyId: ['cream', 'editorial', 'newspaper', 'quote'].includes(id)
        ? 'serif'
        : id === 'terminal'
          ? 'mono'
          : 'sans',
      codeThemeId: ['night', 'terminal'].includes(id) ? 'dark' : 'light',
      radius: ['editorial', 'newspaper', 'blueprint'].includes(id) ? 2 : 12,
    },
  }),
)
export function getTemplate(id: string) {
  return templates.find((t) => t.id === id) ?? templates[1]!
}
export function effectiveStyle(doc: {
  templateId: string
  styleOverrides: Partial<CardStyle>
}): CardStyle {
  return { ...getTemplate(doc.templateId).defaults, ...doc.styleOverrides }
}
export const sampleMarkdown = `# 把平凡的日子，写成值得收藏的诗。\n\n灵感不总是盛大登场，有时，它只是午后的一束光，或翻书时偶然停留的一行字。\n\n## 给生活，留一点空白\n\n我们记录，不是为了留住所有事情，而是为了**记住那些让心轻轻一动的瞬间**。\n\n> 慢下来，才能听见生活的回声。\n> 每一个认真生活的今天，都值得被记录。\n\n- 读几页一直想读的书\n- 记录一个突然出现的想法\n- 把喜欢的文字，分享给在意的人\n\n---\n\n让文字有温度，让灵感有形状。\n从这里开始，做一张属于你的卡片。`
