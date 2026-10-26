import { openDB } from 'idb'
import type { CardDocument, LocalAsset } from '@/types/document'
import { fonts, templates } from '@/templates'

const db = () =>
  openDB('markcard', 1, {
    upgrade(database) {
      database.createObjectStore('draft')
      database.createObjectStore('assets', { keyPath: 'id' })
    },
  })
type StoredAsset = Omit<LocalAsset, 'blob'> & { bytes: ArrayBuffer; blob?: Blob }
const byteCache = new WeakMap<Blob, ArrayBuffer>()
async function assetBytes(blob: Blob) {
  const cached = byteCache.get(blob)
  if (cached) return cached
  const bytes = await blob.arrayBuffer()
  byteCache.set(blob, bytes)
  return bytes
}
export async function saveDraft(doc: CardDocument, assets: LocalAsset[]) {
  // Encode before starting the transaction: asynchronous Blob reads can make an
  // IDB transaction inactive, and some WebKit builds cannot persist Blobs at all.
  const stored: StoredAsset[] = await Promise.all(
    assets.map(async ({ blob, ...metadata }) => ({
      ...metadata,
      bytes: await assetBytes(blob),
    })),
  )
  const database = await db()
  const tx = database.transaction(['draft', 'assets'], 'readwrite')
  await Promise.all([
    tx.objectStore('draft').put(doc, 'current'),
    (async () => {
      await tx.objectStore('assets').clear()
      await Promise.all(stored.map((asset) => tx.objectStore('assets').put(asset)))
    })(),
    tx.done,
  ])
}
export async function loadDraft(): Promise<{ doc: CardDocument; assets: LocalAsset[] } | null> {
  const database = await db()
  const tx = database.transaction(['draft', 'assets'])
  const doc = await tx.objectStore('draft').get('current')
  const stored = (await tx.objectStore('assets').getAll()) as StoredAsset[]
  // Keep compatibility with drafts written before binary storage was introduced.
  const assets = stored.map(({ bytes, blob, ...metadata }) => ({
    ...metadata,
    blob: blob ?? new Blob([bytes], { type: metadata.mime }),
  }))
  return doc ? { doc: validateDocument(doc), assets } : null
}
export async function clearDraft() {
  const database = await db()
  const tx = database.transaction(['draft', 'assets'], 'readwrite')
  await tx.objectStore('draft').clear()
  await tx.objectStore('assets').clear()
  await tx.done
}
const numeric: Record<string, [number, number]> = {
  width: [320, 1440],
  padding: [16, 96],
  fontSize: [12, 72],
  lineHeight: [1, 2.4],
  radius: [0, 48],
}
const enums: Record<string, string[]> = {
  fontFamilyId: fonts.map((f) => f.id),
  backgroundId: ['template', 'solid', 'sage', 'peach', 'lavender', 'ocean'],
  shadowId: ['none', 'soft', 'strong'],
  codeThemeId: ['light', 'dark'],
}
export function validateDocument(input: unknown): CardDocument {
  if (!input || typeof input !== 'object') throw new Error('作品格式无效')
  const d = input as Record<string, unknown>
  if (d.schemaVersion !== 1) throw new Error('不支持该作品版本，请使用匹配版本的 MarkCard')
  if (typeof d.markdown !== 'string' || d.markdown.length > 100000)
    throw new Error('正文无效或超过 100,000 字符')
  if (!templates.some((t) => t.id === d.templateId)) throw new Error('模板不存在')
  const s = d.signature as CardDocument['signature'] | undefined
  if (
    !s ||
    typeof s.visible !== 'boolean' ||
    typeof s.author !== 'string' ||
    s.author.length > 80 ||
    typeof s.source !== 'string' ||
    s.source.length > 200 ||
    typeof s.dateText !== 'string' ||
    s.dateText.length > 40
  )
    throw new Error('署名字段无效')
  const overrides: Record<string, string | number> = {}
  if (!d.styleOverrides || typeof d.styleOverrides !== 'object' || Array.isArray(d.styleOverrides))
    throw new Error('样式格式无效')
  for (const [key, value] of Object.entries(d.styleOverrides)) {
    const range = numeric[key]
    if (range) {
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < range[0] ||
        value > range[1]
      )
        throw new Error(`样式 ${key} 超出范围`)
      overrides[key] = value
    } else if (enums[key]) {
      if (typeof value !== 'string' || !enums[key]!.includes(value))
        throw new Error(`样式 ${key} 无效`)
      overrides[key] = value
    } else if (['textColor', 'accentColor', 'backgroundColor'].includes(key)) {
      if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value))
        throw new Error('颜色必须为六位 HEX')
      overrides[key] = value
    } else throw new Error(`不支持的样式字段：${key}`)
  }
  if (
    !Array.isArray(d.assetIds) ||
    !d.assetIds.every((id) => typeof id === 'string' && /^[\w-]+$/.test(id)) ||
    new Set(d.assetIds).size !== d.assetIds.length
  )
    throw new Error('图片引用无效')
  return {
    schemaVersion: 1,
    id: typeof d.id === 'string' ? d.id : crypto.randomUUID(),
    markdown: d.markdown,
    templateId: String(d.templateId),
    styleOverrides: overrides,
    signature: { visible: s.visible, author: s.author, source: s.source, dateText: s.dateText },
    assetIds: d.assetIds,
    updatedAt: new Date().toISOString(),
  }
}
export async function makeAsset(
  file: Blob,
  name: string,
  id: string = crypto.randomUUID(),
): Promise<LocalAsset> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error('请选择 5MB 以内的 PNG、JPEG 或 WebP 图片')
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const validSignature =
    file.type === 'image/png'
      ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => header[i] === v)
      : file.type === 'image/jpeg'
        ? header[0] === 255 && header[1] === 216 && header[2] === 255
        : String.fromCharCode(...header.slice(0, 4)) === 'RIFF' &&
          String.fromCharCode(...header.slice(8, 12)) === 'WEBP'
  if (!validSignature) throw new Error('文件内容与图片类型不匹配')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 32000000)
      throw new Error('图片像素过大')
    return {
      id,
      name: name.slice(0, 200),
      mime: file.type as LocalAsset['mime'],
      blob: file,
      width: image.naturalWidth,
      height: image.naturalHeight,
    }
  } catch {
    throw new Error('图片损坏、不受支持或像素过大')
  } finally {
    URL.revokeObjectURL(url)
  }
}
export async function serializeProject(doc: CardDocument, assets: LocalAsset[]) {
  const encoded = await Promise.all(
    assets.map(async (a) => ({
      id: a.id,
      name: a.name,
      mime: a.mime,
      data: await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1]!)
        reader.onerror = reject
        reader.readAsDataURL(a.blob)
      }),
    })),
  )
  return JSON.stringify(
    { format: 'markcard-project', schemaVersion: 1, document: doc, assets: encoded },
    null,
    2,
  )
}
export async function parseProject(text: string) {
  if (text.length > 35 * 1024 * 1024) throw new Error('项目文件超过 35MB')
  const data = JSON.parse(text)
  if (
    !data ||
    data.format !== 'markcard-project' ||
    data.schemaVersion !== 1 ||
    !Array.isArray(data.assets)
  )
    throw new Error('不支持的项目格式或版本')
  const doc = validateDocument(data.document)
  const assets: LocalAsset[] = []
  let total = 0
  const ids = new Set<string>()
  for (const a of data.assets) {
    if (
      !a ||
      typeof a.id !== 'string' ||
      !/^[\w-]+$/.test(a.id) ||
      ids.has(a.id) ||
      typeof a.data !== 'string' ||
      typeof a.name !== 'string'
    )
      throw new Error('项目图片数据无效')
    ids.add(a.id)
    const bytes = Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0))
    total += bytes.length
    if (total > 20 * 1024 * 1024) throw new Error('图片总大小超过 20MB')
    assets.push(await makeAsset(new Blob([bytes], { type: a.mime }), a.name, a.id))
  }
  if (doc.assetIds.some((id) => !ids.has(id))) throw new Error('项目缺少引用的图片')
  if ([...doc.markdown.matchAll(/asset:([\w-]+)/g)].some((m) => !ids.has(m[1]!)))
    throw new Error('正文引用的图片不完整')
  return { doc, assets: assets.filter((a) => doc.assetIds.includes(a.id)) }
}
