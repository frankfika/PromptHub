import { X, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import type { Settings, AIProvider } from '../types/prompt'

interface Props {
  settings: Settings
  onSave: (settings: Partial<Settings>) => void
  onClose: () => void
}

export function SettingsModal({ settings, onSave, onClose }: Props) {
  const [showKey, setShowKey] = useState(false)
  const [aiProvider, setAiProvider] = useState<AIProvider>(settings.aiProvider || 'deepseek')
  const [openaiKey, setOpenaiKey] = useState(settings.openaiKey || '')
  const [deepseekKey, setDeepseekKey] = useState(settings.deepseekKey || '')
  const [autoAnalyze, setAutoAnalyze] = useState(settings.autoAnalyze)

  const handleSave = () => {
    onSave({
      aiProvider,
      openaiKey,
      deepseekKey,
      autoAnalyze
    })
    onClose()
  }

  const currentKey = aiProvider === 'openai' ? openaiKey : deepseekKey
  const setCurrentKey = aiProvider === 'openai' ? setOpenaiKey : setDeepseekKey
  const envKey = aiProvider === 'openai'
    ? import.meta.env.VITE_OPENAI_API_KEY
    : import.meta.env.VITE_DEEPSEEK_API_KEY
  const hasEnvKey = !!envKey

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md animate-scaleIn"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            设置
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* AI 服务选择 */}
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              AI 服务
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setAiProvider('deepseek')}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: aiProvider === 'deepseek' ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: aiProvider === 'deepseek' ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${aiProvider === 'deepseek' ? 'var(--accent)' : 'var(--border)'}`
                }}
              >
                DeepSeek
              </button>
              <button
                onClick={() => setAiProvider('openai')}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: aiProvider === 'openai' ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: aiProvider === 'openai' ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${aiProvider === 'openai' ? 'var(--accent)' : 'var(--border)'}`
                }}
              >
                OpenAI
              </button>
            </div>
            <p
              className="text-xs mt-2"
              style={{ color: 'var(--text-muted)' }}
            >
              {aiProvider === 'deepseek' ? 'DeepSeek 性价比高，推荐使用' : 'OpenAI 支持图片识别功能'}
            </p>
          </div>

          {/* API Key */}
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              {aiProvider === 'openai' ? 'OpenAI' : 'DeepSeek'} API Key
              {hasEnvKey && (
                <span
                  className="ml-2 text-xs"
                  style={{ color: '#6B9E78' }}
                >
                  (已配置环境变量)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={currentKey}
                onChange={e => setCurrentKey(e.target.value)}
                placeholder={hasEnvKey ? '使用环境变量中的 Key' : 'sk-...'}
                className="w-full rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none transition-all font-mono"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p
              className="text-xs mt-2"
              style={{ color: 'var(--text-muted)' }}
            >
              用于 AI 智能提取和分析。密钥仅存储在本地浏览器。
            </p>
          </div>

          {/* 自动分析开关 */}
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <div>
              <div
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                自动分析
              </div>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                保存时自动生成标题和标签
              </p>
            </div>
            <button
              onClick={() => setAutoAnalyze(!autoAnalyze)}
              className="w-12 h-7 rounded-full transition-all duration-200 relative"
              style={{
                background: autoAnalyze ? 'var(--accent)' : 'var(--border)'
              }}
            >
              <span
                className="absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-200"
                style={{
                  left: autoAnalyze ? '26px' : '4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }}
              />
            </button>
          </div>
        </div>

        {/* 底部按钮 */}
        <div
          className="flex justify-end gap-3 p-5"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: 'var(--accent)',
              color: 'white',
              boxShadow: '0 2px 8px var(--accent-glow)'
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
