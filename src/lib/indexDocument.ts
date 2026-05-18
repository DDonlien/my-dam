import type {
  AssetIndexDoc,
  AssetRecord,
  IndexedFile,
  ManifestSnapshot,
  ManifestSource,
  SerializableAssetRecord,
} from '../types'
import {
  readJsonFileWithMeta,
  resolveIndexedFile,
  stableId,
  writeJsonFile,
} from './fileSystem'
import { parseManifest } from './manifest'

export const INDEX_FILENAME = 'asset-browser.index.json'

type FileIndex = {
  byPath: Map<string, IndexedFile>
  byBasename: Map<string, IndexedFile[]>
}

export type IndexSyncResult = {
  doc: AssetIndexDoc
  status: 'created' | 'updated' | 'loaded' | 'empty'
  reason: string
  indexLastModified?: number
}

export async function syncIndexDocument(
  root: FileSystemDirectoryHandle,
  rootName: string,
  manifests: ManifestSource[],
  fileIndex: FileIndex,
): Promise<IndexSyncResult> {
  const currentSources = createManifestSnapshots(manifests)

  let existing: { data: AssetIndexDoc; file: File } | undefined
  try {
    existing = await readJsonFileWithMeta<AssetIndexDoc>(root, INDEX_FILENAME)
  } catch {
    existing = undefined
  }

  const staleReason = getStaleReason(existing?.data, existing?.file, currentSources)
  if (!staleReason && existing) {
    return {
      doc: existing.data,
      status: 'loaded',
      reason: 'index is current',
      indexLastModified: existing.file.lastModified,
    }
  }

  if (manifests.length === 0 && !existing) {
    return {
      doc: createIndexDoc(rootName, currentSources, []),
      status: 'empty',
      reason: 'no manifests or index',
    }
  }

  const assets = await parseAllManifests(manifests, fileIndex)
  const nextDoc = createIndexDoc(rootName, currentSources, assets)
  await writeJsonFile(root, INDEX_FILENAME, nextDoc)

  return {
    doc: nextDoc,
    status: existing ? 'updated' : 'created',
    reason: staleReason ?? 'index created',
  }
}

export function hydrateIndexAssets(doc: AssetIndexDoc, fileIndex: FileIndex) {
  return doc.assets.map((asset) => {
    if (asset.isExternal) return { ...asset, status: 'external' } satisfies AssetRecord
    const indexed = resolveIndexedFile(asset.normalizedPath || asset.reference, fileIndex)
    return {
      ...asset,
      normalizedPath: indexed?.path ?? asset.normalizedPath,
      status: indexed ? 'ready' : 'missing',
      fileHandle: indexed?.handle,
    } satisfies AssetRecord
  })
}

export function createManifestSnapshots(manifests: ManifestSource[]) {
  return manifests
    .map((manifest) => ({
      name: manifest.name,
      kind: manifest.kind,
      size: manifest.size,
      lastModified: manifest.lastModified,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function parseAllManifests(
  manifests: ManifestSource[],
  fileIndex: FileIndex,
) {
  const parsed = await Promise.all(
    manifests.map(async (manifest) => {
      const assets = await parseManifest(manifest, fileIndex)
      return assets.map((asset) => ({
        ...asset,
        id: stableId(`${manifest.name}:${asset.id}`),
        metadata: {
          ...asset.metadata,
          sourceManifest: manifest.name,
        },
      }))
    }),
  )
  return parsed.flat()
}

function createIndexDoc(
  rootName: string,
  sources: ManifestSnapshot[],
  assets: AssetRecord[],
): AssetIndexDoc {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceRootName: rootName,
    manifestSources: sources,
    assets: assets.map(serializeAsset),
  }
}

function serializeAsset(asset: AssetRecord): SerializableAssetRecord {
  return {
    id: asset.id,
    name: asset.name,
    kind: asset.kind,
    typeLabel: asset.typeLabel,
    reference: asset.reference,
    normalizedPath: asset.normalizedPath,
    folder: asset.folder,
    extension: asset.extension,
    size: asset.size,
    mime: asset.mime,
    status: asset.status,
    sourceRow: asset.sourceRow,
    tags: asset.tags,
    metadata: asset.metadata,
    isExternal: asset.isExternal,
    updatedAt: asset.updatedAt,
  }
}

function getStaleReason(
  doc: AssetIndexDoc | undefined,
  indexFile: File | undefined,
  currentSources: ManifestSnapshot[],
) {
  if (!doc || !indexFile) return 'index missing'
  if (doc.schemaVersion !== 1) return 'index schema changed'
  if (!sameManifestSnapshot(doc.manifestSources, currentSources)) {
    return 'manifest set changed'
  }
  const newerSource = currentSources.find(
    (source) => source.lastModified > indexFile.lastModified,
  )
  if (newerSource) return `${newerSource.name} is newer than index`
  return ''
}

function sameManifestSnapshot(
  left: ManifestSnapshot[] = [],
  right: ManifestSnapshot[] = [],
) {
  if (left.length !== right.length) return false
  return left.every((item, index) => {
    const other = right[index]
    return (
      item.name === other.name &&
      item.kind === other.kind &&
      item.size === other.size &&
      item.lastModified === other.lastModified
    )
  })
}
