// 衣柜页本地工具函数

// 压缩图片：画到 canvas 上再导出 jpeg。
// 原因：localStorage 总共约 5MB，手机原图动辄 3-5MB，不压缩存不了几件衣服。
// maxSize 是最长边像素，quality 是清晰度（0-1），折中后单件约 50-100KB。
export function compressImage(file, maxSize = 600, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        // 铺白底：png 透明区域转 jpeg 时不会变黑
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// 时间戳 → 2026-10-28 这种格式
export function formatDate(ts) {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 感知哈希（dHash）：把图缩到 9x8、比相邻像素亮暗，得到 64 位"指纹"。
// 同一张照片（哪怕压缩过）指纹几乎一样；不同照片差异大。用来检测重复上传。
export function dhash(imageDataUrl, size = 8) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = size + 1
      const h = size
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      const px = ctx.getImageData(0, 0, w, h).data
      let bits = ''
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < size; x++) {
          // 只取红色通道近似亮度即可，相邻比较对通道不敏感
          bits += px[(y * w + x) * 4] > px[(y * w + x + 1) * 4] ? '1' : '0'
        }
      }
      let hex = ''
      for (let i = 0; i < bits.length; i += 4) {
        hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
      }
      resolve(hex)
    }
    img.onerror = () => reject(new Error('hash'))
    img.src = imageDataUrl
  })
}

// 两个哈希差几位（汉明距离）。越小越像：0-8 基本同一张图，20+ 完全不同
export function hammingDistance(hex1, hex2) {
  if (!hex1 || !hex2 || hex1.length !== hex2.length) return Infinity
  let d = 0
  for (let i = 0; i < hex1.length; i++) {
    let x = parseInt(hex1[i], 16) ^ parseInt(hex2[i], 16)
    while (x) {
      d += x & 1
      x >>= 1
    }
  }
  return d
}
