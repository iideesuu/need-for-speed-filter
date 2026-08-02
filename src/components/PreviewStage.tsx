import { useEffect, useRef, useState } from 'react'
import { Application, Sprite, Texture } from 'pixi.js'
import { ImagePlus, ScanLine } from 'lucide-react'
import { renderImage } from '../lib/imagePipeline'
import type { FilterSettings, LoadedImage, RenderInfo } from '../types'

interface PreviewStageProps {
  image: LoadedImage | null
  settings: FilterSettings
  showOriginal: boolean
  isDragging: boolean
  onChooseFile: () => void
  onRenderInfo: (info: RenderInfo) => void
}

interface PixiState {
  app: Application
  sprite: Sprite
  texture: Texture
  resize: () => void
}

export function PreviewStage({
  image,
  settings,
  showOriginal,
  isDragging,
  onChooseFile,
  onRenderInfo,
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
          resizeTo: host,
          preference: 'webgl',
        })
        if (cancelled) {
          app.destroy(true)
          return
        }

        app.canvas.className = 'pixi-canvas'
        host.appendChild(app.canvas)
        const texture = Texture.from(sourceCanvas)
        const sprite = new Sprite(texture)
        sprite.anchor.set(0.5)
        app.stage.addChild(sprite)

        const resize = () => {
          const availableWidth = Math.max(1, app.screen.width - 54)
          const availableHeight = Math.max(1, app.screen.height - 54)
          const imageWidth = Math.max(1, sourceCanvas.width)
          const imageHeight = Math.max(1, sourceCanvas.height)
          const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight)
          sprite.position.set(app.screen.width / 2, app.screen.height / 2)
          sprite.scale.set(Math.max(0.01, scale))
        }

        observer = new ResizeObserver(resize)
        observer.observe(host)
        pixiRef.current = { app, sprite, texture, resize }
        texture.source.update()
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
      const output = renderImage(image.element, sourceCanvas, settings, { original: showOriginal })
      const pixi = pixiRef.current

      if (renderer === 'WebGL' && pixi) {
        pixi.texture.source.resize(sourceCanvas.width, sourceCanvas.height)
        pixi.texture.source.update()
        pixi.resize()
      } else {
        const fallback = fallbackRef.current
        if (fallback) {
          fallback.width = sourceCanvas.width
          fallback.height = sourceCanvas.height
          fallback.getContext('2d')?.drawImage(sourceCanvas, 0, 0)
        }
      }

      onRenderInfo({ width: output.width, height: output.height, renderer })
      setIsRendering(false)
    })

    return () => cancelAnimationFrame(frame)
  }, [image, onRenderInfo, renderer, settings, showOriginal])

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
          <span className="empty-state-copy">支持 JPG、PNG、WEBP，最大 30 MB</span>
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
