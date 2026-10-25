<script setup lang="ts">
import { Check } from '@lucide/vue'
import { templates } from '@/templates'
import { useDocumentStore } from '@/stores/document'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemGroup,
  ItemHeader,
  ItemContent,
  ItemTitle,
  ItemActions,
} from '@/components/ui/item'
import TemplateThumbnail from './TemplateThumbnail.vue'
const store = useDocumentStore()
</script>
<template>
  <ItemGroup class="template-options grid w-full gap-2" aria-label="卡片模板">
    <Item v-for="template in templates" :key="template.id" as-child size="sm">
      <Button
        variant="ghost"
        class="h-auto w-full flex-col flex-nowrap items-stretch gap-2 whitespace-normal p-2"
        :aria-label="`应用${template.name}模板`"
        :aria-pressed="store.doc.templateId === template.id"
        @click="store.selectTemplate(template.id)"
      >
        <ItemHeader class="w-full shrink-0 basis-auto"
          ><TemplateThumbnail :template-id="template.id"
        /></ItemHeader>
        <div class="flex w-full items-center justify-between gap-2">
          <ItemContent
            ><ItemTitle>{{ template.name }}</ItemTitle></ItemContent
          >
          <ItemActions
            ><Check v-if="store.doc.templateId === template.id" aria-hidden="true"
          /></ItemActions>
        </div>
      </Button>
    </Item>
  </ItemGroup>
</template>
