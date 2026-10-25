<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover'
const props = defineProps<{ modelValue: string; label: string; id: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const open = ref(false)
const draft = ref(props.modelValue)
const valid = computed(() => /^#[\da-f]{6}$/i.test(draft.value))
watch(open, (value) => {
  if (value) draft.value = props.modelValue
})
watch(
  () => props.modelValue,
  (value) => {
    draft.value = value
  },
)
const colors = [
  '#ffffff',
  '#f4f4f5',
  '#a1a1aa',
  '#52525b',
  '#27272a',
  '#18181b',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#78350f',
  '#637342',
]
function choose(color: string) {
  emit('update:modelValue', color)
  open.value = false
}
function custom(value: string | number) {
  draft.value = String(value)
  if (valid.value) emit('update:modelValue', draft.value)
}
function checkColor(color: string) {
  const channels = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
  return channels[0]! * 0.299 + channels[1]! * 0.587 + channels[2]! * 0.114 > 160
    ? '#18181b'
    : '#ffffff'
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        :id="id"
        variant="outline"
        class="w-full justify-between"
        :aria-label="`${label}：${modelValue}`"
      >
        <span class="flex items-center gap-2"
          ><span
            aria-hidden="true"
            class="size-5 shrink-0 rounded-md border"
            :style="{ backgroundColor: modelValue }"
          />{{ label }}</span
        >
        <span class="uppercase">{{ modelValue }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-72 max-w-[calc(100vw-2rem)]" align="end" :aria-label="`${label}色板`">
      <PopoverHeader
        ><PopoverTitle>{{ label }}</PopoverTitle></PopoverHeader
      >
      <div class="grid grid-cols-6 gap-2" role="group" :aria-label="`${label}预设颜色`">
        <Button
          v-for="color in colors"
          :key="color"
          variant="outline"
          size="icon"
          class="relative w-full p-0"
          :aria-label="`${label} ${color}`"
          :aria-pressed="modelValue.toLowerCase() === color"
          @click="choose(color)"
        >
          <span class="absolute inset-0 rounded-md" :style="{ backgroundColor: color }" />
          <Check
            v-if="modelValue.toLowerCase() === color"
            aria-hidden="true"
            class="relative"
            :style="{ color: checkColor(color) }"
          />
        </Button>
      </div>
      <Field :data-invalid="!valid || undefined">
        <FieldLabel :for="`${id}-hex`">自定义 HEX</FieldLabel>
        <Input
          :id="`${id}-hex`"
          :model-value="draft"
          maxlength="7"
          :aria-invalid="!valid"
          :aria-label="`${label} HEX`"
          @update:model-value="custom"
        />
        <FieldError v-if="!valid">请输入 # 开头的六位颜色值</FieldError>
      </Field>
    </PopoverContent>
  </Popover>
</template>
