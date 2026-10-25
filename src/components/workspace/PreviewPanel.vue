<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRaw, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import { FileText } from '@lucide/vue'
import { useDocumentStore } from '@/stores/document'
import { splitCards } from '@/features/markdown'
import { effectiveStyle } from '@/templates'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import PreviewCard from './PreviewCard.vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CardDocument } from '@/types/document'
const store = useDocumentStore()
const area = ref<InstanceType<typeof ScrollArea>>()
const { width } = useElementSize(area)
const manualZoom = ref<number | null>(null)
const snapshot = ref<CardDocument>(structuredClone(toRaw(store.doc)))
let timer: ReturnType<typeof setTimeout>
watch(
  () => store.doc,
  () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      snapshot.value = structuredClone(toRaw(store.doc))
    }, 150)
  },
  { deep: true },
)
const cards = computed(() => splitCards(snapshot.value.markdown).cards)
const zoom = computed(
  () =>
    manualZoom.value ??
    Math.max(0.1, Math.min(1, (width.value - 48) / effectiveStyle(snapshot.value).width)),
)
onBeforeUnmount(() => clearTimeout(timer))
defineExpose({
  zoom,
  zoomIn: () => {
    manualZoom.value = Math.min(1.5, zoom.value + 0.1)
  },
  zoomOut: () => {
    manualZoom.value = Math.max(0.1, zoom.value - 0.1)
  },
  fit: () => {
    manualZoom.value = null
  },
})
</script>
<template>
  <section class="flex h-full min-h-0 flex-col" aria-label="卡片预览">
    <ScrollArea ref="area" class="min-h-0 flex-1 bg-card">
      <div class="preview-canvas flex min-h-full flex-col items-center gap-6 p-6">
        <PreviewCard
          v-for="(card, index) in cards"
          :key="index"
          :document="snapshot"
          :markdown="card"
          :assets="store.assetUrls"
          :zoom="zoom"
          :index="index"
          :total="cards.length"
        />
        <Empty v-if="!cards.length" class="m-auto"
          ><EmptyHeader
            ><EmptyMedia variant="icon"><FileText /></EmptyMedia
            ><EmptyTitle>输入文字后预览</EmptyTitle></EmptyHeader
          ></Empty
        >
      </div>
    </ScrollArea>
  </section>
</template>
