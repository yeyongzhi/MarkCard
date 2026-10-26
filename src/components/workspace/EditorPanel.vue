<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  Bold,
  Italic,
  Strikethrough,
  Heading,
  Quote,
  List,
  ListOrdered,
  Link,
  Code,
  Code2,
  Table2,
  Minus,
  Scissors,
  ImagePlus,
  Undo2,
  Redo2,
  MoreHorizontal,
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useDocumentStore } from '@/stores/document'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const store = useDocumentStore()
const emit = defineEmits<{
  import: []
  backup: []
  downloadMarkdown: []
  sample: []
  clear: []
}>()
const editor = ref<{ $el: HTMLTextAreaElement }>()
const fileInput = ref<{ $el: HTMLInputElement }>()
let imageInsertion: { position: number; markdown: string; documentId: string } | undefined
const history = ref<string[]>([store.doc.markdown])
const position = ref(0)
let restoring = false
let lastEdit = 0
let boundary = true
const canUndo = computed(() => position.value > 0)
const canRedo = computed(() => position.value < history.value.length - 1)
watch(
  () => store.doc.id,
  () => {
    history.value = [store.doc.markdown]
    position.value = 0
    boundary = true
  },
)
watch(
  () => store.doc.markdown,
  (text) => {
    if (restoring || !store.ready) return
    const now = Date.now()
    if (
      !boundary &&
      now - lastEdit < 600 &&
      position.value === history.value.length - 1 &&
      position.value > 0
    ) {
      history.value[position.value] = text
    } else {
      history.value = [...history.value.slice(0, position.value + 1), text].slice(-100)
      position.value = history.value.length - 1
    }
    lastEdit = now
    boundary = false
  },
  { flush: 'sync' },
)
watch(
  () => store.ready,
  (ready) => {
    if (ready) {
      history.value = [store.doc.markdown]
      position.value = 0
    }
  },
)
function undo() {
  if (canUndo.value) restore(position.value - 1)
}
function redo() {
  if (canRedo.value) restore(position.value + 1)
}
function restore(index: number) {
  restoring = true
  position.value = index
  store.setMarkdown(history.value[index] ?? '')
  restoring = false
  boundary = true
  nextTick(() => editor.value?.$el.focus())
}
function insert(before: string, after = '', placeholder = '') {
  const el = editor.value?.$el
  const start = el?.selectionStart ?? store.doc.markdown.length
  const end = el?.selectionEnd ?? start
  const selected = store.doc.markdown.slice(start, end) || placeholder
  const text =
    store.doc.markdown.slice(0, start) + before + selected + after + store.doc.markdown.slice(end)
  if (text.length > 100000) {
    toast.error('正文最多 100,000 字符')
    return false
  }
  boundary = true
  store.setMarkdown(text)
  boundary = true
  nextTick(() => {
    el?.focus()
    el?.setSelectionRange(start + before.length, start + before.length + selected.length)
  })
  return true
}
function prefixLines(prefix: string) {
  const el = editor.value?.$el
  if (!el) return
  const start = store.doc.markdown.lastIndexOf('\n', el.selectionStart - 1) + 1
  const lineEnd = store.doc.markdown.indexOf('\n', el.selectionEnd)
  const end = lineEnd === -1 ? store.doc.markdown.length : lineEnd
  el.setSelectionRange(start, end)
  const lines = store.doc.markdown.slice(start, end).split('\n')
  const formatted = lines
    .map(
      (line, index) =>
        `${prefix === 'numbered' ? `${index + 1}. ` : prefix}${line.replace(/^#{1,6}\s+/, '')}`,
    )
    .join('\n')
  boundary = true
  const next = store.doc.markdown.slice(0, start) + formatted + store.doc.markdown.slice(end)
  if (next.length > 100000) return toast.error('正文最多 100,000 字符')
  store.setMarkdown(next)
  boundary = true
  nextTick(() => {
    el.focus()
    el.setSelectionRange(start, start + formatted.length)
  })
}
function pickImage() {
  imageInsertion = {
    position: editor.value?.$el.selectionStart ?? store.doc.markdown.length,
    markdown: store.doc.markdown,
    documentId: store.doc.id,
  }
  fileInput.value?.$el.click()
}
async function addImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    imageInsertion = undefined
    return
  }
  const insertion = imageInsertion ?? {
    position: editor.value?.$el.selectionStart ?? store.doc.markdown.length,
    markdown: store.doc.markdown,
    documentId: store.doc.id,
  }
  imageInsertion = undefined
  try {
    const cursor = await store.addImage(
      file,
      insertion.position,
      insertion.markdown,
      insertion.documentId,
    )
    await nextTick()
    editor.value?.$el.focus()
    editor.value?.$el.setSelectionRange(cursor, cursor)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '图片插入失败')
  } finally {
    input.value = ''
  }
}
function onKeydown(event: KeyboardEvent) {
  if (!event.ctrlKey && !event.metaKey) return
  const key = event.key.toLowerCase()
  if (key === 'z') {
    event.preventDefault()
    event.shiftKey ? redo() : undo()
  } else if (key === 'y') {
    event.preventDefault()
    redo()
  } else if (key === 'b') {
    event.preventDefault()
    insert('**', '**', '加粗文字')
  } else if (key === 'i') {
    event.preventDefault()
    insert('*', '*', '斜体文字')
  } else if (key === 'k') {
    event.preventDefault()
    insert('[', '](https://example.com)', '链接文字')
  }
}
const tools = [
  { label: '加粗', icon: Bold, action: () => insert('**', '**', '加粗文字') },
  { label: '斜体', icon: Italic, action: () => insert('*', '*', '斜体文字') },
  { label: '删除线', icon: Strikethrough, action: () => insert('~~', '~~', '删除线文字') },
  { label: '引用', icon: Quote, action: () => prefixLines('> ') },
  { label: '无序列表', icon: List, action: () => prefixLines('- ') },
  { label: '有序列表', icon: ListOrdered, action: () => prefixLines('numbered') },
  { label: '链接', icon: Link, action: () => insert('[', '](https://example.com)', '链接文字') },
  { label: '行内代码', icon: Code, action: () => insert('`', '`', '代码') },
  {
    label: '代码块',
    icon: Code2,
    action: () => insert('\n```javascript\n', '\n```\n', 'const message = "Hello"'),
  },
  {
    label: '表格',
    icon: Table2,
    action: () => insert('\n| 标题 | 内容 |\n| --- | --- |\n| 示例 | 示例 |\n'),
  },
  { label: '分隔线', icon: Minus, action: () => insert('\n\n---\n\n') },
  { label: '手动分卡', icon: Scissors, action: () => insert('\n\n<!-- card-break -->\n\n') },
  { label: '插入本地图片', icon: ImagePlus, action: pickImage },
]
onBeforeUnmount(() => {
  history.value = []
})
defineExpose({ undo, redo, canUndo, canRedo, insert, pickImage })
</script>

