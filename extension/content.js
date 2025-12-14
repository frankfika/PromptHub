// 注入的 UI 组件
let promptSuggestionPanel = null
let toastContainer = null
let saveButton = null
let currentInputElement = null

// 初始化
init()

function init() {
  createToastContainer()
  createSelectionSaveButton()
  observeInputs()
  observeSelection()
  listenForMessages()

  // 针对特定网站添加保存按钮
  if (isSocialMediaSite()) {
    injectSaveButtons()
  }
}

// 判断是否是社交媒体网站
function isSocialMediaSite() {
  const host = window.location.host
  return host.includes('twitter.com') ||
         host.includes('x.com') ||
         host.includes('threads.net') ||
         host.includes('weibo.com') ||
         host.includes('xiaohongshu.com')
}

// 创建 Toast 容器
function createToastContainer() {
  toastContainer = document.createElement('div')
  toastContainer.id = 'prompthub-toast-container'
  document.body.appendChild(toastContainer)
}

// 创建选中文字后的悬浮保存按钮
function createSelectionSaveButton() {
  saveButton = document.createElement('button')
  saveButton.id = 'prompthub-save-btn'
  saveButton.innerHTML = '⚡ 保存提示词'
  saveButton.addEventListener('click', saveSelection)
  document.body.appendChild(saveButton)
}

// 显示 Toast
function showToast(title, message) {
  const toast = document.createElement('div')
  toast.className = 'prompthub-toast'
  toast.innerHTML = `
    <div class="prompthub-toast-icon">⚡</div>
    <div class="prompthub-toast-content">
      <div class="prompthub-toast-title">${title}</div>
      <div class="prompthub-toast-message">${message}</div>
    </div>
  `
  toastContainer.appendChild(toast)

  setTimeout(() => toast.classList.add('show'), 10)
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

// 监听文本选中
function observeSelection() {
  document.addEventListener('mouseup', (e) => {
    setTimeout(() => {
      const selection = window.getSelection().toString().trim()
      if (selection && selection.length > 20) {
        // 显示保存按钮
        const rect = window.getSelection().getRangeAt(0).getBoundingClientRect()
        saveButton.style.top = `${rect.bottom + window.scrollY + 10}px`
        saveButton.style.left = `${rect.left + window.scrollX + (rect.width / 2) - 60}px`
        saveButton.classList.add('show')
      } else {
        saveButton.classList.remove('show')
      }
    }, 10)
  })

  // 点击其他地方隐藏按钮
  document.addEventListener('mousedown', (e) => {
    if (e.target !== saveButton) {
      saveButton.classList.remove('show')
    }
  })
}

// 保存选中文本
function saveSelection() {
  const selection = window.getSelection().toString().trim()
  if (selection) {
    chrome.runtime.sendMessage({
      action: 'save-prompt',
      data: {
        content: selection,
        type: 'text',
        url: window.location.href
      }
    })
    saveButton.classList.remove('show')
  }
}

// 监听消息
function listenForMessages() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'get-selection') {
      const selection = window.getSelection().toString().trim()
      if (selection) {
        chrome.runtime.sendMessage({
          action: 'save-prompt',
          data: {
            content: selection,
            type: 'text',
            url: window.location.href
          }
        })
      }
    } else if (request.action === 'show-toast') {
      showToast(request.title, request.message)
    } else if (request.action === 'extract-page-content') {
      // 提取页面内容（优先选中内容，否则尝试智能提取）
      const selection = window.getSelection().toString().trim()
      if (selection) {
        sendResponse({ content: selection, type: 'text' })
      } else {
        const extracted = extractPageContent()
        sendResponse(extracted)
      }
    } else if (request.action === 'get-local-prompts') {
      // 从 localStorage 读取 Web 应用缓存的提示词数据
      try {
        const cached = localStorage.getItem('prompthub-cache')
        if (cached) {
          const data = JSON.parse(cached)
          sendResponse({ prompts: data.prompts || [] })
        } else {
          sendResponse({ prompts: [] })
        }
      } catch (e) {
        sendResponse({ prompts: [] })
      }
    }
    return true
  })
}

// 智能提取页面内容（针对社交媒体帖子）
function extractPageContent() {
  const host = window.location.host

  // Twitter/X
  if (host.includes('twitter.com') || host.includes('x.com')) {
    return extractTwitterContent()
  }

  // 小红书
  if (host.includes('xiaohongshu.com')) {
    return extractXiaohongshuContent()
  }

  // 微博
  if (host.includes('weibo.com')) {
    return extractWeiboContent()
  }

  // 通用：尝试提取主要内容
  return extractGenericContent()
}

