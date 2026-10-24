import { computed, onMounted, onScopeDispose, ref } from 'vue'

export function formatHeaderDate(date: Date, timeZone?: string): string {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(date)
  return formatted.charAt(0).toLocaleUpperCase('ru-RU') + formatted.slice(1)
}

export function useCurrentDate() {
  const now = ref(new Date())
  const today = computed(() => formatHeaderDate(now.value))
  let timer: ReturnType<typeof setTimeout> | undefined

  function refresh() {
    clearTimeout(timer)
    now.value = new Date()
    // Calendar midnight accounts for local daylight-saving transitions.
    const midnight = new Date(now.value)
    midnight.setHours(24, 0, 0, 0)
    timer = setTimeout(refresh, midnight.getTime() - now.value.getTime())
  }

  onMounted(() => {
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
  })

  onScopeDispose(() => {
    clearTimeout(timer)
    window.removeEventListener('focus', refresh)
    document.removeEventListener('visibilitychange', refresh)
  })

  return { today }
}
