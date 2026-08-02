import type { CropMode, FilterSettings } from '../types'

const PREVIEW_EDGE = 1200
const EXPORT_EDGE = 2400
let noiseTexture: HTMLCanvasElement | null = null

const clamp = (value: number, min = 0, max = 255) => Math.min(max, Math.max(min, value))

const makeCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

const aspectForCrop = (crop: CropMode, sourceWidth: number, sourceHeight: number) => {
  if (crop === 'square') return 1
  if (crop === 'portrait') return 4 / 5
  return sourceWidth / sourceHeight
}

const getCropRect = (width: number, height: number, aspect: number) => {
  const sourceAspect = width / height

  if (sourceAspect > aspect) {
    const cropWidth = height * aspect
    return { x: (width - cropWidth) / 2, y: 0, width: cropWidth, height }
  }

  const cropHeight = width / aspect
  return { x: 0, y: (height - cropHeight) / 2, width, height: cropHeight }
}

const getOutputSize = (
  sourceWidth: number,
  sourceHeight: number,
  crop: CropMode,
  maxEdge: number,
) => {
  const aspect = aspectForCrop(crop, sourceWidth, sourceHeight)
  if (aspect >= 1) {
    return { width: maxEdge, height: Math.round(maxEdge / aspect) }
  }
  return { width: Math.round(maxEdge * aspect), height: maxEdge }
}

const buildNoiseTexture = () => {
  if (noiseTexture) return noiseTexture

  const canvas = makeCanvas(128, 128)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return canvas

  const image = context.createImageData(canvas.width, canvas.height)
  let seed = 9173
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  for (let index = 0; index < image.data.length; index += 4) {
    const value = Math.round(random() * 255)
    image.data[index] = value
    image.data[index + 1] = value
    image.data[index + 2] = value
    image.data[index + 3] = 255
  }

  context.putImageData(image, 0, 0)
  noiseTexture = canvas
  return canvas
}

const gradePixels = (canvas: HTMLCanvasElement, settings: FilterSettings) => {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return

  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  const source = new Uint8ClampedArray(image.data)
  const data = image.data
  const exposure = 2 ** settings.exposure
  const contrast = 1 + settings.contrast / 100
  const saturation = 1 + settings.saturation / 100
  const temperature = settings.temperature / 100
  const magenta = settings.magenta / 100
  const fade = settings.fade / 100
  const channelShift = Math.round((settings.aberration / 100) * 7)
  const width = canvas.width

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      const redIndex = (y * width + Math.min(width - 1, x + channelShift)) * 4
      const blueIndex = (y * width + Math.max(0, x - channelShift)) * 4

      let red = source[redIndex] * exposure
      let green = source[index + 1] * exposure
      let blue = source[blueIndex + 2] * exposure

      red = (red - 127.5) * contrast + 127.5
      green = (green - 127.5) * contrast + 127.5
      blue = (blue - 127.5) * contrast + 127.5

      const luminance = clamp(red * 0.299 + green * 0.587 + blue * 0.114) / 255
      red = luminance * 255 + (red - luminance * 255) * saturation
      green = luminance * 255 + (green - luminance * 255) * saturation
      blue = luminance * 255 + (blue - luminance * 255) * saturation

      red += temperature * 31
      green += temperature * 5
      blue -= temperature * 28

      const shadowWeight = 0.28 + (1 - luminance) * 0.72
      red += magenta * shadowWeight * 31
      green -= magenta * shadowWeight * 8
      blue += magenta * shadowWeight * 38

      const fadeLift = fade * (1 - luminance) * 42
      red += fadeLift * 1.06
      green += fadeLift * 0.89
      blue += fadeLift * 1.12

      data[index] = clamp(red)
      data[index + 1] = clamp(green)
      data[index + 2] = clamp(blue)
    }
  }

  context.putImageData(image, 0, 0)
}

const drawOriginal = (
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  crop: CropMode,
  maxEdge: number,
) => {
  const cropAspect = aspectForCrop(crop, image.naturalWidth, image.naturalHeight)
  const cropRect = getCropRect(image.naturalWidth, image.naturalHeight, cropAspect)
  const output = getOutputSize(image.naturalWidth, image.naturalHeight, crop, maxEdge)
  canvas.width = output.width
  canvas.height = output.height

  const context = canvas.getContext('2d')
  if (!context) return output

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height,
    0,
    0,
    output.width,
    output.height,
  )

  return output
}

