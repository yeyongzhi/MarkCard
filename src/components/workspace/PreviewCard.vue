<script setup lang="ts">
import { computed, ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import CardRenderer from '@/components/card/CardRenderer.vue'
import type { CardDocument } from '@/types/document'
import { effectiveStyle } from '@/templates'
const props = defineProps<{
  document: CardDocument
  markdown: string
  assets: Record<string, string>
  zoom: number
  index: number
  total: number
}>()
const element = ref<HTMLElement>()
const { height } = useElementSize(element)
const width = computed(() => effectiveStyle(props.document).width)
</script>
<template>
  <div
    class="relative shrink-0"
    :style="{ width: `${width * zoom}px`, height: `${height * zoom}px` }"
  >
    <div
      ref="element"
      class="absolute left-0 top-0 origin-top-left"
      :style="{ width: `${width}px`, transform: `scale(${zoom})` }"
    >
      <CardRenderer
        :document="document"
        :markdown="markdown"
        :assets="assets"
        :index="index"
        :total="total"
      />
    </div>
  </div>
</template>
