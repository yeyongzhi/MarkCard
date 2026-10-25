<script setup lang="ts">
import { Maximize2, Minus, Plus } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
defineProps<{ zoom: number }>()
const emit = defineEmits<{ zoomIn: []; zoomOut: []; fit: [] }>()
</script>
<template>
  <div class="flex shrink-0 items-center justify-end gap-2" role="toolbar" aria-label="预览缩放">
    <Tooltip
      ><TooltipTrigger as-child
        ><Button variant="ghost" size="icon" aria-label="缩小预览" @click="emit('zoomOut')"
          ><Minus /></Button></TooltipTrigger
      ><TooltipContent>缩小</TooltipContent></Tooltip
    >
    <span class="min-w-12 text-center tabular-nums">{{ Math.round(zoom * 100) }}%</span>
    <Tooltip
      ><TooltipTrigger as-child
        ><Button variant="ghost" size="icon" aria-label="放大预览" @click="emit('zoomIn')"
          ><Plus /></Button></TooltipTrigger
      ><TooltipContent>放大</TooltipContent></Tooltip
    >
    <Separator orientation="vertical" class="mx-1 h-5" />
    <Tooltip
      ><TooltipTrigger as-child
        ><Button variant="ghost" size="icon" aria-label="适应画布" @click="emit('fit')"
          ><Maximize2 /></Button></TooltipTrigger
      ><TooltipContent>适应画布</TooltipContent></Tooltip
    >
  </div>
</template>
