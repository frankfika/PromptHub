// 生成 Chrome 插件图标的脚本
// 在浏览器控制台运行，或者使用 Node.js + canvas

const sizes = [16, 48, 128]

sizes.forEach(size => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#3b82f6')
  gradient.addColorStop(1, '#8b5cf6')

  // 圆角矩形
  const radius = size * 0.22
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()

  // 闪电符号
  ctx.fillStyle = 'white'
  ctx.font = `${size * 0.6}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('⚡', size / 2, size / 2 + size * 0.05)

  // 下载
  const link = document.createElement('a')
  link.download = `icon${size}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
})
