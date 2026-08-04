import { type CSSProperties, type DragEvent, useEffect, useRef, useState } from 'react'
import {
  Check,
  Download,
  Eye,
  EyeOff,
  FileImage,
  Gauge,
  ImagePlus,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WandSparkles,
  X,
} from 'lucide-react'
import { PreviewStage } from './components/PreviewStage'
import { exportImage, getOutputSize } from './lib/imagePipeline'
import { DEFAULT_SETTINGS, PRESET_CATEGORIES, PRESETS } from './lib/presets'
import type {
  CropMode,
  FilterSettings,
  LoadedImage,
  OutputFormat,
} from './types'
import type { PresetCategoryId } from './lib/presets'

interface SliderConfig {
  key: keyof Omit<FilterSettings, 'crop'>
  label: string
  min: number
  max: number
  step: number
  format: (value: number) => string
}

const SLIDERS: SliderConfig[] = [
  { key: 'exposure', label: '曝光', min: -0.8, max: 1, step: 0.01, format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}` },
  { key: 'contrast', label: '反差', min: -35, max: 40, step: 1, format: (v) => `${v > 0 ? '+' : ''}${v}` },
  { key: 'saturation', label: '饱和度', min: -100, max: 45, step: 1, format: (v) => `${v > 0 ? '+' : ''}${v}` },
  { key: 'temperature', label: '色温', min: -45, max: 45, step: 1, format: (v) => `${v > 0 ? '+' : ''}${v}` },
  { key: 'magenta', label: '紫红偏色', min: 0, max: 100, step: 1, format: (v) => `${v}%` },
  { key: 'bloom', label: '高光溢出', min: 0, max: 100, step: 1, format: (v) => `${v}%` },
  { key: 'motion', label: '运动拖影', min: 0, max: 100, step: 1, format: (v) => `${v}%` },
  { key: 'lowResolution', label: '低清晰度', min: 0, max: 100, step: 1, format: (v) => `${v}%` },
  { key: 'grain', label: '亮度噪点', min: 0, max: 100, step: 1, format: (v) => `${v}%` },
  { key: 'noiseRoughness', label: '噪点粗糙度', min: 0, max: 100, step: 1, format: (v) => `${v}%` },
  { key: 'colorNoise', label: '彩色噪声', min: 0, max: 100, step: 1, format: (v) => `${v}%` },
  { key: 'fade', label: '褪色', min: 0, max: 100, step: 1, format: (v) => `${v}%` },
  { key: 'softness', label: '柔焦', min: 0, max: 100, step: 1, format: (v) => `${v}%` },
  { key: 'vignette', label: '暗角', min: 0, max: 100, step: 1, format: (v) => `${v}%` },
  { key: 'aberration', label: '色差', min: 0, max: 100, step: 1, format: (v) => `${v}%` },
]

const CROP_OPTIONS: Array<{ id: CropMode; label: string }> = [
  { id: 'square', label: '1:1' },
  { id: 'portrait', label: '4:5' },
  { id: 'original', label: '原比例' },
]

const readableFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const fileStem = (name: string) => name.replace(/\.[^.]+$/, '') || 'image'
const IMAGE_FILE_EXTENSION = /\.(?:avif|gif|heic|heif|jpe?g|png|svg|webp)$/i
const HEIC_FILE_EXTENSION = /\.(?:heic|heif)$/i

const isImageFile = (file: File) => file.type.startsWith('image/') || IMAGE_FILE_EXTENSION.test(file.name)

const isHeicFile = (file: File) => (
  file.type === 'image/heic'
  || file.type === 'image/heif'
  || file.type === 'image/heic-sequence'
  || file.type === 'image/heif-sequence'
  || HEIC_FILE_EXTENSION.test(file.name)
)

const decodeImageBlob = async (blob: Blob) => {
  const objectUrl = URL.createObjectURL(blob)
  const element = new Image()
  element.decoding = 'async'

  try {
    await new Promise<void>((resolve, reject) => {
      element.onload = () => resolve()
      element.onerror = () => reject(new Error('image decode failed'))
      element.src = objectUrl
    })

    if (!element.naturalWidth || !element.naturalHeight) throw new Error('invalid image')
    return { element, objectUrl }
  } catch (decodeError) {
    URL.revokeObjectURL(objectUrl)
    throw decodeError
  } finally {
    element.onload = null
    element.onerror = null
  }
}

const convertHeicImage = async (file: File) => {
  const { heicTo, isHeic } = await import('heic-to')
  if (!(await isHeic(file))) throw new Error('file is not a valid HEIC image')
  return heicTo({
    blob: file,
    type: 'image/jpeg',
    quality: 0.95,
  })
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadedRef = useRef<LoadedImage | null>(null)
  const loadRequestRef = useRef(0)
  const [image, setImage] = useState<LoadedImage | null>(null)
  const [settings, setSettings] = useState<FilterSettings>({ ...DEFAULT_SETTINGS })
  const [activePreset, setActivePreset] = useState<string | null>('cover')
  const [activeCategory, setActiveCategory] = useState<PresetCategoryId>('y2k')
  const [showOriginal, setShowOriginal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [format, setFormat] = useState<OutputFormat>('jpeg')
  const [quality, setQuality] = useState(0.9)
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const outputSize = image
    ? getOutputSize(image.width, image.height, settings.crop, settings.outputEdge)
    : null

  useEffect(() => {
    loadedRef.current = image
  }, [image])

  useEffect(() => {
    return () => {
      loadRequestRef.current += 1
      if (loadedRef.current) URL.revokeObjectURL(loadedRef.current.objectUrl)
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const chooseFile = () => {
    if (!isLoadingFile) fileInputRef.current?.click()
  }

  const loadFile = async (file: File) => {
    const requestId = ++loadRequestRef.current
    setError(null)
    setNotice(null)

    if (!isImageFile(file)) {
      setIsLoadingFile(false)
      setError('请选择手机相册中的图片文件。')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size === 0 || file.size > 30 * 1024 * 1024) {
      setIsLoadingFile(false)
      setError('图片需要小于 30 MB，且文件不能为空。')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const isHeic = isHeicFile(file)
    setIsLoadingFile(true)
    setNotice(isHeic ? '正在读取 HEIC / HEIF 照片…' : '正在读取图片…')

    try {
      let decoded: Awaited<ReturnType<typeof decodeImageBlob>>

      try {
        decoded = await decodeImageBlob(file)
      } catch (nativeDecodeError) {
        if (requestId !== loadRequestRef.current) return
        if (!isHeic) throw nativeDecodeError
        setNotice('正在兼容转换 HEIC / HEIF 照片…')
        const converted = await convertHeicImage(file)
        if (requestId !== loadRequestRef.current) return
        decoded = await decodeImageBlob(converted)
      }

      if (requestId !== loadRequestRef.current) {
        URL.revokeObjectURL(decoded.objectUrl)
        return
      }

      if (loadedRef.current) URL.revokeObjectURL(loadedRef.current.objectUrl)
      const nextImage = {
        element: decoded.element,
        file,
        objectUrl: decoded.objectUrl,
        width: decoded.element.naturalWidth,
        height: decoded.element.naturalHeight,
      }
      loadedRef.current = nextImage
      setImage(nextImage)
      setNotice(`${isHeic ? 'HEIC / HEIF 照片' : '图片'}已载入，仅在此浏览器中处理`)
    } catch {
      if (requestId === loadRequestRef.current) {
        setError(isHeic
          ? 'HEIC / HEIF 照片无法解码，可能是尺寸过大；请另存为 JPEG 后重试。'
          : '图片无法解码，请换一个文件重试。')
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setIsLoadingFile(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
  }

  const clearImage = () => {
    loadRequestRef.current += 1
    if (loadedRef.current) URL.revokeObjectURL(loadedRef.current.objectUrl)
    loadedRef.current = null
    setImage(null)
    setIsLoadingFile(false)
    setError(null)
    setShowOriginal(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) void loadFile(file)
  }

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    setSettings({ ...preset.settings })
    setActivePreset(preset.id)
    setActiveCategory(preset.category)
  }

  const updateSlider = (key: SliderConfig['key'], value: number) => {
    setSettings((current) => ({ ...current, [key]: value }))
    setActivePreset(null)
  }

  const reset = () => {
    setSettings({ ...DEFAULT_SETTINGS })
    setActivePreset('cover')
    setActiveCategory('y2k')
    setShowOriginal(false)
  }

  const visiblePresets = PRESETS.filter((preset) => preset.category === activeCategory)

  const download = async () => {
    if (!image || isExporting) return
    setIsExporting(true)
    setError(null)

    try {
      const result = await exportImage(image.element, settings, format, quality)
      const url = URL.createObjectURL(result.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${fileStem(image.file.name)}-nfs-lab.${format === 'jpeg' ? 'jpg' : 'png'}`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1200)
      setNotice(`已导出 ${result.width} × ${result.height}`)
    } catch {
      setError('导出失败，请尝试降低图片尺寸或切换格式。')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <main
      className="app-shell"
      onDragEnter={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setIsDragging(false)
      }}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="image/*,.heic,.heif"
        disabled={isLoadingFile}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void loadFile(file)
        }}
      />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Gauge size={20} /></span>
          <span className="brand-name">NFS LAB</span>
          <span className="brand-divider" />
          <span className="brand-subtitle">Y2K · FUJIFILM IMAGE FILTER</span>
        </div>

        <div className="topbar-actions">
          <span className="privacy-chip"><LockKeyhole size={13} /> 本地处理</span>
          <button type="button" className="icon-button" onClick={reset} aria-label="重置参数">
            <RotateCcw size={17} />
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!image || isExporting}
            onClick={() => void download()}
          >
            <Download size={16} />
            {isExporting ? '处理中…' : '导出图片'}
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-panel panel-scroll">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">01 / SOURCE</span>
              <h2>源图片</h2>
            </div>
            <UploadCloud size={19} />
          </div>

          {image ? (
            <div className="file-card">
              <img src={image.objectUrl} alt="当前上传的图片" />
              <div className="file-card-copy">
                <strong>{image.file.name}</strong>
                <span>{image.width} × {image.height} · {readableFileSize(image.file.size)}</span>
              </div>
              <button type="button" onClick={clearImage} aria-label="移除图片"><X size={15} /></button>
            </div>
          ) : (
            <button type="button" className="upload-card" disabled={isLoadingFile} onClick={chooseFile}>
              <span><ImagePlus size={21} /></span>
              <strong>{isLoadingFile ? '正在载入照片…' : '选择一张图片'}</strong>
              <small>{isLoadingFile ? 'HEIC 照片可能需要数秒' : '支持手机相册，兼容常见 HEIC / HEIF'}</small>
            </button>
          )}

          <div className="section-label">
            <span>风格预设</span>
            <Sparkles size={14} />
          </div>

          <div className="preset-categories" role="tablist" aria-label="风格分类">
            {PRESET_CATEGORIES.map((category) => {
              const count = PRESETS.filter((preset) => preset.category === category.id).length
              return (
                <button
                  type="button"
                  role="tab"
                  key={category.id}
                  aria-selected={activeCategory === category.id}
                  className={activeCategory === category.id ? 'is-active' : ''}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <strong>{category.name}</strong>
                  <small>{String(count).padStart(2, '0')} 个预设</small>
                </button>
              )
            })}
          </div>
          <p className="preset-category-description">
            {PRESET_CATEGORIES.find((category) => category.id === activeCategory)?.description}
          </p>

          <div className="preset-list">
            {visiblePresets.map((preset, index) => (
              <button
                type="button"
                key={preset.id}
                className={`preset-card ${activePreset === preset.id ? 'is-active' : ''}`}
                onClick={() => applyPreset(preset.id)}
              >
                <span className="preset-swatch" style={{ background: preset.swatch }}>
                  <i>{String(index + 1).padStart(2, '0')}</i>
                </span>
                <span className="preset-copy">
                  <strong>{preset.name}</strong>
                  <small>{preset.subtitle}</small>
                </span>
                <span className="preset-check">{activePreset === preset.id && <Check size={13} />}</span>
              </button>
            ))}
          </div>

          <div className="privacy-note">
            <ShieldCheck size={18} />
            <div><strong>照片不会上传</strong><span>所有像素处理都在当前浏览器完成。</span></div>
          </div>
        </aside>

        <section className="canvas-area">
          <div className="canvas-toolbar">
            <div className="segmented-control">
              <button type="button" className={!showOriginal ? 'is-active' : ''} onClick={() => setShowOriginal(false)}>
                <Eye size={14} /> 效果
              </button>
              <button type="button" className={showOriginal ? 'is-active' : ''} disabled={!image} onClick={() => setShowOriginal(true)}>
                <EyeOff size={14} /> 原图
              </button>
            </div>
            <div className="canvas-meta">
              {outputSize ? `${outputSize.width} × ${outputSize.height} 导出` : '等待图片'}
            </div>
          </div>

          <PreviewStage
            image={image}
            settings={settings}
            showOriginal={showOriginal}
            isDragging={isDragging}
            onChooseFile={chooseFile}
          />

          <div className="canvas-footer">
            <span><span className="status-dot" /> {image ? 'READY' : 'NO SOURCE'}</span>
            <span>图片仅保存在设备内存中</span>
          </div>
        </section>

        <aside className="right-panel panel-scroll">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">02 / TUNE</span>
              <h2>效果参数</h2>
            </div>
            <WandSparkles size={19} />
          </div>

          <div className="control-section">
            <div className="section-label"><span>画幅</span></div>
            <div className="crop-control">
              {CROP_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={settings.crop === option.id ? 'is-active' : ''}
                  onClick={() => {
                    setSettings((current) => ({ ...current, crop: option.id }))
                    setActivePreset(null)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-section slider-stack">
            <div className="section-label"><span>色彩与质感</span></div>
            {SLIDERS.map((slider) => {
              const value = settings[slider.key]
              const progress = ((value - slider.min) / (slider.max - slider.min)) * 100
              return (
                <label className="slider-row" key={slider.key}>
                  <span className="slider-copy"><span>{slider.label}</span><output>{slider.format(value)}</output></span>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={value}
                    style={{ '--progress': `${progress}%` } as CSSProperties}
                    onChange={(event) => updateSlider(slider.key, Number(event.target.value))}
                  />
                </label>
              )
            })}
          </div>

          <div className="control-section export-section">
            <div className="section-label"><span>导出设置</span><FileImage size={14} /></div>
            <label className="slider-row compact-slider output-edge-slider">
              <span className="slider-copy"><span>输出最长边</span><output>{settings.outputEdge}px</output></span>
              <input
                type="range"
                min="640"
                max="3200"
                step="8"
                value={settings.outputEdge}
                style={{ '--progress': `${((settings.outputEdge - 640) / 2560) * 100}%` } as CSSProperties}
                onChange={(event) => updateSlider('outputEdge', Number(event.target.value))}
              />
            </label>
            <div className="format-row">
              {(['jpeg', 'png'] as OutputFormat[]).map((item) => (
                <button type="button" key={item} className={format === item ? 'is-active' : ''} onClick={() => setFormat(item)}>
                  {item === 'jpeg' ? 'JPG' : 'PNG'}
                </button>
              ))}
            </div>
            {format === 'jpeg' && (
              <label className="slider-row compact-slider">
                <span className="slider-copy"><span>输出质量</span><output>{Math.round(quality * 100)}%</output></span>
                <input
                  type="range"
                  min="0.65"
                  max="1"
                  step="0.01"
                  value={quality}
                  style={{ '--progress': `${((quality - 0.65) / 0.35) * 100}%` } as CSSProperties}
                  onChange={(event) => setQuality(Number(event.target.value))}
                />
              </label>
            )}
          </div>
        </aside>
      </section>

      {isDragging && (
        <div className="drop-overlay">
          <div><UploadCloud size={34} /><strong>松开即可载入图片</strong><span>不会上传到任何服务器</span></div>
        </div>
      )}

      {(notice || error) && (
        <div className={`toast ${error ? 'is-error' : ''}`}>
          {error ? <X size={16} /> : <Check size={16} />}
          {error ?? notice}
        </div>
      )}
    </main>
  )
}
