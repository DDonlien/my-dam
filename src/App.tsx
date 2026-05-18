import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Download,
  Eye,
  FolderOpen,
  Image as ImageIcon,
  ListFilter,
  Lock,
  MousePointerClick,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react'
import './App.css'
import { InlineAudioPlayer } from './components/InlineAudioPlayer'
import { PreviewPane } from './components/PreviewPane'
import {
  buildFileIndex,
  copyFileToDirectory,
  deleteFileAtPath,
  findManifestFiles,
  getExtension,
  pickDirectory,
  readJsonFile,
  renameFileAtPath,
  stableId,
  supportsFileSystemAccess,
} from './lib/fileSystem'
import {
  hydrateIndexAssets,
  INDEX_FILENAME,
  syncIndexDocument,
} from './lib/indexDocument'
import { getKindLabel, isExternalReference, parseManifest } from './lib/manifest'
import {
  addAssetsToCollections,
  addHistory,
  loadLocalState,
  normalizeState,
  recordRename,
  removeAssetsFromCollection,
  saveLocalState,
  STATE_FILENAME,
  touchState,
} from './lib/state'
import type {
  ActivityItem,
  AppStateDoc,
  AssetKind,
  AssetRecord,
  IndexedFile,
  ManifestSource,
} from './types'
import { createTemplateAssets } from './lib/templateAssets'

type FileIndex = Awaited<ReturnType<typeof buildFileIndex>>
type KindFilter = AssetKind | 'all'

const EMPTY_INDEX: FileIndex = {
  byPath: new Map<string, IndexedFile>(),
  byBasename: new Map<string, IndexedFile[]>(),
}

const KIND_FILTERS: KindFilter[] = [
  'all',
  'image',
  'audio',
  'video',
  'model',
  'document',
  'unknown',
]

const INDEX_SOURCE_ID = '__asset-browser-index__'

