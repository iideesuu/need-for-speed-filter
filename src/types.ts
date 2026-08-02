export type CropMode = 'square' | 'portrait' | 'original'
export type OutputFormat = 'jpeg' | 'png'

export interface FilterSettings {
  crop: CropMode
  previewEdge: number
  outputEdge: number
  lowResolution: number
  exposure: number
  contrast: number
  saturation: number
  temperature: number
  magenta: number
  bloom: number
  motion: number
  grain: number
  noiseRoughness: number
  colorNoise: number
  fade: number
  softness: number
  vignette: number
  aberration: number
}

export interface LoadedImage {
  element: HTMLImageElement
  file: File
  objectUrl: string
  width: number
  height: number
}
