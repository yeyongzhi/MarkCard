<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area'
import { computed, ref } from 'vue'
import { RotateCcw } from '@lucide/vue'
import TemplateGallery from './TemplateGallery.vue'
import { useDocumentStore } from '@/stores/document'
import { fonts } from '@/templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import ColorPicker from './ColorPicker.vue'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import SettingSlider from './SettingSlider.vue'
const store = useDocumentStore()
const tab = ref('template')

const backgroundOptions = [
  ['template', '模板原色'],
  ['sage', '鼠尾草'],
  ['peach', '蜜桃'],
  ['lavender', '浅薰衣草'],
  ['ocean', '雾蓝'],
  ['solid', '自定纯色'],
]
const contrastLow = computed(() => {
  function lum(hex: string) {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722
  }
  const a = lum(store.style.textColor),
    b = lum(store.template.paper)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 4.5
})
</script>
<template>
  <div class="flex h-full min-h-0 flex-col">
    <Tabs v-model="tab" class="min-h-0 flex-1 gap-0">
      <div class="flex shrink-0 items-center gap-2 border-b p-3">
        <TabsList
          class="h-10! min-w-0 flex-1 justify-start overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <TabsTrigger value="template">模板</TabsTrigger>
          <TabsTrigger value="style">排版</TabsTrigger>
          <TabsTrigger value="background">背景</TabsTrigger>
          <TabsTrigger value="signature">署名</TabsTrigger>
        </TabsList>
        <Button
          variant="ghost"
          size="icon"
          aria-label="恢复模板默认样式"
          title="恢复模板默认样式"
          @click="store.resetStyle"
          ><RotateCcw
        /></Button>
      </div>
      <TabsContent value="template" class="min-h-0 flex-1 overflow-hidden"
        ><ScrollArea class="h-full"
          ><div class="p-4"><TemplateGallery /></div></ScrollArea
      ></TabsContent>
      <TabsContent value="style" class="settings-content min-h-0 flex-1 overflow-hidden"
        ><ScrollArea class="h-full"
          ><div class="p-4">
            <FieldGroup>
              <Field
                ><FieldLabel for="font-family">正文字体</FieldLabel
                ><Select
                  :model-value="store.style.fontFamilyId"
                  @update:model-value="(v) => store.setStyle('fontFamilyId', String(v))"
                  ><SelectTrigger id="font-family" class="w-full"><SelectValue /></SelectTrigger
                  ><SelectContent
                    ><SelectGroup
                      ><SelectItem v-for="f in fonts" :key="f.id" :value="f.id">{{
                        f.name
                      }}</SelectItem></SelectGroup
                    ></SelectContent
                  ></Select
                ></Field
              >
              <SettingSlider
                id="font-size"
                label="字号"
                :value="store.style.fontSize"
                :min="12"
                :max="72"
                unit=" px"
                @change="(v) => store.setStyle('fontSize', v)"
              />
              <SettingSlider
                id="line-height"
                label="行高"
                :value="store.style.lineHeight"
                :min="1.2"
                :max="2.4"
                :step="0.05"
                @change="(v) => store.setStyle('lineHeight', v)"
              />
              <Field
                ><FieldLabel>颜色</FieldLabel>
                <div class="grid grid-cols-1 gap-2">
                  <ColorPicker
                    id="text-color"
                    label="正文色"
                    :model-value="store.style.textColor"
                    @update:model-value="(value) => store.setStyle('textColor', value)"
                  />
                  <ColorPicker
                    id="accent-color"
                    label="强调色"
                    :model-value="store.style.accentColor"
                    @update:model-value="(value) => store.setStyle('accentColor', value)"
                  />
                </div>
                <FieldDescription v-if="contrastLow"
                  >正文与纸张对比度较低，建议加深正文颜色</FieldDescription
                ><FieldDescription v-else>正文色 / 强调色</FieldDescription></Field
              >
              <Separator />
              <SettingSlider
                id="card-width"
                label="卡片宽度"
                :value="store.style.width"
                :min="320"
                :max="1440"
                :step="10"
                unit=" px"
                @change="(v) => store.setStyle('width', v)"
              />
              <SettingSlider
                id="padding"
                label="内容边距"
                :value="store.style.padding"
                :min="16"
                :max="96"
                unit=" px"
                @change="(v) => store.setStyle('padding', v)"
              />
              <Field
                ><FieldLabel for="code-theme">代码主题</FieldLabel
                ><Select
                  :model-value="store.style.codeThemeId"
                  @update:model-value="(v) => store.setStyle('codeThemeId', String(v))"
                  ><SelectTrigger id="code-theme" class="w-full"><SelectValue /></SelectTrigger
                  ><SelectContent
                    ><SelectGroup
                      ><SelectItem value="light">浅色</SelectItem
                      ><SelectItem value="dark">深色</SelectItem></SelectGroup
                    ></SelectContent
                  ></Select
                ></Field
              >
            </FieldGroup>
          </div></ScrollArea
        ></TabsContent
      >
      <TabsContent value="background" class="settings-content min-h-0 flex-1 overflow-hidden"
        ><ScrollArea class="h-full"
          ><div class="p-4">
            <FieldGroup>
              <Field
                ><FieldLabel for="background">画布背景</FieldLabel
                ><Select
                  :model-value="store.style.backgroundId"
                  @update:model-value="(v) => store.setStyle('backgroundId', String(v))"
                  ><SelectTrigger id="background" class="w-full"><SelectValue /></SelectTrigger
                  ><SelectContent
                    ><SelectGroup
                      ><SelectItem v-for="b in backgroundOptions" :key="b[0]" :value="b[0]!">{{
                        b[1]
                      }}</SelectItem></SelectGroup
                    ></SelectContent
                  ></Select
                ></Field
              >
              <Field v-if="store.style.backgroundId === 'solid'"
                ><FieldLabel for="bg-color">背景色</FieldLabel
                ><ColorPicker
                  id="bg-color"
                  label="背景色"
                  :model-value="store.style.backgroundColor"
                  @update:model-value="(value) => store.setStyle('backgroundColor', value)"
              /></Field>
              <SettingSlider
                id="radius"
                label="纸张圆角"
                :value="store.style.radius"
                :min="0"
                :max="48"
                unit=" px"
                @change="(v) => store.setStyle('radius', v)"
              />
              <Field
                ><FieldLabel for="shadow">纸张阴影</FieldLabel
                ><Select
                  :model-value="store.style.shadowId"
                  @update:model-value="(v) => store.setStyle('shadowId', String(v))"
                  ><SelectTrigger id="shadow" class="w-full"><SelectValue /></SelectTrigger
                  ><SelectContent
                    ><SelectGroup
                      ><SelectItem value="none">无阴影</SelectItem
                      ><SelectItem value="soft">轻柔</SelectItem
                      ><SelectItem value="strong">立体</SelectItem></SelectGroup
                    ></SelectContent
                  ></Select
                ></Field
              >
              <FieldDescription>背景会包含在导出图片中</FieldDescription>
            </FieldGroup>
          </div></ScrollArea
        ></TabsContent
      >
      <TabsContent value="signature" class="settings-content min-h-0 flex-1 overflow-hidden"
        ><ScrollArea class="h-full"
          ><div class="p-4">
            <FieldGroup>
              <Field orientation="horizontal"
                ><FieldLabel for="signature-visible">显示署名</FieldLabel
                ><Switch id="signature-visible" v-model="store.doc.signature.visible"
              /></Field>
              <Field
                ><FieldLabel for="author">作者</FieldLabel
                ><Input
                  id="author"
                  v-model="store.doc.signature.author"
                  maxlength="80"
                  placeholder="你的名字"
              /></Field>
              <Field
                ><FieldLabel for="source">来源</FieldLabel
                ><Input
                  id="source"
                  v-model="store.doc.signature.source"
                  maxlength="200"
                  placeholder="专栏、书名或一句话"
              /></Field>
              <Field
                ><FieldLabel for="date-text">日期文字</FieldLabel
                ><Input
                  id="date-text"
                  v-model="store.doc.signature.dateText"
                  maxlength="40"
                  placeholder="例如：2026.10.25"
                /><FieldDescription>留空不显示</FieldDescription></Field
              >
            </FieldGroup>
          </div></ScrollArea
        ></TabsContent
      >
    </Tabs>
  </div>
</template>
