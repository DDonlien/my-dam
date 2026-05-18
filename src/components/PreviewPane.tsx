import { useEffect, useState } from 'react'
import {
  Clock3,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Music2,
} from 'lucide-react'
import type { AssetRecord, HistoryEntry, IndexedFile } from '../types'
import { getKindLabel } from '../lib/manifest'
import { ModelViewer } from './ModelViewer'

interface PreviewPaneProps {
  asset?: AssetRecord
  history: HistoryEntry[]
  fileIndex: Map<string, IndexedFile>
}

export function PreviewPane({ asset, history, fileIndex }: PreviewPaneProps) {
  const [preview, setPreview] = useState({ url: '', error: '' })
  const { url, error } = preview

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
      <section className="preview-empty">
        <div className="empty-mark">
          <ImageIcon size={32} />
        </div>
        <h2>SELECT AN ASSET</h2>
        <p>读取 CSV 或 Excel 后，选择左侧列表中的资源即可预览。</p>
        <RecentHistory history={history} />
      </section>
    )
  }

  return (
    <section className="preview-pane">
      <header className="preview-head">
        <div>
          <span className="eyebrow">{getKindLabel(asset.kind)}</span>
          <h2>{asset.name}</h2>
        </div>
        {asset.isExternal && (
          <a href={asset.reference} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
            OPEN
          </a>
        )}
      </header>

      <div className={`preview-stage is-${asset.kind}`}>
        {error && <div className="preview-error">{error}</div>}
        {!error && asset.kind === 'image' && url && (
          <img src={url} alt={asset.name} />
        )}
        {!error && asset.kind === 'audio' && url && (
          <div className="audio-preview">
            <Music2 size={42} />
            <audio src={url} controls />
          </div>
        )}
        {!error && asset.kind === 'video' && url && (
          <video src={url} controls playsInline />
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

      <div className="detail-grid">
        <Detail label="Reference" value={asset.reference} />
        <Detail label="Resolved" value={asset.normalizedPath || 'external'} />
        <Detail label="Folder" value={asset.folder} />
        <Detail label="Type" value={`${asset.typeLabel} / ${asset.extension || '-'}`} />
        <Detail label="Status" value={asset.status.toUpperCase()} />
        <Detail
          label="Size"
          value={asset.size ? `${(asset.size / 1024 / 1024).toFixed(2)} MB` : '-'}
        />
      </div>
    </section>
  )
}

function RecentHistory({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) return null
  return (
    <div className="recent-box">
      <h3>
        <Clock3 size={13} />
        RECENT
      </h3>
      {history.slice(0, 6).map((item) => (
        <div className="recent-row" key={`${item.id}-${item.openedAt}`}>
          <FileText size={13} />
          <span>{item.name}</span>
        </div>
      ))}
    </div>
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
