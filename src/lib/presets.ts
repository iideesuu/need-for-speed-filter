import type { FilterSettings } from '../types'

export interface FilterPreset {
  id: string
  name: string
  subtitle: string
  swatch: string
  settings: FilterSettings
  category: PresetCategoryId
  isNoise?: boolean
}

export type PresetCategoryId = 'y2k' | 'fujifilm'

export interface PresetCategory {
  id: PresetCategoryId
  name: string
  description: string
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  { id: 'y2k', name: 'Y2K 风格', description: '数码闪光 · 低清噪点 · 速度感' },
  { id: 'fujifilm', name: '富士胶片', description: '经典模拟 · 电影色彩 · 细腻颗粒' },
]

const originalCover: FilterSettings = {
  crop: 'square',
  previewEdge: 1200,
  outputEdge: 2400,
  lowResolution: 0,
  exposure: 0.28,
  contrast: -8,
  saturation: -6,
  temperature: -5,
  magenta: 52,
  bloom: 32,
  motion: 18,
  grain: 27,
  noiseRoughness: 0,
  colorNoise: 0,
  fade: 17,
  softness: 5,
  vignette: 12,
  aberration: 8,
}

const originalDusk: FilterSettings = {
  crop: 'square',
  previewEdge: 1200,
  outputEdge: 2400,
  lowResolution: 0,
  exposure: 0.4,
  contrast: -13,
  saturation: -2,
  temperature: 8,
  magenta: 46,
  bloom: 45,
  motion: 31,
  grain: 18,
  noiseRoughness: 0,
  colorNoise: 0,
  fade: 24,
  softness: 8,
  vignette: 7,
  aberration: 5,
}

const originalFlash: FilterSettings = {
  crop: 'square',
  previewEdge: 1200,
  outputEdge: 2400,
  lowResolution: 0,
  exposure: 0.17,
  contrast: 19,
  saturation: -9,
  temperature: 7,
  magenta: 24,
  bloom: 14,
  motion: 5,
  grain: 36,
  noiseRoughness: 0,
  colorNoise: 0,
  fade: 5,
  softness: 0,
  vignette: 26,
  aberration: 11,
}

const originalPrint: FilterSettings = {
  crop: 'square',
  previewEdge: 1200,
  outputEdge: 2400,
  lowResolution: 0,
  exposure: 0.11,
  contrast: -19,
  saturation: -21,
  temperature: 13,
  magenta: 39,
  bloom: 11,
  motion: 3,
  grain: 49,
  noiseRoughness: 0,
  colorNoise: 0,
  fade: 38,
  softness: 11,
  vignette: 17,
  aberration: 17,
}

