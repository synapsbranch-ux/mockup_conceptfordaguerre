import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const outputDirectory = path.join(process.cwd(), 'public', 'images', 'daguerre')

const assets = [
  { id: '1ulD3VmDYty7frnenoRJGkYqsOg7KKndt', file: 'hero-executive.webp', width: 1920, quality: 82 },
  { id: '12DISDlvgaHPUQE5qHJ_do4Opvs6sq2pJ', file: 'professional-portrait.webp', width: 1000, quality: 82 },
  { id: '1TZf5hRzotCcYR5iEkTIFd9sCM84oDpDG', file: 'haiti-quebec-personal.webp', width: 1600 },
  { id: '1qOGSsIvQxXAVnunMmRIRTFYQJRiG388d', file: 'mba-achievement.webp', width: 1500 },
  { id: '1O6JTKFaZankIZs3oXRnqx5WRQrNBKCt2', file: 'datakle-hero.webp', width: 1600 },
  { id: '1hKT19ha1AdlvXlEzkZ_G0dFohXMQep56', file: 'agronomy-foundation.webp', width: 1500 },
  { id: '1pfO-otl64o3bhFozB2_8mFeKYzFWdBYN', file: 'economics-specialization.webp', width: 1500 },
  { id: '10N53WvQgO9HbzT0QmGGgEBtRxKF39tSc', file: 'monitoring-evaluation.webp', width: 1500 },
  { id: '1y-AL9is7_-iB6aRl3r2YtkP6ofzX3T54', file: 'rigorous-research.webp', width: 1500 },
  { id: '1ZBNQMUfKmX6OZzCCJ-pFm-nA4_cIm6AT', file: 'analytical-strategy.webp', width: 1500 },
  { id: '18fcTlbvyBqLhlzqm7RAW7mUVsYksvNLT', file: 'efficiency-optimization.webp', width: 1500 },
  { id: '1sZZerq1trXEt6CiVKc_VMPLPs1lwmB5u', file: 'decision-support-realtime.webp', width: 1600 },
  { id: '1yIfSHC26SgW_5fVKiZLATb3y1C_B_QY6', file: 'powerbi-project.webp', width: 1600 },
  { id: '1CjBs0zo17c0sufBW8kxg-PKlKpFBp65U', file: 'access-excel-automation.webp', width: 1600 },
  { id: '1NwjpVBq83O8UOThbJp2IMpaHeH7AO0Qj', file: 'haiti-data-impact.webp', width: 1600 },
  { id: '1F9ejkzI7oTuZzkbeagM4DVWoRuw2TlhN', file: 'haiti-data.webp', width: 1600 },
  { id: '1_95ckaW4bu_UXbexe-1pRMMd9s3fVaQF', file: 'engagement-education.webp', width: 1600 },
  { id: '1wwlS9DvGR8tSX_kFvB7gdZF1mt8vdi3u', file: 'professional-analyst.webp', width: 1500 },
  { id: '1yU5Su_1JDQrm_ubebpeny6j0Yq2BM7tc', file: 'datakle-founder.webp', width: 1500 },
  { id: '1nB7RQGPo2JbtPnNgPJ74Vo8DhwQxftL_', file: 'colleagues-event.webp', width: 1400, quality: 82 },
  { id: '19Z5cKaWAV8YHJi3NIp4r5Q2Q_wSrR1_o', file: 'university-group.webp', width: 1400, quality: 82 },
  { id: '10x5DQ6nnAageFTewC8Jp0B5e302jQPLd', file: 'daguerre-fsa-ulaval.webp', width: 1400, quality: 82 },
  { id: '1hfpsoK1OD5qCUGg6gwctGXD1LQN28vF0', file: 'university-campus.webp', width: 1600, quality: 80 },
  { id: '1MjpotyHybqH3ltQUNIEcGCluDHdqBOvx', file: 'graduation-portrait.webp', width: 1200, quality: 82 },
  { id: '1ZXVUF7DhEsO06nBiuDyf_sNa8rbxpZU2', file: 'mba-diploma.webp', width: 1200, quality: 82 },
]

async function download(asset) {
  const url = `https://drive.google.com/uc?export=download&id=${asset.id}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${asset.file}: téléchargement ${response.status}`)
  const source = Buffer.from(await response.arrayBuffer())
  const optimized = await sharp(source)
    .rotate()
    .resize({ width: asset.width, withoutEnlargement: true })
    .webp({ quality: asset.quality ?? 78, effort: 6, smartSubsample: true })
    .toBuffer()

  await writeFile(path.join(outputDirectory, asset.file), optimized)
  return { file: asset.file, before: source.length, after: optimized.length }
}

async function runPool(items, concurrency) {
  const queue = [...items]
  const results = []
  const worker = async () => {
    while (queue.length) results.push(await download(queue.shift()))
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

await mkdir(outputDirectory, { recursive: true })
const results = await runPool(assets, 4)
const before = results.reduce((sum, item) => sum + item.before, 0)
const after = results.reduce((sum, item) => sum + item.after, 0)

for (const item of results.sort((a, b) => a.file.localeCompare(b.file))) {
  console.log(`${item.file}: ${Math.round(item.before / 1024)} KB -> ${Math.round(item.after / 1024)} KB`)
}
console.log(`Total: ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB`)