// 提取 Twitter/X 帖子内容（文字 + 图片）
function extractTwitterContent(tweetElement = null) {
  // 如果没有传入特定推文，尝试获取主推文
  const tweet = tweetElement || document.querySelector('article[data-testid="tweet"]')
  if (!tweet) return null

  const tweetText = tweet.querySelector('div[data-testid="tweetText"]')
  const content = tweetText ? tweetText.textContent.trim() : ''

  // 提取图片
  const images = []
  const imgElements = tweet.querySelectorAll('img[src*="pbs.twimg.com/media"]')
  imgElements.forEach(img => {
    // 获取高清版本
    let src = img.src
    if (src.includes('?')) {
      src = src.split('?')[0] + '?format=jpg&name=large'
    }
    images.push(src)
  })

  // 提取作者
  const authorElement = tweet.querySelector('div[data-testid="User-Name"] a[role="link"]')
  const author = authorElement ? authorElement.textContent : ''

  return {
    content,
    images,
    author,
    type: images.length > 0 ? 'image' : 'text'
  }
}

// 提取小红书内容（文字 + 图片）
function extractXiaohongshuContent() {
  // 笔记内容
  const noteContent = document.querySelector('.note-content') ||
                      document.querySelector('#detail-desc') ||
                      document.querySelector('[class*="desc"]')
  const content = noteContent ? noteContent.textContent.trim() : ''

  // 提取图片
  const images = []
  const imgElements = document.querySelectorAll('.swiper-slide img, .note-image img, [class*="carousel"] img')
  imgElements.forEach(img => {
    if (img.src && !img.src.includes('avatar')) {
      images.push(img.src)
    }
  })

  // 作者
  const authorEl = document.querySelector('.user-name, [class*="author"], .name')
  const author = authorEl ? authorEl.textContent.trim() : ''

  if (content || images.length > 0) {
    return { content, images, author, type: images.length > 0 ? 'image' : 'text' }
  }
  return null
}

// 提取微博内容（文字 + 图片）
function extractWeiboContent() {
  // 微博文字
  const weiboContent = document.querySelector('.WB_text') ||
                       document.querySelector('[class*="detail_wbtext"]') ||
                       document.querySelector('[class*="Feed_body"]')
  const content = weiboContent ? weiboContent.textContent.trim() : ''

  // 提取图片
  const images = []
  const imgElements = document.querySelectorAll('.WB_pic img, [class*="pic"] img, [class*="media"] img')
  imgElements.forEach(img => {
    if (img.src && img.src.includes('sinaimg')) {
      // 获取大图版本
      let src = img.src.replace(/\/thumb\d+\//, '/large/')
      images.push(src)
    }
  })

  // 作者
  const authorEl = document.querySelector('.WB_name, [class*="head_name"]')
  const author = authorEl ? authorEl.textContent.trim() : ''

  if (content || images.length > 0) {
    return { content, images, author, type: images.length > 0 ? 'image' : 'text' }
  }
  return null
}

// 通用内容提取
function extractGenericContent() {
  // 尝试找到主要内容区域
  const selectors = [
    'article',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.content',
    'main'
  ]

  for (const selector of selectors) {
    const el = document.querySelector(selector)
    if (el) {
      const text = el.textContent.trim()
      if (text.length > 50 && text.length < 10000) {
        return { content: text, type: 'text' }
      }
    }
  }

  return null
}

// 通用：在社交媒体帖子上注入保存按钮
function injectSaveButtons() {
  const host = window.location.host

  if (host.includes('twitter.com') || host.includes('x.com')) {
    injectTwitterButtons()
  } else if (host.includes('xiaohongshu.com')) {
    injectXiaohongshuButton()
  } else if (host.includes('weibo.com') || host.includes('weibo.cn')) {
    injectWeiboButton()
  }
}

// Twitter/X 保存按钮
function injectTwitterButtons() {
  const observer = new MutationObserver(debounce(() => {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]:not([data-prompthub-injected])')
    tweets.forEach(tweet => {
      tweet.setAttribute('data-prompthub-injected', 'true')
      const actionBar = tweet.querySelector('[role="group"]')
      if (actionBar) {
        actionBar.appendChild(createInlineSaveButton(() => extractTwitterContent(tweet)))
      }
    })
  }, 500))
  observer.observe(document.body, { childList: true, subtree: true })
}

