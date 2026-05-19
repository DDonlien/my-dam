import { useEffect, useState } from 'react'
import {
  Clock3,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Music2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { AssetRecord, HistoryEntry, IndexedFile } from '../types'
import { getKindLabel } from '../lib/manifest'
import { ModelViewer } from './ModelViewer'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'

interface PreviewPaneProps {
  asset?: AssetRecord
  history: HistoryEntry[]
  fileIndex: Map<string, IndexedFile>
}

export function PreviewPane({ asset, history, fileIndex }: PreviewPaneProps) {
  const [preview, setPreview] = useState({ url: '', error: '' })
  const [resolution, setResolution] = useState({ assetId: '', value: '-' })
  const { url, error } = preview
  const activeResolution = resolution.assetId === asset?.id ? resolution.value : '-'

  useEffect(() => {
    let revoked = ''
    let cancelled = false

    async function resolveUrl() {
      if (!asset) return { url: '', error: '' }
      if (asset.previewUrl) {
        return { url: asset.previewUrl, error: '' }
      }
      if (asset.isExternal) {
        return { url: asset.reference, error: '' }
      }
      if (!asset.fileHandle) {
        return { url: '', error: '本地文件没有解析到，请检查清单里的地址引用。' }
      }
      const file = await asset.fileHandle.getFile()
      revoked = URL.createObjectURL(file)
      return { url: revoked, error: '' }
    }

    void resolveUrl()
      .then((next) => {
        if (!cancelled) setPreview(next)
      })
      .catch((reason) => {
        if (!cancelled) {
          setPreview({
            url: '',
            error: reason instanceof Error ? reason.message : '预览加载失败。',
          })
        }
      })

    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [asset])

  if (!asset) {
    return (
      <motion.section
        className="preview-empty"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
      >
        <div className="empty-mark">
          <ImageIcon />
        </div>
        <h2>SELECT AN ASSET</h2>
        <p>读取 CSV 或 Excel 后，选择左侧列表中的资源即可预览。</p>
        <RecentHistory history={history} />
      </motion.section>
    )
  }

  return (
    <motion.section
      className="preview-pane"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <header className="preview-head">
        <div>
          <Badge className="eyebrow" variant="secondary">{getKindLabel(asset.kind)}</Badge>
          <h2>{asset.name}</h2>
        </div>
        {asset.isExternal && (
          <Button asChild variant="outline" size="sm">
          <a href={asset.reference} target="_blank" rel="noreferrer">
            <ExternalLink data-icon="inline-start" />
            OPEN
          </a>
          </Button>
        )}
      </header>

      <div className={`preview-stage is-${asset.kind}`}>
        {error && <div className="preview-error">{error}</div>}
        {!error && asset.kind === 'image' && url && (
          <img
            src={url}
            alt={asset.name}
            onLoad={(event) => {
              const image = event.currentTarget
              setResolution({
                assetId: asset.id,
                value: `${image.naturalWidth} x ${image.naturalHeight}`,
              })
            }}
          />
        )}
        {!error && asset.kind === 'audio' && url && (
          <div className="audio-preview">
            <Music2 />
            <audio src={url} controls />
          </div>
        )}
        {!error && asset.kind === 'video' && url && (
          <video
            src={url}
            controls
            playsInline
            onLoadedMetadata={(event) => {
              const video = event.currentTarget
              setResolution({
                assetId: asset.id,
                value: `${video.videoWidth} x ${video.videoHeight}`,
              })
            }}
          />
        )}
        {!error && asset.kind === 'model' && (
          <ModelViewer asset={asset} fileIndex={fileIndex} />
        )}
        {!error && asset.kind === 'document' && url && (
          <iframe src={url} title={asset.name} />
        )}
        {!error && asset.kind === 'unknown' && (
          <div className="preview-error">该类型暂未识别，可通过下载或重命名继续管理。</div>
        )}
      </div>

      <div className="detail-list">
        <Detail label="Name" value={asset.name} />
        <Detail label="File path" value={asset.normalizedPath || asset.reference} />
        <Detail label="Resolution" value={activeResolution} />
        <Detail label="Format" value={asset.extension || asset.typeLabel || '-'} />
      </div>
    </motion.section>
  )
}

function RecentHistory({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) return null
  return (
    <ScrollArea className="recent-box">
      <h3>
        <Clock3 />
        RECENT
      </h3>
      {history.slice(0, 6).map((item) => (
        <div className="recent-row" key={`${item.id}-${item.openedAt}`}>
          <FileText />
          <span>{item.name}</span>
        </div>
      ))}
    </ScrollArea>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
