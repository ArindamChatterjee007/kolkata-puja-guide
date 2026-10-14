import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const output = new URL('../public/icons/', import.meta.url)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage()
  await mkdir(output, { recursive: true })
  for (const [filename, size] of [
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['icon-maskable-512.png', 512],
    ['apple-touch-icon.png', 180],
  ]) {
    const encoded = await page.evaluate((dimension) => {
      const canvas = document.createElement('canvas')
      canvas.width = dimension
      canvas.height = dimension
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas is unavailable')
      context.scale(dimension / 512, dimension / 512)
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, 512, 512)
      context.strokeStyle = '#246344'
      context.lineWidth = 18
      context.lineCap = 'round'
      context.beginPath()
      context.moveTo(170, 383)
      context.lineTo(170, 398)
      context.quadraticCurveTo(170, 410, 190, 410)
      context.lineTo(322, 410)
      context.quadraticCurveTo(342, 410, 342, 398)
      context.lineTo(342, 383)
      context.stroke()
      context.fillStyle = '#bc2f32'
      context.beginPath()
      context.moveTo(256, 379)
      context.bezierCurveTo(234, 351, 146, 265, 146, 214)
      context.bezierCurveTo(146, 153, 195, 108, 256, 108)
      context.bezierCurveTo(317, 108, 366, 153, 366, 214)
      context.bezierCurveTo(366, 265, 278, 351, 256, 379)
      context.fill()
      context.fillStyle = '#ffffff'
      context.beginPath()
      context.arc(256, 213, 40, 0, Math.PI * 2)
      context.fill()
      return canvas.toDataURL('image/png').split(',')[1]
    }, size)
    const bytes = Buffer.from(encoded, 'base64')
    await writeFile(new URL(filename, output), bytes)
    console.log(`${filename}: ${size}x${size}, ${bytes.length} bytes`)
  }
} finally {
  await browser.close()
}