const promptList = document.getElementById('promptList')
const searchInput = document.getElementById('searchInput')
const saveCurrent = document.getElementById('saveCurrent')
const openDashboard = document.getElementById('openDashboard')

// Web 应用地址（与 background.js 保持一致）
const WEB_APP_URL = 'http://localhost:5174'

// 初始化
init()

async function init() {
  await loadPrompts()

  searchInput.addEventListener('input', debounce(loadPrompts, 200))
  saveCurrent.addEventListener('click', saveCurrentPage)
  openDashboard.addEventListener('click', () => {
    // 打开 Web 应用管理页面
    chrome.tabs.create({ url: WEB_APP_URL })
  })
}

// 加载提示词列表
async function loadPrompts() {
  const query = searchInput.value.trim()
  const response = await chrome.runtime.sendMessage({
    action: 'search-prompts',
    query
  })

  const prompts = response?.prompts || []
  renderPrompts(prompts)
}

// 渲染列表
function renderPrompts(prompts) {
  if (prompts.length === 0) {
    promptList.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📝</div>
        <div class="empty-text">还没有保存任何提示词<br>选中文本后右键保存，或点击上方按钮</div>
      </div>
    `
    return
  }

  promptList.innerHTML = prompts.map(p => `
    <div class="prompt-item" data-id="${p.id}">
      <div class="prompt-title">
        ${p.isFavorite ? '<span class="fav">★</span>' : ''}
        ${escapeHtml(p.title)}
      </div>
      <div class="prompt-preview">${escapeHtml(p.content)}</div>
      <div class="prompt-meta">
        ${p.category ? `<span class="tag">${escapeHtml(p.category)}</span>` : ''}
        <span class="usage">使用 ${p.usageCount} 次</span>
      </div>
    </div>
  `).join('')

  // 绑定点击事件 - 复制
  promptList.querySelectorAll('.prompt-item').forEach(item => {
    item.addEventListener('click', async () => {
      const promptId = parseInt(item.dataset.id, 10)
      const prompt = prompts.find(p => p.id === promptId)
      if (!prompt?.content) return

      await navigator.clipboard.writeText(prompt.content)

      // 增加使用次数（更新 promptsCache）
      const result = await chrome.storage.local.get('promptsCache')
      const cachedPrompts = result.promptsCache || []
      const index = cachedPrompts.findIndex(p => p.id === promptId)
      if (index > -1) {
        cachedPrompts[index].usageCount = (cachedPrompts[index].usageCount || 0) + 1
        await chrome.storage.local.set({ promptsCache: cachedPrompts })
      }

      // 显示复制成功
      item.style.background = 'rgba(59, 130, 246, 0.2)'
      setTimeout(() => {
        item.style.background = ''
      }, 500)
    })
  })
}

// 保存当前页面内容
async function saveCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  // 获取页面选中内容或提取页面中的提示词
  chrome.tabs.sendMessage(tab.id, { action: 'extract-page-content' }, async (response) => {
    if (response?.content) {
      await chrome.runtime.sendMessage({
        action: 'save-prompt',
        data: {
          content: response.content,
          type: response.type || 'text',
          url: tab.url
        }
      })
      await loadPrompts()
    }
  })
}

// 获取所有提示词（从 promptsCache 获取）
async function getPrompts() {
  const result = await chrome.storage.local.get('promptsCache')
  return result.promptsCache || []
}

// 工具函数
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function debounce(fn, ms) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
