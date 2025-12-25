import { useEffect, useState } from 'react'
import { Database, Star, FolderOpen, Copy } from 'lucide-react'
import { promptDB } from '../lib/db'
import { STAT_COLORS } from '../lib/constants'

interface Stats {
  total: number
  favorites: number
  totalUsage: number
  categories: number
  tags: number
}

interface Props {
  refreshKey?: number
}

export function StatsPanel({ refreshKey }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const isDark = document.documentElement.classList.contains('dark')

  useEffect(() => {
    let cancelled = false
    promptDB.getStats().then(s => {
      if (!cancelled) setStats(s)
    })
    return () => { cancelled = true }
  }, [refreshKey])

  if (!stats) return null

  const statItems = [
    {
      icon: Database,
      label: '总数',
      value: stats.total,
      color: STAT_COLORS.total.icon,
      bg: isDark ? STAT_COLORS.total.darkBg : STAT_COLORS.total.bg
    },
    {
      icon: Copy,
      label: '使用次数',
      value: stats.totalUsage,
      color: STAT_COLORS.usage.icon,
      bg: isDark ? STAT_COLORS.usage.darkBg : STAT_COLORS.usage.bg
    },
    {
      icon: Star,
      label: '收藏',
      value: stats.favorites,
      color: STAT_COLORS.favorites.icon,
      bg: isDark ? STAT_COLORS.favorites.darkBg : STAT_COLORS.favorites.bg
    },
    {
      icon: FolderOpen,
      label: '分类',
      value: stats.categories,
      color: STAT_COLORS.categories.icon,
      bg: isDark ? STAT_COLORS.categories.darkBg : STAT_COLORS.categories.bg
    }
  ]

  return (
    <div className="mb-8">
      <div
        className="grid grid-cols-4 gap-4 p-4 rounded-2xl"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)'
        }}
      >
        {statItems.map((item, index) => (
          <div
            key={item.label}
            className="stat-card flex items-center gap-3 px-4 py-2 cursor-default"
            style={{
              borderRight: index < 3 ? '1px solid var(--border)' : 'none',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none'
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200"
              style={{ background: item.bg }}
            >
              <item.icon size={18} style={{ color: item.color }} />
            </div>
            <div>
              <div
                className="stat-value text-xl font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.value}
              </div>
              <div
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
