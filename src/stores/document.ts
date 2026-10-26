import { computed, ref, watch, toRaw } from 'vue'
import { defineStore } from 'pinia'
import type { CardDocument, CardStyle, LocalAsset } from '@/types/document'
import { effectiveStyle, getTemplate, sampleMarkdown } from '@/templates'
import { splitCards } from '@/features/markdown'
import { clearDraft, loadDraft, makeAsset, saveDraft } from '@/features/persistence'

export function createDocument(): CardDocument {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    markdown: sampleMarkdown,
    templateId: 'cream',
    styleOverrides: {},
    signature: { visible: true, author: '一个认真生活的人', source: '生活观察手记', dateText: '' },
    assetIds: [],
    updatedAt: new Date().toISOString(),
  }
}
export const useDocumentStore = defineStore('document', () => {
  const doc = ref<CardDocument>(createDocument())
  const assets = ref<LocalAsset[]>([])
  const assetUrls = ref<Record<string, string>>({})
  const ready = ref(false)
  const saveState = ref<'loading' | 'saving' | 'saved' | 'error'>('loading')
  const saveError = ref('')
  const recovered = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let revision = 0
  let queue = Promise.resolve()
  let skipWatch = false
  let recoveryBlocked = false
  const style = computed(() => effectiveStyle(doc.value))
  const template = computed(() => getTemplate(doc.value.templateId))
  const split = computed(() => splitCards(doc.value.markdown))
  const cards = computed(() => split.value.cards)
  const dirty = computed(() => saveState.value === 'saving' || saveState.value === 'error')
  function updateUrls() {
    Object.values(assetUrls.value).forEach(URL.revokeObjectURL)
    assetUrls.value = Object.fromEntries(
      assets.value.map((a) => [a.id, URL.createObjectURL(a.blob)]),
    )
  }
  async function initialize() {
    if (ready.value) return
    try {
      const saved = await loadDraft()
      if (saved) {
        doc.value = saved.doc
        assets.value = saved.assets
        updateUrls()
        recovered.value = true
      }
      saveState.value = 'saved'
    } catch (e) {
      recoveryBlocked = true
      saveState.value = 'error'
      saveError.value = `${e instanceof Error ? e.message : '无法读取本地草稿'}。已暂停自动保存以保护原数据；可先备份当前内容，确认清空作品后再开始`
    }
    ready.value = true
  }
  function schedule() {
    if (!ready.value || skipWatch || recoveryBlocked) return
    revision++
    const version = revision
    saveState.value = 'saving'
    clearTimeout(timer)
    timer = setTimeout(() => {
      const snapshot = structuredClone(toRaw(doc.value))
      snapshot.updatedAt = new Date().toISOString()
      const imageSnapshot = assets.value.map((a) => ({ ...toRaw(a) }))
      queue = queue.then(async () => {
        try {
          await saveDraft(snapshot, imageSnapshot)
          if (version === revision) {
            saveState.value = 'saved'
            saveError.value = ''
          }
        } catch {
          saveState.value = 'error'
          saveError.value = '浏览器保存失败，请下载项目备份以免丢失内容'
        }
      })
    }, 600)
  }
  watch(
    doc,
    () => {
      if (ready.value && !skipWatch) schedule()
    },
    { deep: true, flush: 'sync' },
  )
  function setMarkdown(value: string | number) {
    doc.value.markdown = String(value).slice(0, 100000)
    doc.value.updatedAt = new Date().toISOString()
  }
  function setStyle<K extends keyof CardStyle>(key: K, value: CardStyle[K]) {
    doc.value.styleOverrides = { ...doc.value.styleOverrides, [key]: value }
  }
  function selectTemplate(id: string) {
    doc.value.templateId = id
    doc.value.styleOverrides = {}
  }
  function resetStyle() {
    doc.value.styleOverrides = {}
  }
  async function replace(next: CardDocument, images: LocalAsset[] = []) {
    clearTimeout(timer)
    revision++
    await queue
    recoveryBlocked = false
    skipWatch = true
    doc.value = next
    assets.value = images
    updateUrls()
    skipWatch = false
    schedule()
  }
  async function clear() {
    clearTimeout(timer)
    revision++
    await queue
    await clearDraft()
    recoveryBlocked = false
    skipWatch = true
    doc.value = { ...createDocument(), markdown: '' }
    assets.value = []
    updateUrls()
    skipWatch = false
    saveState.value = 'saved'
  }
  async function addImage(
    file: File,
    position: number,
    expectedMarkdown: string,
    expectedId: string,
  ) {
    if (assets.value.reduce((sum, a) => sum + a.blob.size, 0) + file.size > 20 * 1024 * 1024)
      throw new Error('图片总大小不能超过 20MB')
    const asset = await makeAsset(file, file.name)
    if (doc.value.id !== expectedId || doc.value.markdown !== expectedMarkdown)
      throw new Error('处理图片时正文已改变，请重新插入图片')
    if (assets.value.reduce((sum, a) => sum + a.blob.size, 0) + asset.blob.size > 20 * 1024 * 1024)
      throw new Error('图片总大小不能超过 20MB')
    const markup = `![${file.name.replace(/[\[\]\n]/g, '')}](asset:${asset.id})`
    const insertion = `\n\n${markup}\n\n`
    const next = expectedMarkdown.slice(0, position) + insertion + expectedMarkdown.slice(position)
    if (next.length > 100000) throw new Error('正文空间不足，请缩短后再插入图片')
    const url = URL.createObjectURL(asset.blob)
    assets.value.push(asset)
    assetUrls.value[asset.id] = url
    doc.value.assetIds.push(asset.id)
    doc.value.markdown = next
    doc.value.updatedAt = new Date().toISOString()
    return position + insertion.length
  }
  return {
    doc,
    assets,
    assetUrls,
    ready,
    saveState,
    saveError,
    recovered,
    style,
    template,
    cards,
    split,
    dirty,
    initialize,
    setMarkdown,
    setStyle,
    selectTemplate,
    resetStyle,
    replace,
    clear,
    addImage,
  }
})
