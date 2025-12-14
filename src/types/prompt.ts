export interface PromptVersion {
  content: string
  updatedAt: Date
  note?: string
}

// 提示词用途类型
export type PromptType = 'text' | 'image' | 'code' | 'video' | 'audio' | 'other'

// 预设分类
export const PRESET_CATEGORIES = [
  { value: '写作', icon: 'pen', color: 'blue' },
  { value: '编程', icon: 'code', color: 'green' },
  { value: '翻译', icon: 'languages', color: 'purple' },
  { value: '分析', icon: 'chart', color: 'orange' },
  { value: '图像', icon: 'image', color: 'pink' },
  { value: '创意', icon: 'sparkles', color: 'yellow' },
  { value: '效率', icon: 'zap', color: 'cyan' },
  { value: '角色扮演', icon: 'user', color: 'red' },
  { value: '其他', icon: 'folder', color: 'gray' },
] as const

// 常见 AI 模型（图像模型放前面，更常用）
export const AI_MODELS = [
  // 图像生成
  'nanobanana2',
  'nanobanana3',
  'Midjourney',
  'DALL-E',
  'Stable Diffusion',
  'Flux',
  // 文本
  'GPT-4o',
  'Claude',
  'Gemini',
  'DeepSeek',
  // 其他
  'Suno',
  'Runway',
] as const

// 热门模型（快捷选择）
export const HOT_MODELS = ['nanobanana2', 'nanobanana3', 'Midjourney', 'GPT-4o', 'Claude'] as const

export interface Prompt {
  id?: number
  content: string
  title: string
  description: string
  tags: string[]
  category: string
  promptType?: PromptType  // 提示词用途类型
  targetModel?: string     // 适用模型（可选）
  source: {
    url?: string
    type: 'text' | 'image' | 'mixed'
    screenshot?: string  // base64
  }
  // 模板变量
  variables?: string[]  // 解析出的 {{变量}}
  // 版本历史
  versions?: PromptVersion[]
  // 元数据
  embedding?: number[]  // for semantic search
  createdAt: Date
  updatedAt: Date
  usageCount: number
  isFavorite: boolean
}

// AI 服务提供商
export type AIProvider = 'openai' | 'deepseek'

export interface Settings {
  id?: number
  aiProvider: AIProvider
  openaiKey?: string
  deepseekKey?: string
  theme: 'dark' | 'light'
  autoAnalyze: boolean
  language: 'zh' | 'en'
}

// ========== 自然语言权限系统 ==========
// 用自然语言描述权限规则，AI 理解后自动过滤

export interface AccessRule {
  id?: number
  name: string           // 规则名称，如 "实习生规则"
  description: string    // 自然语言描述，如 "不能看财务相关的提示词，不能看薪资信息"
  appliesTo: string[]    // 适用的用户/角色，如 ["实习生", "临时员工"]
  isActive: boolean
  createdAt: Date
}

export interface User {
  id?: number
  name: string
  role: string          // 角色，如 "实习生"、"正式员工"、"管理员"
  department?: string   // 部门
  customRules?: string  // 用户特定的自然语言规则
}

// 导出格式
export type ExportFormat = 'json' | 'markdown' | 'csv'