export const PRESETS: FilterPreset[] = [
  {
    id: 'cover',
    category: 'y2k',
    name: '速度封面',
    subtitle: '紫调 · 过曝 · 慢快门 · 原版',
    swatch: 'linear-gradient(135deg, #f6d3e7 0%, #ad6e9c 38%, #38364f 72%, #e76c75 100%)',
    settings: originalCover,
  },
  {
    id: 'dusk',
    category: 'y2k',
    name: '黄昏高架',
    subtitle: '粉霞 · 车流 · 柔光 · 原版',
    swatch: 'linear-gradient(145deg, #f6c9b8 0%, #c7869f 42%, #53456b 72%, #202337 100%)',
    settings: originalDusk,
  },
  {
    id: 'flash',
    category: 'y2k',
    name: '闪光抓拍',
    subtitle: '硬闪 · 高反差 · 狗仔感 · 原版',
    swatch: 'linear-gradient(135deg, #f1f0e9 0%, #d7b8bf 35%, #7d263f 58%, #18151c 100%)',
    settings: originalFlash,
  },
  {
    id: 'print',
    category: 'y2k',
    name: '褪色印刷',
    subtitle: '旧杂志 · 色偏 · 粗颗粒 · 原版',
    swatch: 'linear-gradient(145deg, #d5c5a8 0%, #b69484 31%, #805b68 58%, #4a4743 100%)',
    settings: originalPrint,
  },
  {
    id: 'cover-noise',
    category: 'y2k',
    name: '速度封面 · 低清噪点',
    subtitle: '紫调 · 58% 工作分辨率 · 彩色噪声',
    swatch: 'linear-gradient(135deg, #f6d3e7 0%, #ad6e9c 38%, #38364f 72%, #e76c75 100%)',
    isNoise: true,
    settings: {
      ...originalCover,
      previewEdge: 900,
      outputEdge: 1080,
      lowResolution: 58,
      grain: 64,
      noiseRoughness: 45,
      colorNoise: 34,
    },
  },
  {
    id: 'dusk-noise',
    category: 'y2k',
    name: '黄昏高架 · 低清噪点',
    subtitle: '粉霞 · 64% 工作分辨率 · 粗彩噪',
    swatch: 'linear-gradient(145deg, #f6c9b8 0%, #c7869f 42%, #53456b 72%, #202337 100%)',
    isNoise: true,
    settings: {
      ...originalDusk,
      previewEdge: 900,
      outputEdge: 1080,
      lowResolution: 50,
      grain: 54,
      noiseRoughness: 60,
      colorNoise: 46,
    },
  },
  {
    id: 'flash-noise',
    category: 'y2k',
    name: '闪光抓拍 · 低清噪点',
    subtitle: '硬闪 · 72% 工作分辨率 · 粗颗粒',
    swatch: 'linear-gradient(135deg, #f1f0e9 0%, #d7b8bf 35%, #7d263f 58%, #18151c 100%)',
    isNoise: true,
    settings: {
      ...originalFlash,
      previewEdge: 900,
      outputEdge: 1024,
      lowResolution: 39,
      grain: 62,
      noiseRoughness: 36,
      colorNoise: 20,
    },
  },
  {
    id: 'print-noise',
    category: 'y2k',
    name: '褪色印刷 · 低清噪点',
    subtitle: '旧杂志 · 50% 工作分辨率 · 粗噪',
    swatch: 'linear-gradient(145deg, #d5c5a8 0%, #b69484 31%, #805b68 58%, #4a4743 100%)',
    isNoise: true,
    settings: {
      ...originalPrint,
      previewEdge: 900,
      outputEdge: 960,
      lowResolution: 69,
      grain: 78,
      noiseRoughness: 68,
      colorNoise: 28,
    },
  },
  {
    id: 'provia',
    category: 'fujifilm',
    name: 'PROVIA · 标准',
    subtitle: '自然色彩 · 清透层次 · 日常万能',
    swatch: 'linear-gradient(145deg, #f4ddc2 0%, #9fbd9e 39%, #4d7894 73%, #273b59 100%)',
    settings: {
      crop: 'original', previewEdge: 1200, outputEdge: 2400, lowResolution: 0,
      exposure: 0.04, contrast: 5, saturation: 7, temperature: 1, magenta: 0,
      bloom: 0, motion: 0, grain: 7, noiseRoughness: 0, colorNoise: 0, fade: 0,
      softness: 0, vignette: 3, aberration: 0,
    },
  },
  {
    id: 'velvia',
    category: 'fujifilm',
    name: 'Velvia · 鲜艳',
    subtitle: '高饱和 · 深蓝绿 · 风光浓郁',
    swatch: 'linear-gradient(145deg, #f7c06f 0%, #d66f5c 35%, #367c70 65%, #172e55 100%)',
    settings: {
      crop: 'original', previewEdge: 1200, outputEdge: 2400, lowResolution: 0,
      exposure: -0.03, contrast: 17, saturation: 34, temperature: 5, magenta: 2,
      bloom: 2, motion: 0, grain: 6, noiseRoughness: 0, colorNoise: 0, fade: 0,
      softness: 0, vignette: 7, aberration: 0,
    },
  },
  {
    id: 'astia',
    category: 'fujifilm',
    name: 'ASTIA · 柔和',
    subtitle: '粉彩肤色 · 柔和反差 · 人像友好',
    swatch: 'linear-gradient(145deg, #f8d7cc 0%, #dda5a4 39%, #8c8faf 70%, #46536f 100%)',
    settings: {
      crop: 'original', previewEdge: 1200, outputEdge: 2400, lowResolution: 0,
      exposure: 0.13, contrast: -7, saturation: 8, temperature: 7, magenta: 3,
      bloom: 6, motion: 0, grain: 5, noiseRoughness: 0, colorNoise: 0, fade: 5,
      softness: 3, vignette: 2, aberration: 0,
    },
  },
  {
    id: 'classic-chrome',
    category: 'fujifilm',
    name: 'Classic Chrome',
    subtitle: '低饱和 · 复古青蓝 · 纪实质感',
    swatch: 'linear-gradient(145deg, #d8c39d 0%, #a9917a 38%, #627d79 68%, #283e48 100%)',
    settings: {
      crop: 'original', previewEdge: 1200, outputEdge: 2400, lowResolution: 0,
      exposure: 0.02, contrast: 9, saturation: -26, temperature: -4, magenta: 2,
      bloom: 0, motion: 0, grain: 13, noiseRoughness: 0, colorNoise: 0, fade: 10,
      softness: 0, vignette: 4, aberration: 0,
    },
  },
  {
    id: 'classic-neg',
    category: 'fujifilm',
    name: 'Classic Neg',
    subtitle: '硬朗反差 · 复古街头 · 暖色高光',
    swatch: 'linear-gradient(145deg, #f0bd80 0%, #c87c62 38%, #547b79 68%, #243b49 100%)',
    settings: {
      crop: 'original', previewEdge: 1200, outputEdge: 2400, lowResolution: 0,
      exposure: 0.05, contrast: 22, saturation: -9, temperature: 7, magenta: 0,
      bloom: 0, motion: 0, grain: 16, noiseRoughness: 0, colorNoise: 0, fade: 6,
      softness: 0, vignette: 7, aberration: 0,
    },
  },
  {
    id: 'nostalgic-neg',
    category: 'fujifilm',
    name: 'Nostalgic Neg.',
    subtitle: '琥珀高光 · 青绿色阴影 · 怀旧氛围',
    swatch: 'linear-gradient(145deg, #f4c68f 0%, #d18c68 36%, #6e9683 68%, #344b55 100%)',
    settings: {
      crop: 'original', previewEdge: 1200, outputEdge: 2400, lowResolution: 0,
      exposure: 0.16, contrast: -3, saturation: -7, temperature: 13, magenta: 3,
      bloom: 6, motion: 0, grain: 14, noiseRoughness: 0, colorNoise: 0, fade: 16,
      softness: 2, vignette: 4, aberration: 0,
    },
  },
  {
    id: 'eterna',
    category: 'fujifilm',
    name: 'ETERNA · 电影',
    subtitle: '低反差 · 低饱和 · 电影宽容度',
    swatch: 'linear-gradient(145deg, #cfb99b 0%, #9e9888 37%, #66827e 68%, #344a50 100%)',
    settings: {
      crop: 'original', previewEdge: 1200, outputEdge: 2400, lowResolution: 0,
      exposure: 0.08, contrast: -20, saturation: -29, temperature: -5, magenta: 1,
      bloom: 4, motion: 0, grain: 10, noiseRoughness: 0, colorNoise: 0, fade: 18,
      softness: 4, vignette: 1, aberration: 0,
    },
  },
  {
    id: 'acros',
    category: 'fujifilm',
    name: 'ACROS · 黑白',
    subtitle: '高反差黑白 · 丰富灰阶 · 细腻颗粒',
    swatch: 'linear-gradient(145deg, #f1eee8 0%, #b7b3ae 35%, #66656a 66%, #17171b 100%)',
    settings: {
      crop: 'original', previewEdge: 1200, outputEdge: 2400, lowResolution: 0,
      exposure: 0.03, contrast: 24, saturation: -100, temperature: 0, magenta: 0,
      bloom: 0, motion: 0, grain: 25, noiseRoughness: 0, colorNoise: 0, fade: 0,
      softness: 1, vignette: 12, aberration: 0,
    },
  },
]

export const DEFAULT_SETTINGS = { ...originalCover }
