# ⚡ PromptHub

极简、极客的提示词管理工具。

## 功能特性

### 核心功能
- **一键保存** - 选中文字/图片，右键或快捷键保存
- **图片 OCR** - 截图中的提示词自动识别提取
- **智能分析** - AI 自动生成标题、描述、标签
- **模板变量** - 支持 `{{变量}}` 语法，使用时动态填充

### 智能推荐
- **场景匹配** - 根据当前网站自动推荐对应类型的提示词
  - ChatGPT/Claude → 优先推荐编程、写作类
  - Midjourney/Leonardo → 优先推荐图像、创意类
  - Perplexity → 优先推荐搜索、分析类
- **输入框检测** - 在 AI 工具输入框自动弹出推荐面板

### 数据管理
- **导入/导出** - 支持 JSON、Markdown、CSV 格式
- **版本历史** - 自动保存修改记录，支持回滚
- **本地存储** - 数据存在浏览器，隐私安全
- **统计面板** - 查看提示词使用情况

### 社媒支持
- **X/Twitter** - 每条推文下方有 ⚡ 一键保存按钮
- **小红书/微博** - 智能提取帖子内容

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 Web 管理界面

```bash
npm run dev
```

### 3. 安装 Chrome 插件

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `extension` 文件夹

## 使用方式

### 保存提示词

| 方式 | 操作 |
|------|------|
| 选中保存 | 选中文字 → 点击悬浮的「⚡ 保存」按钮 |
| 右键保存 | 选中文字 → 右键 → 「保存为提示词」 |
| 快捷键 | `Alt + S` 保存当前选中内容 |
| 图片识别 | 新建提示词 → 点击「图片识别」上传截图 |
| 社媒推文 | 在 X/Twitter 推文底部点击 ⚡ 按钮 |

### 使用提示词

1. 在 ChatGPT、Claude 等 AI 工具的输入框点击
2. 自动弹出推荐面板（根据网站智能排序）
3. 点击即可插入
4. 如果提示词包含 `{{变量}}`，会弹出填充界面

### 导入/导出

- 侧边栏点击「导入/导出」
- 支持 JSON（完整数据）、Markdown（易读）、CSV（Excel 编辑）

## 技术栈

- **前端**: React + TypeScript + Vite + Tailwind CSS
- **存储**: IndexedDB (Dexie.js)
- **AI**: OpenAI API (GPT-4o 用于 OCR 和分析)
- **插件**: Chrome Extension Manifest V3

## 项目结构

```
prompt-hub/
├── src/                    # Web 管理界面
│   ├── components/         # React 组件
│   │   ├── PromptCard.tsx      # 提示词卡片
│   │   ├── PromptModal.tsx     # 新建/编辑（支持 OCR、版本历史）
│   │   ├── UsePromptModal.tsx  # 使用时填充变量
│   │   ├── ImportExportModal.tsx
│   │   ├── StatsPanel.tsx      # 统计面板
│   │   └── ...
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/
│   │   ├── db.ts           # IndexedDB 数据库
│   │   ├── ai.ts           # AI 分析、OCR、场景匹配
│   │   └── io.ts           # 导入导出
│   └── types/              # TypeScript 类型
├── extension/              # Chrome 插件
│   ├── manifest.json
│   ├── background.js       # 场景匹配逻辑
│   ├── content.js          # 页面注入（保存按钮、推荐面板）
│   └── popup.html/js
└── dist/                   # 构建输出
```

## 配置

在 Web 管理界面的「设置」中配置：

- **OpenAI API Key**: 用于 AI 自动分析和图片 OCR
- **自动分析**: 保存时自动生成标题和标签

## 模板变量示例

```
你是一个{{角色}}专家。请帮我{{任务}}，要求：
1. {{要求1}}
2. {{要求2}}
```

使用时会弹出填充界面，输入各变量值后复制完整内容。

## License

MIT
