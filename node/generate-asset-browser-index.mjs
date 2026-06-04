import { createHash } from 'node:crypto'
import { readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd()
const base = 'asset-browser-index'
const skipDirs = new Set(['.git', 'node_modules', 'dist', 'ts', 'electron', 'node', 'agent-template', 'agent-log', 'reference'])
const typeByExt = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', avif: 'image', svg: 'image',
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', flac: 'audio',
  mp4: 'video', mov: 'video', webm: 'video', m4v: 'video',
  glb: 'model', gltf: 'model', obj: 'model', stl: 'model', fbx: 'model',
  pdf: 'document', txt: 'document', md: 'document', json: 'document',
}

function idFor(value) {
  return createHash('sha1').update(value).digest('hex').slice(0, 12)
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

async function walk(dir, prefix = '') {
  const rows = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue
      rows.push(...await walk(path.join(dir, entry.name), path.posix.join(prefix, entry.name)))
      continue
    }
    if (!entry.isFile()) continue
    if (entry.name === `${base}.json` || entry.name === `${base}.csv` || entry.name === `${base}.xlsx`) continue
    if (entry.name === 'asset-browser-metadata.json') continue

    const absolute = path.join(dir, entry.name)
    const info = await stat(absolute)
    const rel = path.posix.join(prefix, entry.name)
    const ext = path.extname(entry.name).slice(1).toLowerCase()
    rows.push({
      name: entry.name,
      path: rel,
      type: typeByExt[ext] ?? 'unknown',
      filetype: ext.toUpperCase(),
      size: Number((info.size / 1024 / 1024).toFixed(3)),
      collection: prefix.split('/').filter(Boolean).pop() ?? 'root',
      mtimeMs: info.mtimeMs,
    })
  }
  return rows
}

const rows = (await walk(root)).sort((a, b) => a.path.localeCompare(b.path))
const columns = ['name', 'path', 'type', 'filetype', 'size', 'collection']
const csv = [columns.join(','), ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(','))].join('\n')
const csvContent = `${csv}\n`
await writeFile(path.join(root, `${base}.csv`), csvContent)

try {
  const xlsxModule = await import('xlsx')
  const XLSX = xlsxModule.default ?? xlsxModule
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(rows.map((row) => Object.fromEntries(columns.map((key) => [key, row[key]]))))
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  await writeFile(path.join(root, `${base}.xlsx`), buffer)
} catch {
  console.warn('Skipped XLSX because the xlsx package is not available. Install/use SheetJS xlsx or openpyxl, then write the same columns.')
}

const now = new Date().toISOString()
const assets = rows.map((row, index) => ({
  id: idFor(`${row.name}:${row.path}:${index}`),
  name: row.name,
  kind: row.type,
  typeLabel: row.type,
  reference: row.path,
  normalizedPath: row.path,
  folder: row.path.split('/').slice(0, -1).join('/') || 'root',
  extension: row.filetype.toLowerCase(),
  size: Math.round(row.size * 1024 * 1024),
  status: 'ready',
  sourceRow: index + 2,
  tags: [],
  metadata: {
    filetype: row.filetype,
    sizeMB: String(row.size),
    collection: row.collection,
  },
  isExternal: false,
  updatedAt: row.mtimeMs,
}))

await writeFile(path.join(root, `${base}.json`), JSON.stringify({
  schemaVersion: 1,
  generatedAt: now,
  sourceRootName: path.basename(root),
  manifestSources: [{
    name: `${base}.csv`,
    kind: 'csv',
    size: Buffer.byteLength(csvContent),
    lastModified: Date.now(),
  }],
  assets,
}, null, 2))

console.log(`Wrote ${base}.csv and ${base}.json with ${rows.length} assets.`)
