<script setup lang="ts">
import { RouterView } from 'vue-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { usePreferencesStore } from '@/stores/preferences'
usePreferencesStore()
</script>
<template>
  <TooltipProvider :delay-duration="300"
    ><RouterView /><Toaster position="bottom-center"
  /></TooltipProvider>
</template>
