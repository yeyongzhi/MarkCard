<script setup lang="ts">
import { Field, FieldLabel } from '@/components/ui/field'
import { Slider } from '@/components/ui/slider'
defineProps<{
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  id: string
}>()
const emit = defineEmits<{ change: [value: number] }>()
</script>
<template>
  <Field
    ><div class="flex items-center justify-between">
      <FieldLabel :for="id">{{ label }}</FieldLabel
      ><span class="setting-value">{{ value }}{{ unit }}</span>
    </div>
    <Slider
      :id="id"
      :aria-label="label"
      :model-value="[value]"
      :min="min"
      :max="max"
      :step="step ?? 1"
      @update:model-value="(v) => emit('change', v?.[0] ?? value)"
    />
  </Field>
</template>