export const renderImage = (
  image: HTMLImageElement,
  target: HTMLCanvasElement,
  settings: FilterSettings,
  options: { exportSize?: boolean; original?: boolean } = {},
) => {
  const maxEdge = options.exportSize ? EXPORT_EDGE : PREVIEW_EDGE
  const output = drawOriginal(image, target, settings.crop, maxEdge)
  if (options.original) return output

  const base = makeCanvas(target.width, target.height)
  const baseContext = base.getContext('2d')
  if (!baseContext) return output

  baseContext.imageSmoothingEnabled = true
  baseContext.imageSmoothingQuality = 'high'
  const softness = Math.max(0, settings.softness / 13)
  baseContext.filter = softness > 0 ? `blur(${softness.toFixed(2)}px)` : 'none'
  baseContext.drawImage(target, 0, 0)
  baseContext.filter = 'none'
  gradePixels(base, settings)

  const context = target.getContext('2d')
  if (!context) return output
  context.clearRect(0, 0, target.width, target.height)

  if (settings.motion > 0) {
    const distance = (settings.motion / 100) * Math.max(10, target.width * 0.035)
    context.save()
    context.globalAlpha = 0.065 + settings.motion / 900
    for (let copy = 4; copy >= 1; copy -= 1) {
      const offset = (distance * copy) / 4
      context.drawImage(base, offset, 0)
      context.drawImage(base, -offset, 0)
    }
    context.restore()
  }

  context.drawImage(base, 0, 0)

  if (settings.bloom > 0) {
    context.save()
    context.globalCompositeOperation = 'screen'
    context.globalAlpha = settings.bloom / 170
    context.filter = `blur(${1.5 + settings.bloom / 6}px) brightness(1.12)`
    context.drawImage(base, 0, 0)
    context.restore()
  }

  if (settings.magenta > 0) {
    context.save()
    context.globalCompositeOperation = 'soft-light'
    context.globalAlpha = settings.magenta / 620
    context.fillStyle = '#f15bb5'
    context.fillRect(0, 0, target.width, target.height)
    context.restore()
  }

  if (settings.fade > 0) {
    context.save()
    context.globalCompositeOperation = 'screen'
    context.globalAlpha = settings.fade / 560
    context.fillStyle = '#d7c8e5'
    context.fillRect(0, 0, target.width, target.height)
    context.restore()
  }

  if (settings.vignette > 0) {
    const radius = Math.max(target.width, target.height) * 0.72
    const vignette = context.createRadialGradient(
      target.width * 0.5,
      target.height * 0.44,
      Math.min(target.width, target.height) * 0.12,
      target.width * 0.5,
      target.height * 0.48,
      radius,
    )
    vignette.addColorStop(0, 'rgba(18, 8, 23, 0)')
    vignette.addColorStop(1, `rgba(18, 8, 23, ${settings.vignette / 145})`)
    context.fillStyle = vignette
    context.fillRect(0, 0, target.width, target.height)
  }

  if (settings.grain > 0) {
    const pattern = context.createPattern(buildNoiseTexture(), 'repeat')
    if (pattern) {
      context.save()
      context.globalCompositeOperation = 'soft-light'
      context.globalAlpha = settings.grain / 240
      context.fillStyle = pattern
      context.fillRect(0, 0, target.width, target.height)
      context.restore()
    }
  }

  return output
}

export const exportImage = async (
  image: HTMLImageElement,
  settings: FilterSettings,
  format: 'jpeg' | 'png',
  quality: number,
) => {
  const styled = makeCanvas(1, 1)
  renderImage(image, styled, settings, { exportSize: true })

  let exportCanvas = styled
  if (format === 'jpeg') {
    const flattened = makeCanvas(styled.width, styled.height)
    const context = flattened.getContext('2d')
    if (context) {
      context.fillStyle = '#eee4ea'
      context.fillRect(0, 0, flattened.width, flattened.height)
      context.drawImage(styled, 0, 0)
      exportCanvas = flattened
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    exportCanvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('无法生成导出文件'))),
      format === 'jpeg' ? 'image/jpeg' : 'image/png',
      quality,
    )
  })

  return { blob, width: exportCanvas.width, height: exportCanvas.height }
}
