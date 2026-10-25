<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import {
  Check,
  LoaderCircle,
  PanelsTopLeft,
  ArrowDownToLine,
  CircleHelp,
  CircleAlert,
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useDocumentStore, createDocument } from '@/stores/document'
import { parseProject, serializeProject } from '@/features/persistence'
import { downloadBlob, exportCards } from '@/features/export'
import type { CardDocument, LocalAsset } from '@/types/document'
import EditorPanel from '@/components/workspace/EditorPanel.vue'
import PreviewPanel from '@/components/workspace/PreviewPanel.vue'
import PreviewZoomControls from '@/components/workspace/PreviewZoomControls.vue'
import StylePanel from '@/components/workspace/StylePanel.vue'
import GlobalSettings from '@/components/workspace/GlobalSettings.vue'
import ThemePicker from '@/components/workspace/ThemePicker.vue'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@/components/ui/select'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
const store = useDocumentStore()
const preview = ref<InstanceType<typeof PreviewPanel>>()
const isMobile = useMediaQuery('(max-width: 767px)')
const mobileTab = ref('preview')
const helpOpen = ref(false)
const importOpen = ref(false)
const exportOpen = ref(false)
const importBusy = ref(false)
const importError = ref('')
const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmDescription = ref('')
let confirmAction: (() => Promise<void> | void) | undefined
const selectedIndex = ref(0)
watch(
  () => store.cards.length,
  (count) => {
    selectedIndex.value = Math.min(selectedIndex.value, Math.max(0, count - 1))
  },
)
const exportRatio = ref(window.innerWidth < 768 ? '1' : '2')
const exportScope = ref('all')
const exporting = ref(false)
const exportDone = ref(0)
const exportTotal = ref(1)
const exportError = ref('')
let aborter: AbortController | undefined
const saveText = computed(
  () =>
    ({
      loading: '正在恢复草稿',
      saving: '正在保存',
      saved: '已保存到浏览器',
      error: '本地保存失败',
    })[store.saveState],
)
const now = ref(new Date())
let clock: ReturnType<typeof setInterval> | undefined
const timeFormat = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})
const localTime = computed(() => timeFormat.format(now.value))
function confirm(title: string, description: string, action: () => Promise<void> | void) {
  confirmTitle.value = title
  confirmDescription.value = description
  confirmAction = action
  confirmOpen.value = true
}
async function applyConfirmed() {
  try {
    await confirmAction?.()
  } catch (e) {
    toast.error(message(e))
  }
}
function message(e: unknown) {
  return e instanceof Error ? e.message : '操作失败，请重试'
}
function loadSample() {
  confirm('载入示例内容？', '这会替换当前作品与图片。可先在作品菜单中下载项目备份', async () => {
    await store.replace(createDocument())
    toast.success('示例已载入')
  })
}
function clearWork() {
  confirm(
    '清空当前作品？',
    '这会删除当前浏览器中的正文、卡片设置和本地图片，无法撤销。已下载的备份文件不受影响',
    async () => {
      await store.clear()
      toast.success('当前作品已清空')
    },
  )
}
async function backup() {
  try {
    const data = await serializeProject(
      structuredClone(toRaw(store.doc)),
      store.assets.map((a) => ({ ...toRaw(a) })),
    )
    downloadBlob(new Blob([data], { type: 'application/json' }), 'markcard-project.json')
    toast.success('项目备份已生成，包含正文、样式和图片')
  } catch (e) {
    toast.error(message(e))
  }
}
function downloadMarkdown() {
  downloadBlob(
    new Blob([store.doc.markdown], { type: 'text/markdown;charset=utf-8' }),
    'markcard.md',
  )
  toast.info(
    store.assets.length ? 'Markdown 已下载；图片需通过项目 JSON 备份保留' : 'Markdown 已下载',
  )
}
async function importFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importBusy.value = true
  importError.value = ''
  try {
    if (file.size > 35 * 1024 * 1024) throw new Error('文件超过 35MB')
    let data: { doc: CardDocument; assets: LocalAsset[] }
    if (file.name.toLowerCase().endsWith('.json')) data = await parseProject(await file.text())
    else if (/\.(md|markdown)$/i.test(file.name)) {
      const text = await file.text()
      if (text.length > 100000) throw new Error('正文超过 100,000 字符')
      data = { doc: { ...createDocument(), markdown: text }, assets: [] }
    } else throw new Error('请选择 .md、.markdown 或 MarkCard 项目 .json 文件')
    confirm(
      '用导入文件替换当前作品？',
      `已验证「${file.name}」。确认后替换正文、设置与图片，请先备份需要保留的内容`,
      async () => {
        await store.replace(data.doc, data.assets)
        importOpen.value = false
        toast.success('作品已导入')
      },
    )
  } catch (e) {
    importError.value = message(e)
  } finally {
    importBusy.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}
