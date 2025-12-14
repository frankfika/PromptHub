import { useEffect, useState } from 'react'
import { Database, Star, FolderOpen, Copy } from 'lucide-react'
import { promptDB } from '../lib/db'

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
      color: '#10B981',
      bg: '#ECFDF5'
    },
    {
      icon: Copy,
      label: '使用次数',
      value: stats.totalUsage,
      color: '#3B82F6',
      bg: '#EFF6FF'
    },
    {
      icon: Star,
      label: '收藏',
      value: stats.favorites,
      color: '#F59E0B',
      bg: '#FFFBEB'
    },
    {
      icon: FolderOpen,
      label: '分类',
      value: stats.categories,
      color: '#8B5CF6',
      bg: '#F5F3FF'
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
            className="flex items-center gap-3 px-4 py-2"
            style={{
              borderRight: index < 3 ? '1px solid var(--border)' : 'none'
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: item.bg }}
            >
              <item.icon size={18} style={{ color: item.color }} />
            </div>
            <div>
              <div
                className="text-xl font-semibold"
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