// 小红书保存按钮
function injectXiaohongshuButton() {
  setTimeout(() => {
    // 笔记详情页
    const noteContainer = document.querySelector('.note-container, .note-detail, [class*="note"]')
    if (noteContainer && !noteContainer.dataset.prompthubInjected) {
      noteContainer.dataset.prompthubInjected = 'true'
      const btn = createFloatingSaveButton(() => extractXiaohongshuContent())
      document.body.appendChild(btn)
    }
  }, 1500)
}

// 微博保存按钮
function injectWeiboButton() {
  setTimeout(() => {
    const weiboContainer = document.querySelector('.WB_detail, [class*="Feed_body"], [class*="detail"]')
    if (weiboContainer && !weiboContainer.dataset.prompthubInjected) {
      weiboContainer.dataset.prompthubInjected = 'true'
      const btn = createFloatingSaveButton(() => extractWeiboContent())
      document.body.appendChild(btn)
    }
  }, 1500)
}

// 创建内联保存按钮（用于 Twitter 推文底部）
function createInlineSaveButton(extractFn) {
  const saveBtn = document.createElement('div')
  saveBtn.className = 'prompthub-tweet-save'
  saveBtn.innerHTML = `
    <button style="
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: transparent;
      border: none;
      color: #71767b;
      font-size: 13px;
      cursor: pointer;
      border-radius: 9999px;
      transition: all 0.15s;
    " onmouseover="this.style.color='#3b82f6';this.style.background='rgba(59,130,246,0.1)'"
       onmouseout="this.style.color='#71767b';this.style.background='transparent'">
      ⚡
    </button>
  `
  saveBtn.querySelector('button').addEventListener('click', (e) => handleSaveClick(e, extractFn))
  return saveBtn
}

