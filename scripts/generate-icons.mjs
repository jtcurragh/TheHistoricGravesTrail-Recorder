#!/usr/bin/env node
/**
 * Generates PWA icon PNGs and favicon from src/assets/icon.svg
 * Run: node scripts/generate-icons.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'src', 'assets', 'icon.svg')
const outDir = join(root, 'public', 'icons')

const sizes = [
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

mkdirSync(outDir, { recursive: true })

const svgBuffer = readFileSync(svgPath)

for (const { name, size } of sizes) {
  const buf = await sharp(svgBuffer).resize(size, size).png().toBuffer()
  writeFileSync(join(outDir, name), buf)
  console.log(`Generated ${name}`)
}

// favicon.ico (32x32)
const favicon32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer()
const icoBuffer = await pngToIco(favicon32)
writeFileSync(join(outDir, 'favicon.ico'), icoBuffer)
console.log('Generated favicon.ico')
