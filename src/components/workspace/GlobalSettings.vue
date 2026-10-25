<script setup lang="ts">
import { Settings } from '@lucide/vue'
import { usePreferencesStore } from '@/stores/preferences'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import SettingSlider from './SettingSlider.vue'
const preferences = usePreferencesStore()
</script>

<template>
  <Sheet :modal="false">
    <Tooltip
      ><TooltipTrigger as-child
        ><SheetTrigger as-child
          ><Button variant="ghost" size="icon" aria-label="全局设置"
            ><Settings /></Button></SheetTrigger></TooltipTrigger
      ><TooltipContent>全局设置</TooltipContent></Tooltip
    >
    <SheetContent
      :show-overlay="false"
      side="right"
      class="global-settings-sheet w-full! overflow-y-auto rounded-l-xl"
    >
      <SheetHeader
        ><SheetTitle>全局设置</SheetTitle
        ><SheetDescription>即时应用到界面，卡片预览与导出保持独立</SheetDescription></SheetHeader
      >
      <FieldGroup class="px-4">
        <Field
          ><FieldLabel>外观</FieldLabel
          ><Tabs :model-value="preferences.theme" @update:model-value="preferences.setTheme"
            ><TabsList class="h-10! w-full" aria-label="界面外观"
              ><TabsTrigger value="light">亮色</TabsTrigger
              ><TabsTrigger value="dark">暗色</TabsTrigger
              ><TabsTrigger value="system">跟随系统</TabsTrigger></TabsList
            ><TabsContent
              v-for="mode in ['light', 'dark', 'system']"
              :key="mode"
              :value="mode"
              class="sr-only"
              >{{ mode === 'light' ? '亮色' : mode === 'dark' ? '暗色' : '跟随系统' }}</TabsContent
            ></Tabs
          ></Field
        >
        <SettingSlider
          id="ui-font-size"
          label="界面字号"
          :value="preferences.fontSize"
          :min="12"
          :max="24"
          unit=" px"
          @change="preferences.setFontSize"
        />
        <SettingSlider
          id="ui-radius"
          label="界面圆角"
          :value="preferences.radius"
          :min="0"
          :max="24"
          unit=" px"
          @change="preferences.setRadius"
        />
      </FieldGroup>
      <Alert v-if="preferences.storageError" variant="destructive"
        ><AlertTitle>本地保存失败</AlertTitle
        ><AlertDescription>{{ preferences.storageError }}</AlertDescription></Alert
      >
      <SheetFooter
        ><Button variant="outline" @click="preferences.reset">恢复默认</Button></SheetFooter
      >
    </SheetContent>
  </Sheet>
</template>