<template>
  <section class="flex h-full min-h-0 flex-col" aria-label="Markdown 编辑区域">
    <ScrollArea
      class="editor-toolbar h-16 min-w-0 shrink-0 border-b"
      scrollbar-orientation="horizontal"
      type="always"
    >
      <div
        class="flex w-max min-w-full flex-nowrap items-center gap-1 whitespace-nowrap px-2 py-2"
        role="toolbar"
        aria-label="编辑工具栏"
      >
        <Tooltip
          ><TooltipTrigger as-child
            ><Button
              variant="ghost"
              size="icon"
              aria-label="撤销"
              :disabled="!canUndo"
              @click="undo"
              ><Undo2 /></Button></TooltipTrigger
          ><TooltipContent>撤销</TooltipContent></Tooltip
        >
        <Tooltip
          ><TooltipTrigger as-child
            ><Button
              variant="ghost"
              size="icon"
              aria-label="重做"
              :disabled="!canRedo"
              @click="redo"
              ><Redo2 /></Button></TooltipTrigger
          ><TooltipContent>重做</TooltipContent></Tooltip
        >
        <Separator orientation="vertical" class="mx-1 h-5" />
        <DropdownMenu
          ><DropdownMenuTrigger as-child
            ><Button variant="ghost" size="icon" aria-label="标题级别"
              ><Heading /></Button></DropdownMenuTrigger
          ><DropdownMenuContent
            ><DropdownMenuGroup
              ><DropdownMenuItem
                v-for="level in 6"
                :key="level"
                @select="prefixLines('#'.repeat(level) + ' ')"
                >{{ level }} 级标题</DropdownMenuItem
              ></DropdownMenuGroup
            ></DropdownMenuContent
          ></DropdownMenu
        >
        <Tooltip v-for="tool in tools" :key="tool.label"
          ><TooltipTrigger as-child
            ><Button variant="ghost" size="icon" :aria-label="tool.label" @click="tool.action"
              ><component :is="tool.icon" /></Button></TooltipTrigger
          ><TooltipContent>{{ tool.label }}</TooltipContent></Tooltip
        >
        <DropdownMenu>
          <DropdownMenuTrigger as-child
            ><Button variant="ghost" size="icon" aria-label="更多操作"><MoreHorizontal /></Button
          ></DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem @select="emit('import')">导入作品</DropdownMenuItem>
              <DropdownMenuItem @select="emit('backup')">下载项目备份</DropdownMenuItem>
              <DropdownMenuItem @select="emit('downloadMarkdown')">下载 Markdown</DropdownMenuItem>
              <DropdownMenuItem @select="emit('sample')">载入示例</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup
              ><DropdownMenuItem @select="emit('clear')"
                >清空当前作品</DropdownMenuItem
              ></DropdownMenuGroup
            >
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          id="local-image"
          ref="fileInput"
          type="file"
          class="hidden"
          aria-hidden="true"
          tabindex="-1"
          accept="image/png,image/jpeg,image/webp"
          aria-label="选择本地图片"
          @change="addImage"
          @cancel="imageInsertion = undefined"
        />
      </div>
    </ScrollArea>
    <div v-if="!store.ready" class="flex flex-col gap-4 p-4">
      <Skeleton class="h-8 w-2/3" /><Skeleton class="h-40 w-full" />
    </div>
    <Textarea
      v-else
      ref="editor"
      :model-value="store.doc.markdown"
      class="markdown-editor min-h-0 flex-1 resize-none rounded-none border-0 p-4 shadow-none"
      aria-label="Markdown 正文"
      placeholder="输入 Markdown…"
      :maxlength="100000"
      spellcheck="false"
      @keydown="onKeydown"
      @update:model-value="store.setMarkdown"
    />
  </section>
</template>
