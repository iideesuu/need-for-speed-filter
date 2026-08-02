import type { CropMode, FilterSettings } from '../types'

const PREVIEW_EDGE = 900

const clamp = (value: number, min = 0, max = 255) => Math.min(max, Math.max(min, value))

const noiseAt = (x: number, y: number, seed: number) => {
  let value = Math.imul(x + seed * 1013, 374761393) ^ Math.imul(y + seed * 1619, 668265263)
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295
}

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
  const grain = settings.grain / 100
  const noiseRoughness = settings.noiseRoughness / 100
  const colorNoise = settings.colorNoise / 100
  const lowResolution = settings.lowResolution / 100
  const channelShift = Math.round((settings.aberration / 100) * 7)
  const noiseBlockSize = 2 + Math.round(noiseRoughness * 2)
  const fineNoiseStrength = grain * 23
  const coarseNoiseStrength = grain * (8 + noiseRoughness * 27)
  const colorNoiseStrength = grain * colorNoise * 34
  const quantizationStep = 1 + Math.round(lowResolution * 5 + noiseRoughness * 3)
  const width = canvas.width

  for (let y = 0; y < canvas.height; y += 1) {
    const rowNoise = (noiseAt(0, Math.floor(y / 2), 73) - 0.5) * noiseRoughness * 5
    let coarseNoise = 0
    let redNoise = 0
    let blueNoise = 0

    for (let x = 0; x < width; x += 1) {
      if (x % noiseBlockSize === 0) {
        const blockX = Math.floor(x / noiseBlockSize)
        const blockY = Math.floor(y / noiseBlockSize)
        coarseNoise = (noiseAt(blockX, blockY, 29) - 0.5) * coarseNoiseStrength
        redNoise = (noiseAt(blockX, blockY, 41) - 0.5) * colorNoiseStrength
        blueNoise = (noiseAt(blockX, blockY, 59) - 0.5) * colorNoiseStrength
      }

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

      const shadowNoiseBoost = 0.78 + (1 - luminance) * 0.58
      const fineNoise = (noiseAt(x, y, 17) - 0.5) * fineNoiseStrength
      const luminanceNoise = (fineNoise + coarseNoise + rowNoise) * shadowNoiseBoost

      red += luminanceNoise + redNoise
      green += luminanceNoise * 0.92
      blue += luminanceNoise + blueNoise

      red = Math.round(red / quantizationStep) * quantizationStep
      green = Math.round(green / quantizationStep) * quantizationStep
      blue = Math.round(blue / quantizationStep) * quantizationStep

      data[index] = clamp(red)
      data[index + 1] = clamp(green)
      data[index + 2] = clamp(blue)
    }
  }

  context.putImageData(image, 0, 0)
}

const applyLowResolution = (canvas: HTMLCanvasElement, amount: number) => {
  if (amount <= 0) return

  const strength = clamp(amount, 0, 100) / 100
  const scale = Math.max(0.3, 1 - strength * 0.72)
  const reducedWidth = Math.max(1, Math.round(canvas.width * scale))
  const reducedHeight = Math.max(1, Math.round(canvas.height * scale))

  if (reducedWidth >= canvas.width && reducedHeight >= canvas.height) return

  const reduced = makeCanvas(reducedWidth, reducedHeight)
  const reducedContext = reduced.getContext('2d')
  const context = canvas.getContext('2d')
  if (!reducedContext || !context) return

  reducedContext.imageSmoothingEnabled = true
  reducedContext.imageSmoothingQuality = 'medium'
  reducedContext.drawImage(canvas, 0, 0, reducedWidth, reducedHeight)

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = strength > 0.66 ? 'low' : 'medium'
  context.drawImage(reduced, 0, 0, canvas.width, canvas.height)
}

const drawOriginal = (
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  crop: CropMode,
  maxEdge: number,
) => {
  const cropAspect = aspectForCrop(crop, image.naturalWidth, image.naturalHeight)
  const cropRect = getCropRect(image.naturalWidth, image.naturalHeight, cropAspect)
  const sourceEdge = Math.max(cropRect.width, cropRect.height)
  const resolvedEdge = Math.min(maxEdge, Math.max(1, Math.round(sourceEdge)))
  const output = getOutputSize(image.naturalWidth, image.naturalHeight, crop, resolvedEdge)
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
  const maxEdge = options.exportSize ? settings.outputEdge : Math.min(PREVIEW_EDGE, settings.outputEdge)
  const output = drawOriginal(image, target, settings.crop, maxEdge)
  if (options.original) return output

  applyLowResolution(target, settings.lowResolution)

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
