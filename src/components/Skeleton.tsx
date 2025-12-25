// 骨架屏组件 - 优雅的加载状态
interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{
        background: 'linear-gradient(90deg, var(--bg-tertiary) 0%, var(--border) 50%, var(--bg-tertiary) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style
      }}
    />
  )
}

// 卡片骨架屏
export function PromptCardSkeleton() {
  return (
    <div
      className="p-5 rounded-2xl"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)'
      }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-16 h-6" />
          <Skeleton className="w-12 h-6" />
        </div>
        <Skeleton className="w-6 h-6 rounded-full" />
      </div>

      {/* 标题 */}
      <Skeleton className="w-3/4 h-5 mb-3" />

      {/* 描述 */}
      <Skeleton className="w-full h-4 mb-2" />
      <Skeleton className="w-2/3 h-4 mb-4" />

      {/* 内容预览 */}
      <div
        className="p-3 rounded-lg mb-4"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <Skeleton className="w-full h-4 mb-2" />
        <Skeleton className="w-4/5 h-4" />
      </div>

      {/* 底部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-12 h-4" />
        </div>
        <Skeleton className="w-20 h-9 rounded-lg" />
      </div>
    </div>
  )
}

// 网格骨架屏
export function PromptGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <PromptCardSkeleton key={i} />
      ))}
    </div>
  )
}
