import type {
  AppStateDoc,
  AssetRecord,
  FavoriteCollection,
  FavoriteEntry,
  HistoryEntry,
} from '../types'
import { stableId } from './fileSystem'

export const STATE_FILENAME = 'asset-browser-metadata.json'
const LOCAL_STORAGE_KEY = 'asset-browser.state.v1'

export function createEmptyState(): AppStateDoc {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    favorites: [
      { id: stableId('collection:精选'), name: '精选', entries: [] },
      { id: stableId('collection:待处理'), name: '待处理', entries: [] },
    ],
    history: [],
    renames: [],
    assetTags: {},
    assetRatings: {},
  }
}

export function loadLocalState() {
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!raw) return createEmptyState()
  try {
    return normalizeState(JSON.parse(raw))
  } catch {
    return createEmptyState()
  }
}

export function saveLocalState(state: AppStateDoc) {
  window.localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(touchState(state), null, 2),
  )
}

export function normalizeState(value: unknown): AppStateDoc {
  const incoming = value as Partial<AppStateDoc>
  return {
    ...createEmptyState(),
    ...incoming,
    schemaVersion: 1,
    favorites: Array.isArray(incoming.favorites)
      ? incoming.favorites.map(normalizeCollection)
      : createEmptyState().favorites,
    history: Array.isArray(incoming.history) ? incoming.history.slice(0, 120) : [],
    renames: Array.isArray(incoming.renames) ? incoming.renames : [],
    assetTags: normalizeAssetTags(incoming.assetTags),
    assetRatings: normalizeAssetRatings(incoming.assetRatings),
  }
}

export function touchState(state: AppStateDoc): AppStateDoc {
  return { ...state, updatedAt: new Date().toISOString() }
}

export function addHistory(state: AppStateDoc, asset: AssetRecord): AppStateDoc {
  const entry: HistoryEntry = {
    id: asset.id,
    name: asset.name,
    kind: asset.kind,
    reference: asset.reference,
    normalizedPath: asset.normalizedPath,
    openedAt: new Date().toISOString(),
  }
  return touchState({
    ...state,
    history: [entry, ...state.history.filter((item) => item.id !== asset.id)].slice(
      0,
      120,
    ),
  })
}

export function addFavoriteCollection(state: AppStateDoc, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return state
  if (state.favorites.some((item) => item.name === trimmed)) return state
  return touchState({
    ...state,
    favorites: [
      ...state.favorites,
      { id: stableId(`collection:${trimmed}:${Date.now()}`), name: trimmed, entries: [] },
    ],
  })
}

export function addAssetsToCollections(
  state: AppStateDoc,
  assets: AssetRecord[],
  collectionIds: string[],
) {
  if (assets.length === 0 || collectionIds.length === 0) return state
  const selected = new Set(collectionIds)
  return touchState({
    ...state,
    favorites: state.favorites.map((collection) => {
      if (!selected.has(collection.id)) return collection
      const existing = new Map(collection.entries.map((entry) => [entry.id, entry]))
      assets.forEach((asset) => existing.set(asset.id, toFavoriteEntry(asset)))
      return { ...collection, entries: Array.from(existing.values()) }
    }),
  })
}

export function removeAssetsFromCollection(
  state: AppStateDoc,
  assetIds: string[],
  collectionId: string,
) {
  const selected = new Set(assetIds)
  return touchState({
    ...state,
    favorites: state.favorites.map((collection) =>
      collection.id === collectionId
        ? {
            ...collection,
            entries: collection.entries.filter((entry) => !selected.has(entry.id)),
          }
        : collection,
    ),
  })
}

export function recordRename(
  state: AppStateDoc,
  asset: AssetRecord,
  nextPath: string,
) {
  return touchState({
    ...state,
    renames: [
      {
        id: asset.id,
        from: asset.normalizedPath,
        to: nextPath,
        renamedAt: new Date().toISOString(),
      },
      ...state.renames,
    ].slice(0, 200),
  })
}

export function setAssetTags(
  state: AppStateDoc,
  asset: AssetRecord,
  tags: string[],
) {
  const nextTags = tags.map((tag) => tag.trim()).filter(Boolean)
  const assetTags = { ...state.assetTags }
  if (nextTags.length === 0) delete assetTags[asset.id]
  else assetTags[asset.id] = Array.from(new Set(nextTags))
  return touchState({ ...state, assetTags })
}

export function setAssetRating(
  state: AppStateDoc,
  asset: AssetRecord,
  rating: number,
) {
  const assetRatings = { ...state.assetRatings }
  if (rating < 1 || rating > 5) delete assetRatings[asset.id]
  else assetRatings[asset.id] = rating
  return touchState({ ...state, assetRatings })
}

function normalizeCollection(collection: FavoriteCollection): FavoriteCollection {
  return {
    id: collection.id || stableId(`collection:${collection.name}`),
    name: collection.name || '未命名',
    entries: Array.isArray(collection.entries) ? collection.entries : [],
  }
}

function toFavoriteEntry(asset: AssetRecord): FavoriteEntry {
  return {
    id: asset.id,
    name: asset.name,
    kind: asset.kind,
    reference: asset.reference,
    normalizedPath: asset.normalizedPath,
    addedAt: new Date().toISOString(),
  }
}

function normalizeAssetTags(value: unknown) {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([assetId, tags]) => [
        assetId,
        Array.isArray(tags)
          ? Array.from(new Set(tags.map((tag) => String(tag).trim()).filter(Boolean)))
          : [],
      ])
      .filter(([, tags]) => tags.length > 0),
  )
}

function normalizeAssetRatings(value: unknown) {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([assetId, rating]) => [assetId, Number(rating)] as const)
      .filter(([, rating]) => Number.isInteger(rating) && rating >= 1 && rating <= 5),
  ) as Record<string, number>
}
