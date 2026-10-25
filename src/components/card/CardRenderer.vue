<script setup lang="ts">
import { computed } from 'vue'
import type { CardDocument } from '@/types/document'
import { effectiveStyle, fonts, getTemplate } from '@/templates'
import { renderMarkdown } from '@/features/markdown'
const props = defineProps<{
  document: CardDocument
  markdown: string
  assets: Record<string, string>
  index?: number
  total?: number
}>()
const template = computed(() => getTemplate(props.document.templateId))
const style = computed(() => effectiveStyle(props.document))
const html = computed(() => renderMarkdown(props.markdown, props.assets))
const backgrounds: Record<string, string> = {
  sage: 'linear-gradient(135deg,#eef0df,#cddbc6)',
  peach: 'linear-gradient(135deg,#f8e3d1,#eac2b2)',
  lavender: 'linear-gradient(135deg,#e8e4f6,#c7cce9)',
  ocean: 'linear-gradient(135deg,#e1eef2,#b9d2df)',
}
const css = computed(() => ({
  width: `${style.value.width}px`,
  padding: `${Math.max(16, style.value.padding * 0.65)}px`,
  background:
    style.value.backgroundId === 'template'
      ? template.value.background
      : style.value.backgroundId === 'solid'
        ? style.value.backgroundColor
        : backgrounds[style.value.backgroundId],
  '--card-ink': style.value.textColor,
  '--card-accent': style.value.accentColor,
  '--card-paper': template.value.paper,
  '--card-font': fonts.find((f) => f.id === style.value.fontFamilyId)?.value,
  '--card-font-size': `${style.value.fontSize}px`,
  '--card-line-height': style.value.lineHeight,
  '--card-radius': `${style.value.radius}px`,
  '--card-padding': `${style.value.padding}px`,
  '--card-shadow':
    style.value.shadowId === 'none'
      ? 'none'
      : style.value.shadowId === 'strong'
        ? '0 18px 40px #00000030'
        : '0 6px 22px #0000000b',
}))
</script>
<template>
  <article
    class="export-card"
    :data-template="document.templateId"
    :data-code-theme="style.codeThemeId"
    :style="css"
  >
    <div class="card-paper">
      <div class="markcard-content" v-html="html" />
      <footer v-if="document.signature.visible" class="card-signature">
        <div><span class="signature-line" />{{ document.signature.author || '佚名' }}</div>
        <span>{{
          [document.signature.source, document.signature.dateText].filter(Boolean).join(' · ')
        }}</span>
      </footer>
      <div v-if="(total ?? 1) > 1" class="card-page">{{ (index ?? 0) + 1 }} / {{ total }}</div>
    </div>
  </article>
</template>
