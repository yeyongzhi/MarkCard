import { computed, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { defineStore } from 'pinia'

const defaults = { fontSize: 16, radius: 10 }
const storageKey = 'markcard-ui-preferences'
type Theme = 'light' | 'dark' | 'system'
const isTheme = (value: unknown): value is Theme =>
  ['light', 'dark', 'system'].includes(String(value))
function validNumber(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? Math.round(value)
    : fallback
}

export const usePreferencesStore = defineStore('preferences', () => {
  const fontSize = ref(defaults.fontSize)
  const radius = ref(defaults.radius)
  const theme = ref<Theme>('system')
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const isDark = computed(() =>
    theme.value === 'system' ? systemDark.value : theme.value === 'dark',
  )
  const storageError = ref('')
  try {
    const raw = localStorage.getItem(storageKey)
    const legacyTheme = localStorage.getItem('markcard-theme')
    if (isTheme(legacyTheme)) theme.value = legacyTheme
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved && typeof saved === 'object') {
        fontSize.value = validNumber(saved.fontSize, 12, 24, defaults.fontSize)
        radius.value = validNumber(saved.radius, 0, 24, defaults.radius)
        if (isTheme(saved.theme)) theme.value = saved.theme
      }
    }
  } catch {
    storageError.value = '无法读取本地外观设置，已使用默认值'
  }

  function apply() {
    const style = document.documentElement.style
    style.setProperty('--ui-font-size', `${fontSize.value}px`)
    style.setProperty('--ui-radius', `${radius.value}px`)
    style.setProperty('--radius', `${radius.value}px`)
  }
  apply()
  watch(
    isDark,
    (value) => {
      document.documentElement.classList.toggle('dark', value)
      document.documentElement.style.colorScheme = value ? 'dark' : 'light'
    },
    { immediate: true, flush: 'sync' },
  )
  watch(
    [fontSize, radius, theme],
    () => {
      apply()
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ fontSize: fontSize.value, radius: radius.value, theme: theme.value }),
        )
        storageError.value = ''
      } catch {
        storageError.value = '外观设置无法保存到本地，刷新后可能恢复默认值'
      }
    },
    { flush: 'sync' },
  )

  function setFontSize(value: number) {
    fontSize.value = validNumber(value, 12, 24, fontSize.value)
  }
  function setRadius(value: number) {
    radius.value = validNumber(value, 0, 24, radius.value)
  }
  function reset() {
    fontSize.value = defaults.fontSize
    radius.value = defaults.radius
    theme.value = 'system'
  }
  function setTheme(value: unknown) {
    if (isTheme(value)) theme.value = value
  }
  return { fontSize, radius, theme, isDark, storageError, setFontSize, setRadius, setTheme, reset }
})
