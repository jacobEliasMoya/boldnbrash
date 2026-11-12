import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const [configFile, destination] = process.argv.slice(2)
assert(configFile && destination, 'Usage: node assemble.mjs config.json output-directory')
const sharp = createRequire(resolve('package.json'))('sharp')
const config = JSON.parse(await readFile(configFile, 'utf8'))
const input = (path) => resolve(dirname(resolve(configFile)), path)
const out = resolve(destination)
const { width, height } = config.canvas
assert(Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0)
assert(Array.isArray(config.frames) && config.frames.length >= 2)
await mkdir(out)

function pair(value, label) {
  assert(Array.isArray(value) && value.length === 2 && value.every(Number.isFinite), label)
  return value
}

async function raster(path, crop) {
  let image = sharp(input(path)).ensureAlpha()
  if (crop) image = image.extract(crop)
  return image.raw().toBuffer({ resolveWithObject: true })
}

function stamp(tile, left, top) {
  const frame = Buffer.alloc(width * height * 4)
  const from = Math.max(0, -left)
  const to = Math.min(tile.info.width, width - left)
  if (to <= from) return frame
  for (let row = Math.max(0, -top); row < Math.min(tile.info.height, height - top); row++) {
    const source = row * tile.info.width * 4
    tile.data.copy(frame, ((row + top) * width + left + from) * 4,
      source + from * 4, source + to * 4)
  }
  return frame
}

async function patch(frame, layer) {
  const [art, mask] = await Promise.all([raster(layer.file), raster(layer.mask)])
  for (const item of [art, mask]) {
    assert(item.info.width === width && item.info.height === height, 'Patch dimensions must match canvas')
  }
  for (let i = 0; i < frame.length; i += 4) {
    const coverage = mask.data[i] / 255 * mask.data[i + 3] / 255
    if (coverage === 0) continue
    const from = art.data[i + 3] / 255 * coverage
    const to = frame[i + 3] / 255 * (1 - coverage)
    const alpha = from + to
    for (let c = 0; c < 3; c++) {
      frame[i + c] = alpha ? Math.round((art.data[i + c] * from + frame[i + c] * to) / alpha) : 0
    }
    frame[i + 3] = Math.round(alpha * 255)
  }
}

const poseCache = new Map()
const frames = []
const timing = []
const planted = new Map()
let previousBodyX
for (const [index, entry] of config.frames.entries()) {
  assert(Number.isInteger(entry.ms) && entry.ms >= 10 && entry.ms <= 655350 && entry.ms % 10 === 0,
    'Use GIF delays from 10 to 655350 ms in 10 ms increments')
  const filename = 'frame-' + String(index).padStart(3, '0') + '.webp'
  const target = join(out, filename)
  let bodyX = null
  if (entry.keep) {
    const source = input(entry.keep)
    const meta = await sharp(source).metadata()
    assert(meta.format === 'webp' && meta.width === width && meta.height === height &&
      meta.hasAlpha && (meta.pages ?? 1) === 1, 'Approved frame must be a single transparent WebP matching the canvas')
    await copyFile(source, target)
    assert((await readFile(source)).equals(await readFile(target)), 'Approved frame changed')
  } else {
    const spec = config.poses?.[entry.pose]
    assert(spec, 'Unknown pose: ' + entry.pose)
    if (!poseCache.has(entry.pose)) poseCache.set(entry.pose, await raster(spec.file, spec.crop))
    const tile = poseCache.get(entry.pose)
    const [ax, ay] = pair(spec.anchor, 'Pose anchor is required')
    const [x, y] = pair(entry.at, 'Canvas anchor is required').map(Math.round)
    const frame = stamp(tile, Math.round(x - ax), Math.round(y - ay))
    if (entry.plant) {
      if (planted.has(entry.plant)) assert.deepEqual(planted.get(entry.plant), [x, y], 'Support foot drifted')
      planted.set(entry.plant, [x, y])
    }
    if (entry.walk) {
      assert(Number.isFinite(spec.bodyX) && ['left', 'right'].includes(config.walkDirection),
        'Walking checks require bodyX and walkDirection')
      bodyX = Math.round(x - ax) + spec.bodyX
      const sign = config.walkDirection === 'left' ? -1 : 1
      if (previousBodyX !== undefined) assert((bodyX - previousBodyX) * sign >= 0, 'Body moved backward')
      previousBodyX = bodyX
    } else {
      previousBodyX = undefined
    }
    for (const layer of entry.patches ?? []) await patch(frame, layer)
    await sharp(frame, { raw: { width, height, channels: 4 } }).webp({ lossless: true }).toFile(target)
  }
  if (entry.keep) previousBodyX = undefined
  frames.push(target)
  timing.push({ frame: filename, durationMs: entry.ms, ...(bodyX === null ? {} : { bodyX }) })
}

const gif = join(out, 'animation.gif')
await sharp(frames, { join: { animated: true } })
  .gif({ loop: 0, delay: timing.map((frame) => frame.durationMs), effort: 1, colours: 192 })
  .toFile(gif)
const check = await sharp(gif, { animated: true }).metadata()
const durationMs = timing.reduce((sum, frame) => sum + frame.durationMs, 0)
assert(check.width === width && check.pageHeight === height && check.hasAlpha, 'GIF canvas or transparency differs')
assert.equal(check.delay.reduce((sum, ms) => sum + ms, 0), durationMs, 'GIF timing differs')
await writeFile(join(out, 'timing.json'), JSON.stringify({ width, height, durationMs, frames: timing }, null, 2) + '\n')
console.log(`${frames.length} WebPs, ${check.pages} GIF frames, ${durationMs} ms`)
