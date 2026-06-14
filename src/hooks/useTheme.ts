import { useCallback, useEffect, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'
const KEY = 'pas-theme'
const ORDER: Theme[] = ['system', 'light', 'dark']

function read(): Theme {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

function effectiveDark(theme: Theme): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function apply(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', effectiveDark(theme) ? '#0e0f12' : '#f6f7f9')
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => read())

  useEffect(() => {
    apply(theme)
  }, [theme])

  // keep the address-bar colour in sync when following the OS
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(KEY, t)
    setThemeState(t)
  }, [])

  const cycle = useCallback(() => {
    setThemeState((cur) => {
      const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]
      localStorage.setItem(KEY, next)
      return next
    })
  }, [])

  return { theme, setTheme, cycle }
}
