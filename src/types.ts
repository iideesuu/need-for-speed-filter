export type CropMode = 'square' | 'portrait' | 'original'
export type OutputFormat = 'jpeg' | 'png'

export interface FilterSettings {
  crop: CropMode
  exposure: number
  contrast: number
  saturation: number
  temperature: number
  magenta: number
  bloom: number
  motion: number
  grain: number
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

export interface RenderInfo {
  width: number
  height: number
  renderer: 'WebGL' | 'Canvas 2D'
}
