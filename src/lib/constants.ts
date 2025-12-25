// 分类颜色配置
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; darkBg?: string; darkText?: string }> = {
  '写作': { bg: '#EEF2FF', text: '#6366F1', darkBg: 'rgba(99, 102, 241, 0.2)', darkText: '#A5B4FC' },
  '编程': { bg: '#ECFDF5', text: '#10B981', darkBg: 'rgba(16, 185, 129, 0.2)', darkText: '#6EE7B7' },
  '翻译': { bg: '#F5F3FF', text: '#8B5CF6', darkBg: 'rgba(139, 92, 246, 0.2)', darkText: '#C4B5FD' },
  '分析': { bg: '#FFFBEB', text: '#F59E0B', darkBg: 'rgba(245, 158, 11, 0.2)', darkText: '#FCD34D' },
  '图像': { bg: '#FDF2F8', text: '#EC4899', darkBg: 'rgba(236, 72, 153, 0.2)', darkText: '#F9A8D4' },
  '创意': { bg: '#FFF7ED', text: '#F97316', darkBg: 'rgba(249, 115, 22, 0.2)', darkText: '#FDBA74' },
  '效率': { bg: '#ECFEFF', text: '#06B6D4', darkBg: 'rgba(6, 182, 212, 0.2)', darkText: '#67E8F9' },
  '角色扮演': { bg: '#EEF2FF', text: '#6366F1', darkBg: 'rgba(99, 102, 241, 0.2)', darkText: '#A5B4FC' },
  '其他': { bg: '#F1F5F9', text: '#64748B', darkBg: 'rgba(100, 116, 139, 0.2)', darkText: '#94A3B8' },
  '未分类': { bg: '#F1F5F9', text: '#64748B', darkBg: 'rgba(100, 116, 139, 0.2)', darkText: '#94A3B8' },
}

// 获取分类颜色（支持深色模式）
export function getCategoryColor(category: string, isDark = false): { bg: string; text: string } {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['其他']
  if (isDark && colors.darkBg && colors.darkText) {
    return { bg: colors.darkBg, text: colors.darkText }
  }
  return { bg: colors.bg, text: colors.text }
}

// 预设分类列表
export const PRESET_CATEGORIES = [
  '写作',
  '编程',
  '翻译',
  '分析',
  '图像',
  '创意',
  '效率',
  '角色扮演',
  '其他'
] as const

// 统计面板颜色
export const STAT_COLORS = {
  total: { icon: '#10B981', bg: '#ECFDF5', darkBg: 'rgba(16, 185, 129, 0.15)' },
  usage: { icon: '#3B82F6', bg: '#EFF6FF', darkBg: 'rgba(59, 130, 246, 0.15)' },
  favorites: { icon: '#F59E0B', bg: '#FFFBEB', darkBg: 'rgba(245, 158, 11, 0.15)' },
  categories: { icon: '#8B5CF6', bg: '#F5F3FF', darkBg: 'rgba(139, 92, 246, 0.15)' }
}

// 模型颜色
export const MODEL_COLORS = {
  image: { bg: '#FDF2F8', text: '#EC4899', darkBg: 'rgba(236, 72, 153, 0.2)', darkText: '#F9A8D4' },
  text: { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)' }
}

// 图像模型关键词
export const IMAGE_MODEL_KEYWORDS = [
  'nanobanana',
  'midjourney',
  'dall-e',
  'dalle',
  'flux',
  'stable diffusion',
  'sd',
  'leonardo',
  'ideogram'
]

// 检查是否为图像模型
export function isImageModel(modelName?: string): boolean {
  if (!modelName) return false
  const lower = modelName.toLowerCase()
  return IMAGE_MODEL_KEYWORDS.some(keyword => lower.includes(keyword))
}