async function startExport() {
  if (!store.cards.length) return
  exporting.value = true
  exportDone.value = 0
  exportError.value = ''
  aborter = new AbortController()
  const indices = exportScope.value === 'all' ? store.cards.map((_, i) => i) : [selectedIndex.value]
  exportTotal.value = indices.length
  const urls = Object.fromEntries(store.assets.map((a) => [a.id, URL.createObjectURL(a.blob)]))
  try {
    const done = await exportCards(
      structuredClone(toRaw(store.doc)),
      urls,
      indices,
      Number(exportRatio.value),
      (n, total) => {
        exportDone.value = n
        exportTotal.value = total
      },
      aborter.signal,
    )
    if (aborter.signal.aborted) toast.info(`已停止，已生成 ${done} 张 PNG`)
    else toast.success(`已生成 ${done} 张 PNG，请查看浏览器下载记录`)
  } catch (e) {
    exportError.value = message(e)
  } finally {
    exporting.value = false
    Object.values(urls).forEach(URL.revokeObjectURL)
  }
}

function keydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void backup()
  }
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (store.dirty) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onMounted(async () => {
  clock = setInterval(() => {
    now.value = new Date()
  }, 1000)

  await store.initialize()
  window.addEventListener('keydown', keydown)
  window.addEventListener('beforeunload', beforeUnload)
})
onBeforeUnmount(() => {
  clearInterval(clock)
  aborter?.abort()
  window.removeEventListener('keydown', keydown)
  window.removeEventListener('beforeunload', beforeUnload)
})
</script>

