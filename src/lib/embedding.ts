import { pipeline, env } from '@xenova/transformers'

// 配置：使用 CDN 加载模型，不需要本地存储
env.allowLocalModels = false

// 单例模式：嵌入模型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingPipeline: any = null
let isLoading = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loadingPromise: Promise<any> | null = null

// 模型加载状态回调
type ProgressCallback = (progress: number, status: string) => void
let progressCallback: ProgressCallback | null = null

export function setProgressCallback(cb: ProgressCallback | null) {
  progressCallback = cb
}

// 获取嵌入模型（懒加载）
async function getEmbedder() {
  if (embeddingPipeline) return embeddingPipeline

  if (isLoading && loadingPromise) {
    return loadingPromise
  }

  isLoading = true
  progressCallback?.(0, '加载模型中...')

  loadingPromise = pipeline(
    'feature-extraction',
    'Xenova/paraphrase-multilingual-MiniLM-L12-v2', // 多语言小模型，支持中文
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progress_callback: (data: any) => {
        if (data.status === 'progress' && data.progress) {
          progressCallback?.(Math.round(data.progress), `下载模型 ${Math.round(data.progress)}%`)
        }
      }
    }
  )

  try {
    embeddingPipeline = await loadingPromise
    progressCallback?.(100, '模型就绪')
    return embeddingPipeline
  } finally {
    isLoading = false
    loadingPromise = null
  }
}

// 生成文本嵌入向量
export async function embed(text: string): Promise<number[]> {
  const embedder = await getEmbedder()
  const output = await embedder(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

// 批量生成嵌入
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embedder = await getEmbedder()
  const results: number[][] = []

  for (const text of texts) {
    const output = await embedder(text, { pooling: 'mean', normalize: true })
    results.push(Array.from(output.data))
  }

  return results
}

// 计算余弦相似度
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  return magnitude === 0 ? 0 : dotProduct / magnitude
}

// 向量搜索
export interface SearchResult<T> {
  item: T
  score: number
}

export function vectorSearch<T>(
  queryEmbedding: number[],
  items: T[],
  getEmbedding: (item: T) => number[] | undefined,
  topK: number = 10,
  threshold: number = 0.3
): SearchResult<T>[] {
  const results: SearchResult<T>[] = []

  for (const item of items) {
    const itemEmbedding = getEmbedding(item)
    if (!itemEmbedding) continue

    const score = cosineSimilarity(queryEmbedding, itemEmbedding)
    if (score >= threshold) {
      results.push({ item, score })
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

// 预热模型（可选，提前加载）
export async function warmup(): Promise<void> {
  await getEmbedder()
}

// 检查模型是否已加载
export function isModelLoaded(): boolean {
  return embeddingPipeline !== null
}
