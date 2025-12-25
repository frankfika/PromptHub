// 网站场景映射
const siteCategories = {
  'chat.openai.com': ['编程', '写作', '分析', '翻译', '效率'],
  'chatgpt.com': ['编程', '写作', '分析', '翻译', '效率'],
  'claude.ai': ['编程', '写作', '分析', '翻译', '效率'],
  'poe.com': ['编程', '写作', '分析', '翻译', '效率'],
  'midjourney.com': ['图像', '创意', '设计'],
  'discord.com': ['图像', '创意', '设计'],
  'leonardo.ai': ['图像', '创意', '设计'],
  'perplexity.ai': ['搜索', '分析', '研究'],
  'notion.so': ['写作', '效率', '笔记'],
  'gamma.app': ['PPT', '演示', '创意'],
}

// 网页端地址（开发环境用 localhost，生产环境需要改成实际部署地址）
const WEB_APP_URL = 'http://localhost:5174'

// ========== 数据同步机制 ==========
// 监听来自 Web 应用的数据同步（通过 chrome.storage 变化）
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.promptsCache) {
    console.log('收到 Web 应用数据同步:', changes.promptsCache.newValue?.length || 0, '条提示词')
  }
})

// 右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-prompt',
    title: '保存为提示词',
    contexts: ['selection', 'image']
  })
})

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-prompt') {
    if (info.selectionText) {
      // 打开网页端并传递要保存的内容
      openWebAppWithContent({
        content: info.selectionText,
        url: tab.url
      })
    } else if (info.srcUrl) {
      openWebAppWithContent({
        content: '',
        imageUrl: info.srcUrl,
        url: tab.url
      })
    }
  }
})

// 快捷键
chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-selection') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'get-selection' })
    })
  }
})

// 接收来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'save-prompt') {
    // 打开网页端保存
    openWebAppWithContent(request.data)
    // 同时发送 toast 通知
    showNotification('正在保存...', '跳转到管理页面')
    sendResponse({ success: true })
  } else if (request.action === 'get-prompts') {
    // 从 IndexedDB 获取（通过打开隐藏的网页）
    getPromptsFromWeb().then(prompts => sendResponse({ prompts }))
    return true
  } else if (request.action === 'search-prompts') {
    searchPromptsFromWeb(request.query, request.siteUrl).then(prompts => sendResponse({ prompts }))
    return true
  } else if (request.action === 'open-dashboard') {
    chrome.tabs.create({ url: WEB_APP_URL })
    sendResponse({ success: true })
  }
})

// 打开网页端并传递内容
function openWebAppWithContent(data) {
  // 通过 storage 临时存储，避免把内容放到 URL 参数里
  chrome.storage.local.set({
    pendingPrompt: {
      content: data.content || '',
      source: data.url || '',
      screenshot: data.screenshot || data.imageUrl || '',
      author: data.author || '',
      type: data.type || (data.screenshot || data.imageUrl ? 'image' : 'text'),
      timestamp: Date.now()
    }
  })

  chrome.tabs.create({ url: `${WEB_APP_URL}?action=save-from-extension` })
}

// 从网页端获取提示词（通过多种方式尝试）
async function getPromptsFromWeb() {
  // 1. 优先从 chrome.storage.local 获取（Web 应用会同步到这里）
  const result = await chrome.storage.local.get(['promptsCache', 'lastSyncTime'])
  if (result.promptsCache && result.promptsCache.length > 0) {
    return result.promptsCache
  }

  // 2. 尝试从 Web 应用页面的 localStorage 读取
  try {
    const tabs = await chrome.tabs.query({ url: WEB_APP_URL + '/*' })
    if (tabs.length > 0) {
      const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'get-local-prompts' })
      if (response?.prompts?.length > 0) {
        // 缓存到 chrome.storage
        await chrome.storage.local.set({
          promptsCache: response.prompts,
          lastSyncTime: Date.now()
        })
        return response.prompts
      }
    }
  } catch (e) {
    console.warn('从 Web 应用读取失败:', e)
  }

  // 3. 返回空数组
  return []
}

// 搜索提示词
async function searchPromptsFromWeb(query, siteUrl) {
  let prompts = await getPromptsFromWeb()

  // 按网站筛选
  prompts = matchPromptsBySite(siteUrl, prompts)

  if (!query) return prompts.slice(0, 10)

  const q = query.toLowerCase()
  return prompts.filter(p =>
    (p.title && p.title.toLowerCase().includes(q)) ||
    (p.content && p.content.toLowerCase().includes(q)) ||
    (p.description && p.description.toLowerCase().includes(q)) ||
    (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
  ).slice(0, 10)
}

// 根据网站匹配提示词
function matchPromptsBySite(url, prompts) {
  if (!url) return prompts

  try {
    const host = new URL(url).host
    let preferredCategories = []

    for (const [site, categories] of Object.entries(siteCategories)) {
      if (host.includes(site)) {
        preferredCategories = categories
        break
      }
    }

    if (preferredCategories.length === 0) {
      return prompts
    }

    // 优先匹配类别
    const matched = prompts.filter(p =>
      preferredCategories.some(cat =>
        (p.category && p.category.includes(cat)) ||
        (p.tags && p.tags.some(t => t.includes(cat)))
      )
    )

    // 补充其他
    const others = prompts.filter(p => !matched.includes(p))
    return [...matched, ...others]
  } catch {
    return prompts
  }
}

// 显示通知
function showNotification(title, message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'show-toast',
        title,
        message
      })
    }
  })
}
