import { useEffect, useRef, useState } from 'react'
import { Application, Sprite, Texture } from 'pixi.js'
import { ImagePlus, ScanLine } from 'lucide-react'
import { renderImage } from '../lib/imagePipeline'
import type { FilterSettings, LoadedImage } from '../types'

interface PreviewStageProps {
  image: LoadedImage | null
  settings: FilterSettings
  showOriginal: boolean
  isDragging: boolean
  onChooseFile: () => void
}

interface PixiState {
  app: Application
  sprite: Sprite
  texture: Texture
  resize: () => void
  syncTexture: () => void
}

export function PreviewStage({
  image,
  settings,
  showOriginal,
  isDragging,
  onChooseFile,
}: PreviewStageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const fallbackRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const pixiRef = useRef<PixiState | null>(null)
  const [renderer, setRenderer] = useState<'WebGL' | 'Canvas 2D'>('WebGL')
  const [isRendering, setIsRendering] = useState(false)

  if (!previewCanvasRef.current && typeof document !== 'undefined') {
    previewCanvasRef.current = document.createElement('canvas')
  }

  useEffect(() => {
    const host = hostRef.current
    const sourceCanvas = previewCanvasRef.current
    if (!host || !sourceCanvas) return

    let cancelled = false
    let observer: ResizeObserver | null = null
    const app = new Application()

    const start = async () => {
      try {
        await app.init({
          antialias: true,
          backgroundAlpha: 0,
          preference: 'webgl',
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          width: Math.max(1, host.clientWidth),
          height: Math.max(1, host.clientHeight),
        })
        if (cancelled) {
          app.destroy(true)
          return
        }

        app.canvas.className = 'pixi-canvas'
        host.appendChild(app.canvas)
        const texture = Texture.from(sourceCanvas)
        texture.dynamic = true
        const sprite = new Sprite(texture)
        sprite.anchor.set(0.5)
        app.stage.addChild(sprite)

        const syncTexture = () => {
          const width = Math.max(1, sourceCanvas.width)
          const height = Math.max(1, sourceCanvas.height)

          texture.source.resize(width, height)
          texture.frame.x = 0
          texture.frame.y = 0
          texture.frame.width = width
          texture.frame.height = height
          texture.orig.x = 0
          texture.orig.y = 0
          texture.orig.width = width
          texture.orig.height = height
          texture.source.update()
          texture.update()
        }

        const resize = () => {
          const hostWidth = Math.max(1, host.clientWidth)
          const hostHeight = Math.max(1, host.clientHeight)
          const padding = Math.min(54, Math.max(24, Math.min(hostWidth, hostHeight) * 0.08))
          const availableWidth = Math.max(1, hostWidth - padding)
          const availableHeight = Math.max(1, hostHeight - padding)
          const imageWidth = Math.max(1, sourceCanvas.width)
          const imageHeight = Math.max(1, sourceCanvas.height)
          const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight)

          app.renderer.resize(hostWidth, hostHeight)
          sprite.position.set(hostWidth / 2, hostHeight / 2)
          sprite.scale.set(Math.max(0.01, scale), Math.max(0.01, scale))
        }

        observer = new ResizeObserver(resize)
        observer.observe(host)
        pixiRef.current = { app, sprite, texture, resize, syncTexture }
        syncTexture()
        resize()
      } catch {
        if (!cancelled) setRenderer('Canvas 2D')
      }
    }

    void start()

    return () => {
      cancelled = true
      observer?.disconnect()
      pixiRef.current = null
      if (app.renderer) app.destroy(true)
    }
  }, [])

  useEffect(() => {
    const sourceCanvas = previewCanvasRef.current
    if (!image || !sourceCanvas) return

    setIsRendering(true)
    const frame = requestAnimationFrame(() => {
      renderImage(image.element, sourceCanvas, settings, { original: showOriginal })
      const pixi = pixiRef.current

      if (renderer === 'WebGL' && pixi) {
        pixi.syncTexture()
        pixi.resize()
      } else {
        const fallback = fallbackRef.current
        if (fallback) {
          fallback.width = sourceCanvas.width
          fallback.height = sourceCanvas.height
          fallback.getContext('2d')?.drawImage(sourceCanvas, 0, 0)
        }
      }

      setIsRendering(false)
    })

    return () => cancelAnimationFrame(frame)
  }, [image, renderer, settings, showOriginal])

  return (
    <div className={`preview-stage ${isDragging ? 'is-dragging' : ''}`}>
      <div ref={hostRef} className={`preview-host ${renderer === 'Canvas 2D' ? 'is-hidden' : ''}`} />
      <canvas
        ref={fallbackRef}
        className={`fallback-canvas ${renderer === 'Canvas 2D' && image ? 'is-visible' : ''}`}
      />

      {!image && (
        <button type="button" className="empty-state" onClick={onChooseFile}>
          <span className="empty-state-icon">
            <ImagePlus size={28} strokeWidth={1.7} />
          </span>
          <span className="empty-state-title">把照片拖到这里</span>
          <span className="empty-state-copy">支持相册图片，兼容常见 HEIC / HEIF，最大 30 MB</span>
          <span className="empty-state-action">选择图片</span>
        </button>
      )}

      {image && (
        <>
          <div className="stage-badge stage-badge-left">
            <span className="live-dot" />
            {showOriginal ? '原图' : '实时效果'}
          </div>
          <div className="stage-badge stage-badge-right">
            <ScanLine size={13} />
            {renderer}
          </div>
        </>
      )}

      {isRendering && image && <div className="render-pulse" aria-label="正在渲染" />}
      <div className="stage-grid" aria-hidden="true" />
    </div>
  )
}
