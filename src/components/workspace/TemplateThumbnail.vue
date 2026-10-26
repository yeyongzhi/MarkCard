<script setup lang="ts">
import { computed, ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import CardRenderer from '@/components/card/CardRenderer.vue'
import { Card, CardContent } from '@/components/ui/card'
import type { CardDocument } from '@/types/document'

const props = defineProps<{ templateId: string }>()
const container = ref<HTMLElement>()
const { width } = useElementSize(container)
const previewWidth = 480
const scale = computed(() => width.value / previewWidth)
const markdown =
  '# 文字排版\n\n记录日常的想法，让文字清晰有序。\n\n## 内容层次\n\n> 用合适的留白，突出重要的内容。\n\n- 清晰的标题\n- 舒适的阅读节奏\n\n```javascript\nconst note = "记录灵感"\n```'
const document = computed<CardDocument>(() => ({
  schemaVersion: 1,
  id: `thumbnail-${props.templateId}`,
  markdown,
  templateId: props.templateId,
  styleOverrides: { width: previewWidth, padding: 32 },
  signature: { visible: false, author: '', source: '', dateText: '' },
  assetIds: [],
  updatedAt: '',
}))
</script>

<template>
  <Card
    class="pointer-events-none w-full gap-0 rounded-none bg-transparent py-3 ring-0"
    aria-hidden="true"
  >
    <CardContent class="px-3">
      <span
        ref="container"
        class="template-thumbnail relative block aspect-[4/5] w-full overflow-hidden"
      >
        <span
          class="absolute left-0 top-0 block origin-top-left whitespace-normal text-left"
          :style="{ width: `${previewWidth}px`, transform: `scale(${scale})` }"
        >
          <CardRenderer :document="document" :markdown="markdown" :assets="{}" />
        </span>
      </span>
    </CardContent>
  </Card>
</template>
