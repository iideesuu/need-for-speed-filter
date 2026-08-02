import type { FilterSettings } from '../types'

export interface FilterPreset {
  id: string
  name: string
  subtitle: string
  swatch: string
  settings: FilterSettings
}

export const PRESETS: FilterPreset[] = [
  {
    id: 'cover',
    name: '速度封面',
    subtitle: '紫调 · 低清 · 数码噪点',
    swatch: 'linear-gradient(135deg, #f6d3e7 0%, #ad6e9c 38%, #38364f 72%, #e76c75 100%)',
    settings: {
      crop: 'square',
      outputEdge: 1080,
      lowResolution: 58,
      exposure: 0.28,
      contrast: -8,
      saturation: -6,
      temperature: -5,
      magenta: 52,
      bloom: 32,
      motion: 18,
      grain: 64,
      noiseRoughness: 45,
      colorNoise: 34,
      fade: 17,
      softness: 5,
      vignette: 12,
      aberration: 8,
    },
  },
  {
    id: 'dusk',
    name: '黄昏高架',
    subtitle: '粉霞 · 慢快门 · 低像素',
    swatch: 'linear-gradient(145deg, #f6c9b8 0%, #c7869f 42%, #53456b 72%, #202337 100%)',
    settings: {
      crop: 'square',
      outputEdge: 1080,
      lowResolution: 50,
      exposure: 0.4,
      contrast: -13,
      saturation: -2,
      temperature: 8,
      magenta: 46,
      bloom: 45,
      motion: 31,
      grain: 54,
      noiseRoughness: 60,
      colorNoise: 46,
      fade: 24,
      softness: 8,
      vignette: 7,
      aberration: 5,
    },
  },
  {
    id: 'flash',
    name: '闪光抓拍',
    subtitle: '硬闪 · 粗噪点 · 狗仔感',
    swatch: 'linear-gradient(135deg, #f1f0e9 0%, #d7b8bf 35%, #7d263f 58%, #18151c 100%)',
    settings: {
      crop: 'square',
      outputEdge: 1024,
      lowResolution: 39,
      exposure: 0.17,
      contrast: 19,
      saturation: -9,
      temperature: 7,
      magenta: 24,
      bloom: 14,
      motion: 5,
      grain: 62,
      noiseRoughness: 36,
      colorNoise: 20,
      fade: 5,
      softness: 0,
      vignette: 26,
      aberration: 11,
    },
  },
  {
    id: 'print',
    name: '褪色印刷',
    subtitle: '旧杂志 · 低清 · 粗颗粒',
    swatch: 'linear-gradient(145deg, #d5c5a8 0%, #b69484 31%, #805b68 58%, #4a4743 100%)',
    settings: {
      crop: 'square',
      outputEdge: 960,
      lowResolution: 69,
      exposure: 0.11,
      contrast: -19,
      saturation: -21,
      temperature: 13,
      magenta: 39,
      bloom: 11,
      motion: 3,
      grain: 78,
      noiseRoughness: 68,
      colorNoise: 28,
      fade: 38,
      softness: 11,
      vignette: 17,
      aberration: 17,
    },
  },
]

export const DEFAULT_SETTINGS = { ...PRESETS[0].settings }
