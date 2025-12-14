import { useState, useEffect, useCallback } from 'react'
import type { Settings } from '../types/prompt'
import { settingsDB } from '../lib/db'

// 应用主题到 DOM
function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement
  const isDark = theme === 'dark'

  // 浅色模式为默认，深色模式添加 dark class
  if (isDark) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.remove('dark')
    root.classList.add('light')
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({
    aiProvider: 'deepseek',
    theme: 'light',  // 默认浅色主题
    autoAnalyze: true,
    language: 'zh'
  })
  const [loading, setLoading] = useState(true)

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      const s = await settingsDB.get()
      setSettings(s)
      applyTheme(s.theme)
      setLoading(false)
    }
    loadSettings()
  }, [])

  // 应用主题
  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  const updateSettings = async (changes: Partial<Settings>) => {
    await settingsDB.save(changes)
    setSettings(prev => ({ ...prev, ...changes }))
  }

  const toggleTheme = useCallback(async () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark'
    await settingsDB.save({ theme: newTheme })
    setSettings(prev => ({ ...prev, theme: newTheme }))
  }, [settings.theme])

  return { settings, loading, updateSettings, toggleTheme }
}
