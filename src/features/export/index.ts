import { createVNode, render } from 'vue'
import CardRenderer from '@/components/card/CardRenderer.vue'
import type { CardDocument } from '@/types/document'
import { splitCards } from '@/features/markdown'

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
export function checkExportSize(width: number, height: number, ratio: number) {
  if (
    !width ||
    !height ||
    width * ratio > 16384 ||
    height * ratio > 16384 ||
    width * height * ratio * ratio > 32000000
  )
    throw new Error('卡片过长或分辨率过大，请手动分卡或改用 1× 导出')
}
export async function createCardPng(
  doc: CardDocument,
  assets: Record<string, string>,
  index: number,
  ratio: number,
): Promise<Blob> {
  const cards = splitCards(doc.markdown).cards
  if (!cards[index]) throw new Error('所选卡片不存在，请重新选择')
  const { toBlob } = await import('html-to-image')
  const host = document.createElement('div')
  host.className = 'export-host'
  document.body.append(host)
  try {
    render(
      createVNode(CardRenderer, {
        document: doc,
        markdown: cards[index],
        assets,
        index,
        total: cards.length,
      }),
      host,
    )
    await document.fonts.ready
    const node = host.querySelector<HTMLElement>('.export-card')!
    await Promise.all([...node.querySelectorAll('img')].map((image) => image.decode()))
    if (node.querySelector('.image-placeholder'))
      throw new Error(`第 ${index + 1} 张卡片有未就绪的图片，请用本地图片替换后重试`)
    checkExportSize(node.offsetWidth, node.offsetHeight, ratio)
    const blob = await toBlob(node, {
      pixelRatio: ratio,
      cacheBust: false,
      skipFonts: true,
      preferredFontFormat: 'woff2',
    })
    if (!blob || blob.size < 100) throw new Error(`第 ${index + 1} 张生成失败，请降低倍率后重试`)
    return blob
  } finally {
    render(null, host)
    host.remove()
  }
}
export async function exportCards(
  doc: CardDocument,
  assets: Record<string, string>,
  indices: number[],
  ratio: number,
  onProgress: (done: number, total: number) => void,
  signal: AbortSignal,
) {
  let done = 0
  for (const i of indices) {
    if (signal.aborted) return done
    const blob = await createCardPng(doc, assets, i, ratio)
    if (signal.aborted) return done
    downloadBlob(
      blob,
      `markcard-${new Date().toLocaleDateString('sv-SE')}-${String(i + 1).padStart(2, '0')}.png`,
    )
    done++
    onProgress(done, indices.length)
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  return done
}