// 创建悬浮保存按钮（用于小红书、微博）
function createFloatingSaveButton(extractFn) {
  const btn = document.createElement('button')
  btn.id = 'prompthub-floating-save'
  btn.innerHTML = '⚡ 保存 Prompt'
  btn.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    z-index: 9999;
    padding: 12px 20px;
    background: linear-gradient(135deg, #6366F1, #8B5CF6);
    color: white;
    border: none;
    border-radius: 25px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    transition: all 0.2s;
  `
  btn.onmouseover = () => btn.style.transform = 'scale(1.05)'
  btn.onmouseout = () => btn.style.transform = 'scale(1)'
  btn.addEventListener('click', (e) => handleSaveClick(e, extractFn))
  return btn
}

// 统一处理保存点击
async function handleSaveClick(e, extractFn) {
  e.stopPropagation()
  e.preventDefault()

  const extracted = extractFn()
  if (extracted && (extracted.content || extracted.images?.length)) {
    // 如果有图片，下载第一张作为参考图
    let screenshot = null
    if (extracted.images && extracted.images.length > 0) {
      try {
        screenshot = await fetchImageAsBase64(extracted.images[0])
      } catch (err) {
        console.warn('图片下载失败:', err)
      }
    }

    chrome.runtime.sendMessage({
      action: 'save-prompt',
      data: {
        content: extracted.content,
        type: extracted.type,
        url: window.location.href,
        screenshot,
        author: extracted.author
      }
    })

    showToast('已保存', screenshot ? '含参考图' : '纯文字')
  } else {
    showToast('保存失败', '未找到内容')
  }
}

// 监听输入框焦点
function observeInputs() {
  document.addEventListener('focusin', async (e) => {
    const target = e.target
    if (isPromptInput(target)) {
      currentInputElement = target
      await showSuggestionPanel(target)
    }
  })

  document.addEventListener('focusout', (e) => {
    // 延迟隐藏，允许点击建议面板
    setTimeout(() => {
      if (promptSuggestionPanel && !promptSuggestionPanel.contains(document.activeElement)) {
        hideSuggestionPanel()
      }
    }, 200)
  })

  // 监听输入变化
  document.addEventListener('input', debounce(async (e) => {
    if (isPromptInput(e.target) && promptSuggestionPanel) {
      await updateSuggestions(e.target.value)
    }
  }, 300))
}

// 判断是否是可能需要提示词的输入框
function isPromptInput(element) {
  if (!element) return false

  const tagName = element.tagName.toLowerCase()
  if (tagName !== 'input' && tagName !== 'textarea' && !element.isContentEditable) {
    return false
  }

  // 检查常见的 AI 工具输入框特征
  const indicators = [
    'prompt', 'chat', 'message', 'ask', 'query', 'input', 'compose',
    'gpt', 'claude', 'ai', 'assistant', 'conversation'
  ]

  const text = [
    element.placeholder,
    element.getAttribute('aria-label'),
    element.className,
    element.id,
    element.name
  ].filter(Boolean).join(' ').toLowerCase()

  return indicators.some(ind => text.includes(ind))
}

// 显示建议面板
async function showSuggestionPanel(inputElement) {
  if (!promptSuggestionPanel) {
    promptSuggestionPanel = document.createElement('div')
    promptSuggestionPanel.id = 'prompthub-suggestion-panel'
    document.body.appendChild(promptSuggestionPanel)
  }

  // 获取输入框位置
  const rect = inputElement.getBoundingClientRect()
  promptSuggestionPanel.style.top = `${rect.bottom + window.scrollY + 8}px`
  promptSuggestionPanel.style.left = `${rect.left + window.scrollX}px`
  promptSuggestionPanel.style.width = `${Math.min(rect.width, 400)}px`

  await updateSuggestions('')
  promptSuggestionPanel.classList.add('show')
}

// 隐藏建议面板
function hideSuggestionPanel() {
  if (promptSuggestionPanel) {
    promptSuggestionPanel.classList.remove('show')
  }
  currentInputElement = null
}

// 更新建议列表
async function updateSuggestions(query) {
  if (!promptSuggestionPanel) return

  const response = await chrome.runtime.sendMessage({
    action: 'search-prompts',
    query,
    siteUrl: window.location.href  // 传递当前网站用于场景匹配
  })

  const prompts = response?.prompts || []

  if (prompts.length === 0) {
    promptSuggestionPanel.innerHTML = `
      <div class="prompthub-empty">
        <span>暂无提示词</span>
        <a href="#" class="prompthub-link">去添加</a>
      </div>
    `
    return
  }

  promptSuggestionPanel.innerHTML = `
    <div class="prompthub-header">
      <span>⚡ 推荐提示词</span>
      <span class="prompthub-hint">点击插入</span>
    </div>
    <div class="prompthub-list">
      ${prompts.map((p, i) => `
        <div class="prompthub-item" data-index="${i}" data-content="${escapeHtml(p.content)}">
          <div class="prompthub-item-title">${escapeHtml(p.title)}</div>
          <div class="prompthub-item-preview">${escapeHtml(p.content.slice(0, 80))}${p.content.length > 80 ? '...' : ''}</div>
          ${p.category ? `<span class="prompthub-item-tag">${escapeHtml(p.category)}</span>` : ''}
        </div>
      `).join('')}
    </div>
  `

  // 绑定点击事件
  promptSuggestionPanel.querySelectorAll('.prompthub-item').forEach(item => {
    item.addEventListener('click', () => {
      insertPrompt(item.dataset.content)
    })
  })
}

// 插入提示词到输入框
function insertPrompt(content) {
  if (!currentInputElement) return

  if (currentInputElement.isContentEditable) {
    document.execCommand('insertText', false, content)
  } else {
    const start = currentInputElement.selectionStart
    const end = currentInputElement.selectionEnd
    const value = currentInputElement.value
    currentInputElement.value = value.slice(0, start) + content + value.slice(end)
    currentInputElement.selectionStart = currentInputElement.selectionEnd = start + content.length

    // 触发 input 事件
    currentInputElement.dispatchEvent(new Event('input', { bubbles: true }))
  }

  hideSuggestionPanel()
  currentInputElement.focus()
}

// 工具函数

// 下载图片并转为 base64（支持多种方式）
async function fetchImageAsBase64(url) {
  // 方法1: 尝试使用 canvas 从已有 img 元素获取（避免 CORS）
  const existingImg = document.querySelector(`img[src="${url}"], img[src*="${url.split('?')[0]}"]`)
  if (existingImg && existingImg.complete) {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = existingImg.naturalWidth
      canvas.height = existingImg.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(existingImg, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.9)
    } catch (e) {
      console.warn('Canvas 方式失败，尝试 fetch:', e)
    }
  }

  // 方法2: 直接 fetch（可能有 CORS 问题）
  try {
    const response = await fetch(url, { mode: 'cors' })
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('Fetch 方式失败:', e)
    // 返回原始 URL，让 web app 处理
    return url
  }
}

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
