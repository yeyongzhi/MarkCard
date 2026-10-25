<script setup lang="ts">
import { ref } from 'vue'
import { Sun, Moon, Monitor, Check } from '@lucide/vue'
import { usePreferencesStore } from '@/stores/preferences'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

const preferences = usePreferencesStore()
const open = ref(false)
const modes = [
  { value: 'light', label: '亮色', icon: Sun },
  { value: 'dark', label: '暗色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
] as const
function select(mode: (typeof modes)[number]['value']) {
  preferences.setTheme(mode)
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child
      ><Button variant="ghost" size="icon" aria-label="选择界面外观" title="界面外观"
        ><Moon v-if="preferences.isDark" /><Sun v-else /></Button
    ></PopoverTrigger>
    <PopoverContent align="end" class="w-44" aria-label="界面外观选项">
      <div class="flex flex-col gap-1">
        <Button
          v-for="mode in modes"
          :key="mode.value"
          variant="ghost"
          class="w-full justify-start"
          :aria-pressed="preferences.theme === mode.value"
          @click="select(mode.value)"
        >
          <component :is="mode.icon" data-icon="inline-start" />{{ mode.label
          }}<Check v-if="preferences.theme === mode.value" data-icon="inline-end" class="ml-auto" />
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
