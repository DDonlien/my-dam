import { Pause, Play } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import type { AssetRecord } from '../types'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import { cn } from '../lib/utils'

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
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

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

  const seekTo = (ratio: number, shouldPlay: boolean) => {
    onInteract?.()
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    const nextProgress = Math.min(1, Math.max(0, ratio))
    const nextTime = nextProgress * audio.duration
    audio.currentTime = nextTime
    setProgress(nextProgress)
    setCurrentTime(nextTime)
    if (shouldPlay) {
      onActivate()
      playAudio()
    }
  }

  const seekOnHover = (event: PointerEvent<HTMLSpanElement>) => {
    if (previewMode !== 'hover') return
    const bounds = event.currentTarget.getBoundingClientRect()
    seekTo((event.clientX - bounds.left) / bounds.width, true)
  }

  return (
    <div
      className={cn('inline-audio', active && 'is-active')}
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        className="icon-button audio-toggle"
        variant="ghost"
        size="icon-sm"
        title={playing ? '暂停音频' : '播放音频'}
        onClick={toggle}
        disabled={!url}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Slider
        className="audio-slider"
        min={0}
        max={100}
        step={1}
        value={[Math.round(progress * 100)]}
        aria-label="音频进度"
        title="音频进度"
        onValueChange={([next]) => seekTo(next / 100, true)}
        onPointerEnter={seekOnHover}
        onPointerMove={seekOnHover}
        disabled={!url}
      />
      <span className="audio-time" aria-hidden="true">
        {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
      </span>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={(event) => {
            const audio = event.currentTarget
            setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
          }}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget
            setCurrentTime(audio.currentTime)
            setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
          }}
        />
      )}
    </div>
  )
}

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60)
  return `${minutes}:${remaining.toString().padStart(2, '0')}`
}