function App() {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(
    null,
  )
  const [rootName, setRootName] = useState('')
  const [targetHandle, setTargetHandle] =
    useState<FileSystemDirectoryHandle | null>(null)
  const [manifests, setManifests] = useState<ManifestSource[]>([])
  const [activeManifestId, setActiveManifestId] = useState('')
  const [fileIndex, setFileIndex] = useState<FileIndex>(EMPTY_INDEX)
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [focusedId, setFocusedId] = useState('')
  const [previewAssetId, setPreviewAssetId] = useState('')
  const [activeAudioId, setActiveAudioId] = useState('')
  const [audioPlaySignal, setAudioPlaySignal] = useState(0)
  const [previewMode, setPreviewMode] = useState<'click' | 'hover'>('click')
  const [previewLocked, setPreviewLocked] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [favoriteFilter, setFavoriteFilter] = useState('all')
  const [stateDoc, setStateDoc] = useState<AppStateDoc>(() => loadLocalState())
  const [busy, setBusy] = useState('')
  const [activity, setActivity] = useState<ActivityItem[]>([])

  const activeManifest = manifests.find((item) => item.id === activeManifestId)
  const activeSourceName =
    activeManifestId === INDEX_SOURCE_ID
      ? INDEX_FILENAME
      : activeManifest?.name
  const templateAssets = useMemo(() => createTemplateAssets(), [])
  const sourceAssets = assets.length > 0 ? assets : templateAssets
  const previewAsset = sourceAssets.find((asset) => asset.id === previewAssetId)
  const favoriteIds = useMemo(() => {
    if (favoriteFilter === 'all') return null
    const collection = stateDoc.favorites.find((item) => item.id === favoriteFilter)
    return new Set(collection?.entries.map((entry) => entry.id) ?? [])
  }, [favoriteFilter, stateDoc.favorites])

  const filteredAssets = useMemo(() => {
    const terms = query
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean)

    return sourceAssets.filter((asset) => {
      if (kindFilter !== 'all' && asset.kind !== kindFilter) return false
      if (favoriteIds && !favoriteIds.has(asset.id)) return false
      if (terms.length === 0) return true
      const haystack = [
        asset.name,
        asset.reference,
        asset.normalizedPath,
        asset.folder,
        asset.typeLabel,
        asset.tags.join(' '),
        ...Object.values(asset.metadata),
      ]
        .join(' ')
        .toLocaleLowerCase()
      return terms.every((term) => haystack.includes(term))
    })
  }, [sourceAssets, favoriteIds, kindFilter, query])

  const previewableAsset =
    previewAsset && isPreviewPaneAsset(previewAsset) ? previewAsset : undefined
  const showPreviewPane = previewLocked || Boolean(previewableAsset)
  const workspaceClassName = showPreviewPane
    ? 'workspace has-preview'
    : 'workspace is-list-only'

  useEffect(() => {
    saveLocalState(stateDoc)
  }, [stateDoc])

  const log = (level: ActivityItem['level'], message: string) => {
    setActivity((items) => [
      {
        id: stableId(`${Date.now()}:${message}`),
        level,
        message,
        time: new Date().toLocaleTimeString(),
      },
      ...items,
    ].slice(0, 80))
  }

  const handlePickerError = (error: unknown, fallback: string) => {
    if (isUserAbort(error)) {
      log('info', '已取消选择。')
      return
    }
    log('fail', error instanceof Error ? error.message : fallback)
  }

  const chooseRoot = async () => {
    try {
      setBusy('Indexing folder')
      const root = await pickDirectory('readwrite')
      const [nextManifests, nextIndex] = await Promise.all([
        findManifestFiles(root),
        buildFileIndex(root),
      ])
      setRootHandle(root)
      setRootName(root.name)
      setManifests(nextManifests)
      setFileIndex(nextIndex)
      setSelectedIds(new Set())
      setPreviewAssetId('')
      setActiveAudioId('')
      log('success', `打开资产根目录：${root.name}`)

      try {
        const saved = await readJsonFile<AppStateDoc>(root, STATE_FILENAME)
        setStateDoc(normalizeState(saved))
        log('success', `读取 ${STATE_FILENAME}`)
      } catch {
        setStateDoc((current) =>
          touchState({ ...current, sourceRootName: root.name }),
        )
      }

      await loadIndexForRoot(root, nextManifests, nextIndex, root.name)
    } catch (error) {
      handlePickerError(error, '选择目录失败。')
    } finally {
      setBusy('')
    }
  }

  const reloadActiveManifest = async () => {
    if (!rootHandle) return
    try {
      setBusy('Reloading')
      const [nextManifests, nextIndex] = await Promise.all([
        findManifestFiles(rootHandle),
        buildFileIndex(rootHandle),
      ])
      setManifests(nextManifests)
      setFileIndex(nextIndex)
      if (activeManifestId === INDEX_SOURCE_ID || !activeManifestId) {
        await loadIndexForRoot(rootHandle, nextManifests, nextIndex, rootName)
        return
      }
      const syncResult = await syncIndexDocument(
        rootHandle,
        rootName,
        nextManifests,
        nextIndex,
      )
      logIndexResult(syncResult.status, syncResult.reason, syncResult.doc.assets.length)
      const manifest =
        nextManifests.find((item) => item.id === activeManifestId) ??
        nextManifests[0]
      if (!manifest) {
        setAssets([])
        setFocusedId('')
        return
      }
      setActiveManifestId(manifest.id)
      await loadManifest(manifest, nextIndex, rootName)
    } catch (error) {
      log('fail', error instanceof Error ? error.message : '重新读取失败。')
    } finally {
      setBusy('')
    }
  }

  const loadManifest = async (
    manifest: ManifestSource,
    index: FileIndex,
    sourceRootName = rootName,
  ) => {
    setBusy(`Reading ${manifest.name}`)
    const parsed = await parseManifest(manifest, index)
    const hydrated = await Promise.all(parsed.map(hydrateAsset))
    setAssets(hydrated)
    setFocusedId(hydrated[0]?.id ?? '')
    setPreviewAssetId('')
    setActiveAudioId('')
    setStateDoc((current) =>
      touchState({
        ...current,
        sourceRootName,
        activeManifestName: manifest.name,
      }),
    )
    log('success', `读取清单：${manifest.name}，${hydrated.length} 个资产。`)
    setBusy('')
  }

  const loadIndexForRoot = async (
    root: FileSystemDirectoryHandle,
    nextManifests: ManifestSource[],
    index: FileIndex,
    sourceRootName: string,
  ) => {
    setBusy(`Checking ${INDEX_FILENAME}`)
    const result = await syncIndexDocument(root, sourceRootName, nextManifests, index)
    const hydrated = await Promise.all(
      hydrateIndexAssets(result.doc, index).map(hydrateAsset),
    )
    setAssets(hydrated)
    setFocusedId(hydrated[0]?.id ?? '')
    setPreviewAssetId('')
    setActiveAudioId('')
    setActiveManifestId(INDEX_SOURCE_ID)
    setStateDoc((current) =>
      touchState({
        ...current,
        sourceRootName,
        activeManifestName: INDEX_FILENAME,
      }),
    )
    logIndexResult(result.status, result.reason, hydrated.length, true)
    setBusy('')
  }

  const logIndexResult = (
    status: 'created' | 'updated' | 'loaded' | 'empty',
    reason: string,
    assetCount: number,
    loadingIndex = false,
  ) => {
    if (status === 'empty') {
      log('warn', '根目录没有找到 CSV/XLSX，也没有可读取的索引。')
      return
    }
    if (status === 'loaded') {
      log(
        'success',
        loadingIndex
          ? `索引已是最新，直接读取 ${INDEX_FILENAME}。`
          : `${INDEX_FILENAME} 已是最新，未修改。`,
      )
      return
    }
    log(
      'success',
      `${status === 'created' ? '生成' : '更新'} ${INDEX_FILENAME}：${reason}，${assetCount} 个资产。`,
    )
  }

  const hydrateAsset = async (asset: AssetRecord): Promise<AssetRecord> => {
    if (!asset.fileHandle) return asset
    try {
      const file = await asset.fileHandle.getFile()
      return {
        ...asset,
        size: file.size,
        mime: file.type,
        updatedAt: file.lastModified,
      }
    } catch {
      return { ...asset, status: 'missing' }
    }
  }

  const focusAsset = (asset: AssetRecord) => {
    setFocusedId(asset.id)
    setStateDoc((current) => addHistory(current, asset))
  }

  const toggleSelected = (assetId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(assetId)) next.delete(assetId)
      else next.add(assetId)
      return next
    })
  }

  const selectVisible = () => {
    setSelectedIds(new Set(filteredAssets.map((asset) => asset.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const requestAudioPlayback = (assetId: string) => {
    setPreviewAssetId('')
    setActiveAudioId(assetId)
    setAudioPlaySignal((value) => value + 1)
  }

  const activateAsset = (asset: AssetRecord) => {
    focusAsset(asset)
    if (asset.kind === 'audio') {
      requestAudioPlayback(asset.id)
      return
    }
    setActiveAudioId('')
    if (previewMode === 'click') {
      setPreviewAssetId(isPreviewPaneAsset(asset) ? asset.id : '')
    }
  }

  const deleteAsset = async (asset: AssetRecord) => {
    if (!rootHandle || !asset.fileHandle || asset.status !== 'ready') return
    if (!window.confirm(`删除 ${asset.name}？`)) return
    try {
      setBusy('Deleting')
      await deleteFileAtPath(rootHandle, asset.normalizedPath)
      setAssets((items) => items.filter((item) => item.id !== asset.id))
      setSelectedIds((current) => {
        const next = new Set(current)
        next.delete(asset.id)
        return next
      })
      setFocusedId((current) => (current === asset.id ? '' : current))
      setPreviewAssetId((current) => (current === asset.id ? '' : current))
      setActiveAudioId((current) => (current === asset.id ? '' : current))
      log('success', `删除完成：${asset.name}`)
    } catch (error) {
      log('fail', error instanceof Error ? error.message : '删除失败。')
    } finally {
      setBusy('')
    }
  }

  const renameAsset = async (asset: AssetRecord) => {
    if (!rootHandle || asset.metadata.source === 'template') return
    if (!asset || !asset.fileHandle) return
    const currentName = asset.normalizedPath.split('/').pop() || asset.name
    const nextName = window.prompt('新的文件名', currentName)
    if (!nextName || nextName === currentName) return
    try {
      setBusy('Renaming')
      const nextPath = await renameFileAtPath(rootHandle, asset.normalizedPath, nextName)
      const nextIndex = await buildFileIndex(rootHandle)
      setFileIndex(nextIndex)
      const indexed = nextIndex.byPath.get(nextPath.toLocaleLowerCase())
      setAssets((items) =>
        items.map((item) =>
          item.id === asset.id
            ? {
                ...item,
                name: stripExtension(nextName),
                reference: nextPath,
                normalizedPath: nextPath,
                folder: nextPath.includes('/')
                  ? nextPath.split('/').slice(0, -1).join('/')
                  : 'root',
                extension: getExtension(nextPath),
                fileHandle: indexed?.handle,
              }
            : item,
        ),
      )
      setStateDoc((current) => recordRename(current, asset, nextPath))
      log('success', `重命名：${currentName} -> ${nextName}`)
    } catch (error) {
      log('fail', error instanceof Error ? error.message : '重命名失败。')
    } finally {
      setBusy('')
    }
  }

  const downloadAsset = async (asset: AssetRecord) => {
    try {
      setBusy('Downloading')
      const target = targetHandle ?? (await pickDirectory('readwrite'))
      setTargetHandle(target)
      if (asset.previewUrl) {
        const response = await fetch(asset.previewUrl)
        await copyFileToDirectory(
          target,
          asset.normalizedPath || asset.name,
          await response.blob(),
        )
      } else if (asset.isExternal && isExternalReference(asset.reference)) {
        const response = await fetch(asset.reference)
        if (!response.ok) throw new Error(response.statusText)
        await copyFileToDirectory(
          target,
          asset.normalizedPath || asset.name,
          await response.blob(),
        )
      } else if (asset.fileHandle) {
        await copyFileToDirectory(
          target,
          asset.normalizedPath,
          await asset.fileHandle.getFile(),
        )
      } else {
        throw new Error('这个资产没有可下载的文件引用。')
      }
      log('success', `下载到目标目录：${asset.name}`)
    } catch (error) {
      handlePickerError(error, '下载失败。')
    } finally {
      setBusy('')
    }
  }

  const isAssetInCollection = (assetId: string, collectionId: string) => {
    return Boolean(
      stateDoc.favorites
        .find((collection) => collection.id === collectionId)
        ?.entries.some((entry) => entry.id === assetId),
    )
  }

  const toggleFavoriteCollection = (asset: AssetRecord, collectionId: string) => {
    const collection = stateDoc.favorites.find((item) => item.id === collectionId)
    if (!collection) return
    if (isAssetInCollection(asset.id, collection.id)) {
      setStateDoc((current) =>
        removeAssetsFromCollection(current, [asset.id], collection.id),
      )
      log('success', `已从 ${collection.name} 移除：${asset.name}`)
      return
    }
    setStateDoc((current) =>
      addAssetsToCollections(current, [asset], [collection.id]),
    )
    log('success', `收藏到 ${collection.name}：${asset.name}`)
  }

  const loadMetadataManually = async () => {
    try {
      const directory = rootHandle ?? (await pickDirectory('read'))
      const next = await readJsonFile<AppStateDoc>(directory, STATE_FILENAME)
      setStateDoc(normalizeState(next))
      log('success', `载入 ${STATE_FILENAME}`)
    } catch (error) {
      handlePickerError(error, `没有找到 ${STATE_FILENAME}。`)
    }
  }

  return (
    <main className="shell">
      <aside className="panel">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            AB
          </div>
          <h1>ASSET BROWSER</h1>
          <button
            className={`icon-button ${previewMode === 'hover' ? 'is-active' : ''}`}
            type="button"
            title={previewMode === 'click' ? '点击预览' : 'Hover 预览'}
            onClick={() =>
              setPreviewMode((mode) => (mode === 'click' ? 'hover' : 'click'))
            }
          >
            {previewMode === 'click' ? (
              <MousePointerClick size={15} />
            ) : (
              <Eye size={15} />
            )}
          </button>
          <button
            className={`icon-button ${previewLocked ? 'is-active' : ''}`}
            type="button"
            title={previewLocked ? '预览窗格已锁定' : '锁定预览窗格'}
            onClick={() => setPreviewLocked((value) => !value)}
          >
            {previewLocked ? <Lock size={15} /> : <Unlock size={15} />}
          </button>
          <button
            className="icon-button"
            type="button"
            title="重新读取"
            onClick={reloadActiveManifest}
            disabled={!rootHandle || Boolean(busy)}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="panel-body">
          <section className="drop">
            <strong>{rootName || 'No folder selected'}</strong>
            <span>{activeSourceName || 'CSV / XLSX manifest'}</span>
            <div className="folder-actions">
              <button
                className="primary"
                type="button"
                onClick={chooseRoot}
                disabled={!supportsFileSystemAccess() || Boolean(busy)}
              >
                <FolderOpen size={15} />
                OPEN FOLDER
              </button>
              {rootHandle && assets.length === 0 && (
                <button type="button" onClick={loadMetadataManually}>
                  META
                </button>
              )}
            </div>
            {!supportsFileSystemAccess() && (
              <span className="warn-text">Chrome / Edge required</span>
            )}
          </section>
        </div>
      </aside>

      <section className="viewport">
        <header className="topbar">
          <div className="topbar-filters">
            <div className="topbar-search">
              <Search size={14} />
              <input
                value={query}
                placeholder="Search name / type / path"
                aria-label="Search assets"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="topbar-filter-row">
              <button
                className={`filter-row-label ${filtersExpanded ? 'is-active' : ''}`}
                type="button"
                onClick={() => setFiltersExpanded((value) => !value)}
              >
                <ListFilter size={13} />
                Filters
              </button>
              <div className="filter-chip-row">
                {KIND_FILTERS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={kindFilter === kind ? 'is-active' : ''}
                    onClick={() => setKindFilter(kind)}
                  >
                    {kind === 'all' ? 'All' : getKindLabel(kind)}
                  </button>
                ))}
              </div>
              <select
                className="topbar-favorites"
                value={favoriteFilter}
                aria-label="Favorite collection filter"
                onChange={(event) => setFavoriteFilter(event.target.value)}
              >
                <option value="all">All assets</option>
                {stateDoc.favorites.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name} ({collection.entries.length})
                  </option>
                ))}
              </select>
            </div>
            {filtersExpanded && (
              <div className="filter-metrics">
                <Stat label="Assets" value={sourceAssets.length} />
                <Stat label="Visible" value={filteredAssets.length} />
                <Stat label="Selected" value={selectedIds.size} />
                <Stat
                  label="Missing"
                  value={sourceAssets.filter((a) => a.status === 'missing').length}
                />
                <button type="button" onClick={selectVisible} disabled={filteredAssets.length === 0}>
                  Select visible
                </button>
                <button type="button" onClick={clearSelection} disabled={selectedIds.size === 0}>
                  Clear
                </button>
              </div>
            )}
          </div>
        </header>

        <div className={workspaceClassName}>
          <section className="asset-list" aria-label="Assets">
            <div className="asset-list-head">
              <span></span>
              <span>Type</span>
              <span>Name</span>
              <span>Path</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            <div className="asset-rows">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  role="button"
                  tabIndex={0}
                  className={`asset-row ${asset.id === focusedId ? 'is-focused' : ''}`}
                  onClick={() => activateAsset(asset)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      activateAsset(asset)
                    }
                  }}
                  onMouseEnter={() => {
                    if (previewMode !== 'hover') return
                    if (asset.kind === 'audio') {
                      requestAudioPlayback(asset.id)
                      return
                    }
                    setActiveAudioId('')
                    if (!previewLocked && isPreviewPaneAsset(asset)) {
                      setPreviewAssetId(asset.id)
                    }
                  }}
                  onMouseLeave={() => {
                    if (previewMode !== 'hover') return
                    if (asset.kind === 'audio') setActiveAudioId('')
                    if (!previewLocked) setPreviewAssetId('')
                  }}
                >
                  <span
                    className="row-check"
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleSelected(asset.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        toggleSelected(asset.id)
                      }
                    }}
                    role="checkbox"
                    aria-checked={selectedIds.has(asset.id)}
                    tabIndex={0}
                  >
                    {selectedIds.has(asset.id) && <Check size={13} />}
                  </span>
                  <span className={`kind-dot is-${asset.kind}`}>
                    {asset.kind === 'image' ? <ImageIcon size={13} /> : getKindLabel(asset.kind)}
                  </span>
                  <span className="asset-name">
                    <strong>{asset.name}</strong>
                    {asset.kind === 'audio' ? (
                      <InlineAudioPlayer
                        asset={asset}
                        active={activeAudioId === asset.id}
                        playSignal={activeAudioId === asset.id ? audioPlaySignal : 0}
                        previewMode={previewMode}
                        onActivate={() => requestAudioPlayback(asset.id)}
                        onInteract={() => setPreviewAssetId('')}
                      />
                    ) : (
                      asset.tags.length > 0 && <em>{asset.tags.join(' / ')}</em>
                    )}
                  </span>
                  <span className="asset-path">{asset.normalizedPath || asset.reference}</span>
                  <span className={`status-pill is-${asset.status}`}>
                    {asset.status}
                  </span>
                  <span className="row-actions" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      className="icon-button"
                      title="重命名"
                      onClick={() => renameAsset(asset)}
                      disabled={!asset.fileHandle}
                    >
                      <Type size={13} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title="下载"
                      onClick={() => downloadAsset(asset)}
                    >
                      <Download size={13} />
                    </button>
                    {stateDoc.favorites.map((collection) => (
                      <button
                        key={collection.id}
                        type="button"
                        className={`icon-button favorite-action ${
                          isAssetInCollection(asset.id, collection.id) ? 'is-active' : ''
                        }`}
                        title={`收藏到${collection.name}`}
                        onClick={() => toggleFavoriteCollection(asset, collection.id)}
                      >
                        <Star size={13} />
                      </button>
                    ))}
                    <button
                      type="button"
                      className="icon-button danger"
                      title="删除"
                      onClick={() => deleteAsset(asset)}
                      disabled={!asset.fileHandle}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
              ))}
              {filteredAssets.length === 0 && (
                <div className="empty-list">No assets</div>
              )}
            </div>
          </section>

          {showPreviewPane && (
            <PreviewPane
              asset={previewableAsset}
              history={stateDoc.history}
              fileIndex={fileIndex.byPath}
            />
          )}
        </div>

        <div className="log-dock">
          <div className="log-head">
            <span>Activity</span>
          </div>
          <div className="log-content">
            {activity.map((item) => (
              <div className={`log-line ${item.level}`} key={item.id}>
                [{item.time}] {item.message}
              </div>
            ))}
            {activity.length === 0 && <div className="log-line info">Ready.</div>}
          </div>
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function stripExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, '')
}

function isPreviewPaneAsset(asset: AssetRecord) {
  return asset.kind === 'image' || asset.kind === 'video' || asset.kind === 'model'
}

function isUserAbort(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.message.includes('aborted'))
  )
}

export default App