<template>
  <div class="app-shell bg-muted/30">
    <Card class="shrink-0 gap-0 py-0"
      ><CardHeader class="p-4"
        ><header class="flex flex-wrap items-center gap-4">
          <a href="#/" class="flex shrink-0 items-center gap-2" aria-label="MarkCard 首页"
            ><PanelsTopLeft class="size-6" /><span>MarkCard</span></a
          >
          <div class="ml-auto flex items-center gap-2">
            <GlobalSettings />
            <Tooltip
              ><TooltipTrigger as-child
                ><span
                  class="saved-state hidden items-center sm:flex"
                  role="status"
                  :aria-label="saveText"
                  ><LoaderCircle
                    v-if="store.saveState === 'saving' || store.saveState === 'loading'"
                    class="size-4 animate-spin"
                  /><CircleAlert v-else-if="store.saveState === 'error'" class="size-4" /><Check
                    v-else
                    class="size-4"
                  /><span class="sr-only">{{ saveText }}</span></span
                ></TooltipTrigger
              ><TooltipContent>{{ saveText }}</TooltipContent></Tooltip
            >
            <ThemePicker />
            <Tooltip
              ><TooltipTrigger as-child
                ><Button
                  variant="ghost"
                  size="icon"
                  class="hidden sm:inline-flex"
                  aria-label="使用帮助"
                  @click="helpOpen = true"
                  ><CircleHelp /></Button></TooltipTrigger
              ><TooltipContent>使用帮助</TooltipContent></Tooltip
            >
            <Button :disabled="!store.ready || !store.cards.length" @click="exportOpen = true"
              ><ArrowDownToLine data-icon="inline-start" />导出卡片</Button
            >
          </div>
        </header></CardHeader
      ></Card
    >
    <Alert v-if="store.saveState === 'error'" variant="destructive" class="shrink-0 rounded-none"
      ><AlertTitle>草稿未保存</AlertTitle
      ><AlertDescription
        >{{ store.saveError
        }}<Button variant="outline" @click="backup">下载项目备份</Button></AlertDescription
      ></Alert
    >
    <Tabs v-if="isMobile" v-model="mobileTab" class="shrink-0 border-b p-2"
      ><TabsList class="w-full"
        ><TabsTrigger value="editor">编辑</TabsTrigger
        ><TabsTrigger value="preview">预览</TabsTrigger
        ><TabsTrigger value="style">样式</TabsTrigger></TabsList
      ></Tabs
    >
    <main class="workspace-main">
      <div v-if="isMobile" class="h-full min-h-0 p-px">
        <Card v-show="mobileTab === 'editor'" class="h-full min-h-0 gap-0 py-0"
          ><CardContent class="h-full min-h-0 p-3"
            ><EditorPanel
              @import="importOpen = true"
              @backup="backup"
              @download-markdown="downloadMarkdown"
              @sample="loadSample"
              @clear="clearWork" /></CardContent
        ></Card>
        <Card v-show="mobileTab === 'preview'" class="h-full min-h-0 gap-0 py-0"
          ><CardContent class="h-full min-h-0 p-3"><PreviewPanel ref="preview" /></CardContent
        ></Card>
        <Card v-show="mobileTab === 'style'" class="h-full min-h-0 gap-0 py-0"
          ><CardContent class="h-full min-h-0 p-3"><StylePanel /></CardContent
        ></Card>
      </div>
      <ResizablePanelGroup v-else direction="horizontal" class="h-full" aria-label="创作工作台">
        <ResizablePanel :default-size="30" :min-size="16" :order="1" class="min-w-0 p-px"
          ><Card class="h-full min-h-0 gap-0 py-0"
            ><CardContent class="h-full min-h-0 p-3"
              ><EditorPanel
                @import="importOpen = true"
                @backup="backup"
                @download-markdown="downloadMarkdown"
                @sample="loadSample"
                @clear="clearWork" /></CardContent></Card
        ></ResizablePanel>
        <ResizableHandle with-handle aria-label="调整编辑区宽度" />
        <ResizablePanel :default-size="44" :min-size="20" :order="2" class="min-w-0 p-px"
          ><Card class="h-full min-h-0 gap-0 py-0"
            ><CardContent class="h-full min-h-0 p-3"
              ><PreviewPanel ref="preview" /></CardContent></Card
        ></ResizablePanel>
        <ResizableHandle with-handle aria-label="调整样式区宽度" />
        <ResizablePanel :default-size="26" :min-size="20" :order="3" class="min-w-0 p-px"
          ><Card class="h-full min-h-0 gap-0 py-0"
            ><CardContent class="h-full min-h-0 p-3"
              ><aside class="h-full" aria-label="卡片样式设置">
                <StylePanel /></aside></CardContent></Card
        ></ResizablePanel>
      </ResizablePanelGroup>
    </main>
    <Card class="shrink-0 gap-0 py-0"
      ><CardFooter class="border-t-0 bg-card px-4 py-2"
        ><footer class="workspace-footer flex w-full items-center justify-between flex-wrap gap-2">
          <time :datetime="now.toISOString()" class="tabular-nums">{{ localTime }}</time>
          <PreviewZoomControls
            class="ml-auto"
            :zoom="preview?.zoom ?? 1"
            @zoom-in="preview?.zoomIn()"
            @zoom-out="preview?.zoomOut()"
            @fit="preview?.fit()"
          /></footer></CardFooter
    ></Card>
    <Dialog v-model:open="importOpen"
      ><DialogContent
        ><DialogHeader
          ><DialogTitle>导入作品</DialogTitle
          ><DialogDescription
            >导入 Markdown，或用 MarkCard
            项目备份恢复完整作品。导入前会再次确认替换</DialogDescription
          ></DialogHeader
        ><FieldGroup
          ><Field
            ><FieldLabel for="import-file">选择作品文件</FieldLabel
            ><Input
              id="import-file"
              type="file"
              accept=".md,.markdown,.json"
              :disabled="importBusy"
              @change="importFile"
            /><FieldDescription
              >.md / .markdown / .json · 最大 35MB；正文最多 100,000 字符</FieldDescription
            ></Field
          ></FieldGroup
        ><Alert v-if="importError" variant="destructive"
          ><AlertTitle>无法导入</AlertTitle
          ><AlertDescription>{{ importError }}</AlertDescription></Alert
        ></DialogContent
      ></Dialog
    >
    <Dialog
      :open="exportOpen"
      @update:open="
        (v) => {
          if (!exporting) exportOpen = v
        }
      "
      ><DialogContent
        ><DialogHeader>
          <DialogTitle>导出卡片</DialogTitle
          ><DialogDescription>导出为 PNG 图片</DialogDescription></DialogHeader
        ><FieldGroup
          ><Field
            ><FieldLabel for="export-scope">导出范围</FieldLabel
            ><Select v-model="exportScope" :disabled="exporting">
              <SelectTrigger id="export-scope" class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent
                ><SelectGroup>
                  <SelectItem value="current">当前卡片</SelectItem>
                  <SelectItem value="all">全部 {{ store.cards.length }} 张</SelectItem>
                </SelectGroup></SelectContent
              >
            </Select></Field
          ><Field v-if="exportScope === 'current' && store.cards.length > 1"
            ><FieldLabel for="export-card">选择卡片</FieldLabel
            ><Select
              :model-value="String(selectedIndex)"
              @update:model-value="
                (value) => {
                  selectedIndex = Number(value)
                }
              "
              ><SelectTrigger id="export-card" class="w-full"><SelectValue /></SelectTrigger
              ><SelectContent
                ><SelectGroup
                  ><SelectItem v-for="(_, index) in store.cards" :key="index" :value="String(index)"
                    >第 {{ index + 1 }} 张</SelectItem
                  ></SelectGroup
                ></SelectContent
              ></Select
            ></Field
          ><Field
            ><FieldLabel for="export-ratio">清晰度</FieldLabel
            ><Select v-model="exportRatio" :disabled="exporting">
              <SelectTrigger id="export-ratio" class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent
                ><SelectGroup>
                  <SelectItem value="1">1× 标准</SelectItem>
                  <SelectItem value="2">2× 高清</SelectItem>
                </SelectGroup></SelectContent
              > </Select
            ><FieldDescription
              >宽度 {{ store.style.width * Number(exportRatio) }} px ·
              保留背景与署名，不包含界面控件</FieldDescription
            ></Field
          ></FieldGroup
        >
        <p class="text-xs text-muted-foreground">
          全部导出会逐张下载。若浏览器拦截多文件下载，请允许该站点下载，或逐张导出
        </p>
        <div v-if="exporting || exportDone" class="flex flex-col gap-2" role="status">
          <Progress :model-value="(exportDone / exportTotal) * 100" /><span
            class="text-xs text-muted-foreground"
            >已生成 {{ exportDone }} / {{ exportTotal }} 张</span
          >
        </div>
        <Alert v-if="exportError" variant="destructive"
          ><AlertTitle>导出未完成</AlertTitle
          ><AlertDescription>{{ exportError }}</AlertDescription></Alert
        ><DialogFooter
          ><Button v-if="exporting" variant="outline" @click="aborter?.abort()">停止后续导出</Button
          ><Button v-else variant="outline" @click="exportOpen = false">继续创作</Button
          ><Button :disabled="exporting || !store.cards.length" @click="startExport"
            ><LoaderCircle
              v-if="exporting"
              data-icon="inline-start"
              class="animate-spin"
            /><ArrowDownToLine v-else data-icon="inline-start" />{{
              exporting ? '正在生成…' : '下载 PNG 图片'
            }}</Button
          ></DialogFooter
        ></DialogContent
      ></Dialog
    >
    <AlertDialog v-model:open="confirmOpen"
      ><AlertDialogContent
        ><AlertDialogHeader
          ><AlertDialogTitle>{{ confirmTitle }}</AlertDialogTitle
          ><AlertDialogDescription>{{
            confirmDescription
          }}</AlertDialogDescription></AlertDialogHeader
        ><AlertDialogFooter
          ><AlertDialogCancel>取消</AlertDialogCancel
          ><AlertDialogAction @click="applyConfirmed">确认</AlertDialogAction></AlertDialogFooter
        ></AlertDialogContent
      ></AlertDialog
    >

    <Dialog v-model:open="helpOpen"
      ><DialogContent
        ><DialogHeader
          ><DialogTitle>使用帮助</DialogTitle
          ><DialogDescription>编辑文字，选择模板后导出图片</DialogDescription></DialogHeader
        >
        <p>剪刀按钮插入手动分卡标记，卡片会在预览区依次排列</p>
        <p>图片按钮可插入 PNG、JPEG 或 WebP，单图不超过 5MB</p>
        <p>在编辑工具栏的更多操作中下载项目备份；清理浏览器数据会删除本地草稿</p>
      </DialogContent></Dialog
    >
  </div>
</template>
