import { Pause, Play } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import type { AssetRecord } from '../types'

interface InlineAudioPlayerProps {
  asset: AssetRecord
  active: boolean
  playSignal: number
  previewMode: 'click' | 'hover'
  onActivate: () => void
  onInteract?: () => void
}

export function InlineAudioPlayer({
  asset,
  active,
  playSignal,
  previewMode,
  onActivate,
  onInteract,
}: InlineAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [url, setUrl] = useState('')
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let objectUrl = ''
    let cancelled = false

    async function resolveUrl() {
      if (asset.previewUrl) return asset.previewUrl
      if (asset.isExternal) return asset.reference
      if (!asset.fileHandle) return ''
      objectUrl = URL.createObjectURL(await asset.fileHandle.getFile())
      return objectUrl
    }

    void resolveUrl().then((nextUrl) => {
      if (!cancelled) setUrl(nextUrl)
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [asset])

  const playAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !url) return
    void audio.play().catch(() => undefined)
  }, [url])

  useEffect(() => {
    if (active) {
      playAudio()
      return
    }
    audioRef.current?.pause()
  }, [active, playAudio])

  useEffect(() => {
    if (playSignal > 0) playAudio()
  }, [playSignal, playAudio])

  const activateAndPlay = () => {
    onInteract?.()
    onActivate()
    playAudio()
  }

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) activateAndPlay()
    else audio.pause()
  }

  const seek = (event: MouseEvent<HTMLButtonElement>, shouldPlay: boolean) => {
    onInteract?.()
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
    audio.currentTime = ratio * audio.duration
    setProgress(ratio)
    if (shouldPlay) {
      onActivate()
      playAudio()
    }
  }

  const seekOnHover = (event: MouseEvent<HTMLButtonElement>) => {
    if (previewMode !== 'hover') return
    seek(event, true)
  }

  return (
    <div
      className={`inline-audio ${active ? 'is-active' : ''}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="icon-button audio-toggle"
        title={playing ? '暂停音频' : '播放音频'}
        onClick={toggle}
        disabled={!url}
      >
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
      <button
        type="button"
        className="audio-wave"
        title="音频进度"
        onClick={(event) => seek(event, true)}
        onMouseEnter={seekOnHover}
        onMouseMove={seekOnHover}
        disabled={!url}
      >
        <span style={{ width: `${progress * 100}%` }} />
      </button>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget
            setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
          }}
        />
      )}
    </div>
  )
}
