# need-for-speed-filter React 学习笔记

这是一个“纯前端、本地运行”的单页图片滤镜应用。

最关键的理解是：

- React：管理界面、状态、事件和数据流。
- Canvas 2D：真正进行裁剪、调色、噪点、柔焦等图片处理。
- PixiJS/WebGL：把处理好的 Canvas 高效显示在预览区域。
- Vite：开发服务器与生产构建。
- TypeScript：约束组件、状态、参数和 DOM 类型。
- 没有后端，图片不会上传。

## 一、整体结构

```text
need-for-speed-filter/
├─ index.html                 浏览器入口
├─ package.json               依赖和 npm 命令
├─ vite.config.ts             Vite 配置
├─ tsconfig.json              TypeScript 配置
├─ Dockerfile                 Docker 镜像
├─ compose.yaml               本地开发容器
├─ public/
│  └─ CNAME                   自定义域名
├─ dist/                      构建后的静态网站
└─ src/
   ├─ main.tsx                React 启动入口
   ├─ App.tsx                 主组件、主要业务逻辑
   ├─ types.ts                公共 TypeScript 类型
   ├─ styles.css              全局样式和响应式布局
   ├─ components/
   │  └─ PreviewStage.tsx     图片预览组件
   └─ lib/
      ├─ presets.ts           8 个滤镜预设
      └─ imagePipeline.ts     Canvas 图片处理算法
```

组件和数据关系如下：

```text
index.html
   │
   ▼
main.tsx
   │ render
   ▼
App.tsx
   ├─ 管理上传文件
   ├─ 管理所有 React 状态
   ├─ 展示左侧预设
   ├─ 展示右侧参数
   ├─ 调用 exportImage()
   │
   └─ props
       ▼
 PreviewStage.tsx
       │
       ├─ 调用 renderImage()
       ▼
 imagePipeline.ts
       │
       ├─ Canvas 逐像素处理
       ▼
 隐藏 Canvas
       │
       ├─ WebGL 可用 → PixiJS 显示
       └─ WebGL 不可用 → 普通 Canvas 显示
```

## 二、程序从哪里启动

### `index.html`

源码：[index.html](./need-for-speed-filter/index.html)

核心内容：

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

`<div id="root">` 是 React 挂载点。React 不会自己创建整个 HTML 页面，而是接管这个元素内部的内容。

`type="module"` 表示脚本使用 ES Module，因此支持：

```ts
import App from './App'
export default App
```

### `main.tsx`

源码：[src/main.tsx](./need-for-speed-filter/src/main.tsx)

```tsx
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(<App />)
```

逐句理解：

```ts
document.getElementById('root')
```

获取 `index.html` 里的挂载元素。

末尾的 `!` 是 TypeScript 的非空断言：

```ts
document.getElementById('root')!
```

意思是：“我确定这里不是 `null`。”

```ts
createRoot(...).render(<App />)
```

创建 React 根节点，然后渲染 `App` 组件。

`<App />` 是 JSX，近似于：

```ts
React.createElement(App)
```

这里不用写：

```ts
import React from 'react'
```

因为 `tsconfig.json` 使用了：

```json
"jsx": "react-jsx"
```

这是新版 JSX 自动转换模式。

## 三、公共类型

源码：[src/types.ts](./need-for-speed-filter/src/types.ts)

### 联合类型

```ts
export type CropMode = 'square' | 'portrait' | 'original'
export type OutputFormat = 'jpeg' | 'png'
```

这表示变量只能取指定字符串：

```ts
let crop: CropMode

crop = 'square'    // 正确
crop = 'portrait'  // 正确
crop = 'abc'       // TypeScript 报错
```

这比普通的 `string` 更安全。

### `FilterSettings`

```ts
export interface FilterSettings {
  crop: CropMode
  previewEdge: number
  outputEdge: number
  // ...
}
```

这是整个滤镜参数对象的结构。

| 属性 | 含义 |
|---|---|
| `crop` | 裁剪比例 |
| `previewEdge` | 预览图最长边 |
| `outputEdge` | 导出图最长边 |
| `lowResolution` | 降低工作分辨率 |
| `exposure` | 曝光，按摄影档位计算 |
| `contrast` | 对比度 |
| `saturation` | 饱和度 |
| `temperature` | 色温 |
| `magenta` | 紫红偏色 |
| `bloom` | 高光溢出 |
| `motion` | 横向拖影 |
| `grain` | 亮度噪点 |
| `noiseRoughness` | 噪点块大小与强度 |
| `colorNoise` | 红蓝彩色噪点 |
| `fade` | 阴影抬升、褪色 |
| `softness` | 柔焦 |
| `vignette` | 暗角 |
| `aberration` | RGB 色差 |

### `LoadedImage`

```ts
export interface LoadedImage {
  element: HTMLImageElement
  file: File
  objectUrl: string
  width: number
  height: number
}
```

它同时保存：

- 原始浏览器 `File`
- 已经解码的 `<img>` 对象
- 用于展示图片的临时 URL
- 图片真实宽高

## 四、预设系统

源码：[src/lib/presets.ts](./need-for-speed-filter/src/lib/presets.ts)

### 预设类型

```ts
export interface FilterPreset {
  id: string
  name: string
  subtitle: string
  swatch: string
  settings: FilterSettings
  isNoise?: boolean
}
```

`isNoise?: boolean` 中的 `?` 表示可选属性。

### 基础预设

项目先定义四个基础对象：

```ts
const originalCover: FilterSettings = { ... }
const originalDusk: FilterSettings = { ... }
const originalFlash: FilterSettings = { ... }
const originalPrint: FilterSettings = { ... }
```

然后构造四个低清噪点版本：

```ts
settings: {
  ...originalCover,
  previewEdge: 900,
  outputEdge: 1080,
  lowResolution: 58,
  grain: 64,
}
```

`...originalCover` 是对象展开语法。

等价于先复制所有属性，再覆盖后面的属性：

```ts
const settings = Object.assign({}, originalCover, {
  previewEdge: 900,
  outputEdge: 1080,
})
```

因为 `FilterSettings` 的属性都是数字或字符串，所以浅拷贝已经足够。

```ts
export const DEFAULT_SETTINGS = { ...originalCover }
```

这里也复制一份，避免其他代码不小心直接修改原始预设对象。

## 五、主组件 `App`

源码：[src/App.tsx](./need-for-speed-filter/src/App.tsx) 是整个应用的控制中心。

### 1. 导入语法

```ts
import {
  type CSSProperties,
  type DragEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
```

`type CSSProperties` 表示只导入类型。构建后不会产生对应 JavaScript。

```ts
import type {
  CropMode,
  FilterSettings,
  LoadedImage,
  OutputFormat,
} from './types'
```

整个导入都是类型。

### 2. 高级类型写法

```ts
interface SliderConfig {
  key: keyof Omit<FilterSettings, 'crop'>
}
```

拆开理解：

```ts
Omit<FilterSettings, 'crop'>
```

得到一个删除了 `crop` 属性的新类型。

```ts
keyof ...
```

取得这个类型所有属性名组成的联合类型。

所以 `key` 只能是：

```ts
'exposure' | 'contrast' | 'saturation' | ...
```

不能随意写不存在的属性。

另一个写法：

```ts
const updateSlider = (
  key: SliderConfig['key'],
  value: number,
) => {}
```

`SliderConfig['key']` 是索引访问类型，意思是取得 `SliderConfig` 中 `key` 属性的类型。

### 3. 数据驱动的滑块

```ts
const SLIDERS: SliderConfig[] = [
  {
    key: 'exposure',
    label: '曝光',
    min: -0.8,
    max: 1,
    step: 0.01,
    format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`,
  },
]
```

项目没有手写十五遍滑块 JSX，而是用数组描述滑块，后面统一通过 `map()` 渲染。

```ts
v > 0 ? '+' : ''
```

是三元表达式。

```ts
`${...}`
```

是模板字符串。

```ts
v.toFixed(2)
```

保留两位小数，返回字符串。

## 六、React 状态

主组件定义了这些状态：

| 状态 | 用途 |
|---|---|
| `image` | 当前图片 |
| `settings` | 全部滤镜参数 |
| `activePreset` | 当前高亮预设 |
| `showOriginal` | 是否显示原图 |
| `isDragging` | 是否正在拖拽文件 |
| `format` | JPG 或 PNG |
| `quality` | JPG 质量 |
| `isLoadingFile` | 图片读取状态 |
| `isExporting` | 导出状态 |
| `notice` | 成功或提示消息 |
| `error` | 错误消息 |

典型写法：

```ts
const [image, setImage] = useState<LoadedImage | null>(null)
```

- `image`：读取状态。
- `setImage`：更新状态。
- `<LoadedImage | null>`：状态类型。
- `null`：初始值。

更新状态会让组件重新执行，并生成新的 JSX。

### 为什么不能直接修改状态

项目使用：

```ts
setSettings((current) => ({
  ...current,
  [key]: value,
}))
```

没有写：

```ts
settings[key] = value
```

React 状态应该视为不可变数据。创建新对象后，React 才能可靠地发现变化。

`[key]` 是计算属性：

```ts
const key = 'exposure'

{
  [key]: 0.5
}
```

得到：

```ts
{
  exposure: 0.5
}
```

函数式更新：

```ts
setSettings((current) => ...)
```

可以保证使用最新状态，避免异步更新导致旧值问题。

## 七、`useRef` 的用途

```ts
const fileInputRef = useRef<HTMLInputElement>(null)
const loadedRef = useRef<LoadedImage | null>(null)
const loadRequestRef = useRef(0)
```

`useRef` 返回：

```ts
{
  current: ...
}
```

修改 `.current` 不会触发组件重新渲染。

三个 ref 分别用于：

### `fileInputRef`

保存隐藏的文件输入框 DOM：

```ts
fileInputRef.current?.click()
```

`?.` 是可选链。只有 `current` 存在时才调用 `click()`。

### `loadedRef`

保存最新图片，方便组件卸载时释放 Object URL。

因为空依赖的 `useEffect` 会捕获创建时的数据，ref 可以让清理函数始终读取最新值。

### `loadRequestRef`

作为请求序号：

```ts
const requestId = ++loadRequestRef.current
```

每次选择图片都增加序号。异步解码结束后检查：

```ts
if (requestId !== loadRequestRef.current) return
```

如果用户快速选择了第二张图片，第一张图片的旧解码结果就不会覆盖新图片。这是一种轻量级的竞态保护。

## 八、`useEffect` 生命周期

### 同步 `image` 和 ref

```ts
useEffect(() => {
  loadedRef.current = image
}, [image])
```

依赖数组 `[image]` 表示只有 `image` 变化时执行。

### 组件卸载清理

```ts
useEffect(() => {
  return () => {
    loadRequestRef.current += 1
    if (loadedRef.current) {
      URL.revokeObjectURL(loadedRef.current.objectUrl)
    }
  }
}, [])
```

空数组 `[]` 表示挂载时执行一次。

返回的函数是 cleanup，在组件卸载时执行。

### 自动关闭提示

```ts
useEffect(() => {
  if (!notice) return

  const timeout = window.setTimeout(
    () => setNotice(null),
    2600,
  )

  return () => window.clearTimeout(timeout)
}, [notice])
```

当 `notice` 改变时：

1. 创建定时器。
2. 2.6 秒后清除提示。
3. 如果提示提前改变，React 先执行旧定时器的 cleanup。

## 九、图片上传和 HEIC 处理

### 判断文件类型

```ts
const IMAGE_FILE_EXTENSION =
  /\.(?:avif|gif|heic|heif|jpe?g|png|svg|webp)$/i
```

这是正则表达式：

- `\.`：匹配点号。
- `(?:...)`：不捕获分组。
- `jpe?g`：匹配 `jpg` 或 `jpeg`。
- `$`：必须出现在文件名结尾。
- `i`：不区分大小写。

项目同时检查 MIME：

```ts
file.type.startsWith('image/')
```

这样可以处理某些 MIME 不正确但扩展名正确的手机文件。

### Object URL

```ts
const objectUrl = URL.createObjectURL(blob)
```

它为内存中的 `Blob` 创建临时 URL，例如：

```text
blob:http://localhost/...
```

可以放进：

```tsx
<img src={image.objectUrl} />
```

使用完必须释放：

```ts
URL.revokeObjectURL(objectUrl)
```

否则可能造成内存泄漏。

### 将图片加载包装成 Promise

```ts
await new Promise<void>((resolve, reject) => {
  element.onload = () => resolve()
  element.onerror = () => reject(new Error('image decode failed'))
  element.src = objectUrl
})
```

`Image` 原本使用回调事件。这里把回调包装成 Promise，从而可以使用 `await`。

### HEIC 动态导入

```ts
const { heicTo, isHeic } = await import('heic-to')
```

这是动态 `import()`。

只有原生 HEIC 解码失败时，浏览器才下载 HEIC 转换模块，可以减少首次加载体积。

流程是：

```text
先尝试浏览器原生解码
        │
        ├─ 成功 → 直接使用
        │
        └─ 失败且为 HEIC
                  │
                  ▼
             heic-to 转 JPEG
                  │
                  ▼
             再次解码 JPEG
```

### `Awaited`、`ReturnType` 和 `typeof`

```ts
let decoded: Awaited<ReturnType<typeof decodeImageBlob>>
```

从内向外理解：

```ts
typeof decodeImageBlob
```

取得函数的类型。

```ts
ReturnType<...>
```

取得函数返回类型，即 `Promise<某个对象>`。

```ts
Awaited<...>
```

取得 Promise 成功后的结果类型。

因此不用重复手写：

```ts
{
  element: HTMLImageElement
  objectUrl: string
}
```

## 十、拖拽事件

```ts
const onDrop = (event: DragEvent<HTMLDivElement>) => {
  event.preventDefault()
  setIsDragging(false)

  const file = event.dataTransfer.files[0]
  if (file) void loadFile(file)
}
```

`DragEvent<HTMLDivElement>` 表示这是发生在 `div` 上的 React 拖拽事件。

```ts
event.preventDefault()
```

阻止浏览器直接打开拖入的图片。

```ts
void loadFile(file)
```

`loadFile()` 返回 Promise，但事件回调不需要等待它。`void` 明确表示忽略 Promise 返回值。

拖离逻辑：

```ts
if (event.currentTarget === event.target) {
  setIsDragging(false)
}
```

- `currentTarget`：绑定事件的 `<main>`。
- `target`：真正触发事件的内部元素。

这样可以避免鼠标在子元素之间移动时频繁取消拖拽状态。

## 十一、JSX 语法

### 条件渲染：三元表达式

```tsx
{image ? (
  <div className="file-card">...</div>
) : (
  <button className="upload-card">...</button>
)}
```

有图片显示文件卡片，否则显示上传按钮。

### 条件渲染：逻辑与

```tsx
{image && <div>图片信息</div>}
```

只有 `image` 为真时才渲染。

### 列表渲染

```tsx
{PRESETS.map((preset, index) => (
  <button key={preset.id}>
    {preset.name}
  </button>
))}
```

`map()` 将数据数组转换为 JSX 数组。

`key` 帮助 React 判断哪个列表元素发生了变化。应使用稳定唯一的 `preset.id`，不能随意使用随机值。

### Fragment

```tsx
<>
  <div>左边标签</div>
  <div>右边标签</div>
</>
```

Fragment 可以返回多个相邻元素，但不会产生额外 DOM。

### 动态 class

```tsx
className={`preset-card ${
  activePreset === preset.id ? 'is-active' : ''
}`}
```

JSX 使用 `className`，不是 HTML 的 `class`。

### Props

```tsx
<PreviewStage
  image={image}
  settings={settings}
  showOriginal={showOriginal}
  isDragging={isDragging}
  onChooseFile={chooseFile}
/>
```

这些值会作为 props 传给子组件。

### 受控输入框

```tsx
<input
  type="range"
  value={value}
  onChange={(event) =>
    updateSlider(slider.key, Number(event.target.value))
  }
/>
```

DOM 显示的值完全由 React 状态控制，因此称为受控组件。

即使 `type="range"` 表示数字，`event.target.value` 仍然是字符串，所以需要：

```ts
Number(event.target.value)
```

### 自定义 CSS 变量

```tsx
style={{
  '--progress': `${progress}%`,
} as CSSProperties}
```

CSS 中读取：

```css
background:
  linear-gradient(
    90deg,
    var(--accent) var(--progress),
    #332b35 var(--progress)
  );
```

TypeScript 的 `CSSProperties` 默认不知道 `--progress` 这种自定义属性，所以进行了类型断言。

## 十二、预览组件

源码：[src/components/PreviewStage.tsx](./need-for-speed-filter/src/components/PreviewStage.tsx)

### Props 接口

```ts
interface PreviewStageProps {
  image: LoadedImage | null
  settings: FilterSettings
  showOriginal: boolean
  isDragging: boolean
  onChooseFile: () => void
}
```

组件使用参数解构：

```ts
export function PreviewStage({
  image,
  settings,
  showOriginal,
  isDragging,
  onChooseFile,
}: PreviewStageProps) {}
```

相当于：

```ts
function PreviewStage(props: PreviewStageProps) {
  const image = props.image
}
```

### 三个 Canvas/显示对象

组件内部实际上有三层：

1. `previewCanvasRef`：隐藏的源 Canvas，滤镜算法画在这里。
2. PixiJS Canvas：WebGL 模式下显示源 Canvas。
3. `fallbackRef`：WebGL 失败时的普通 Canvas。

### 初始化 PixiJS

```ts
const app = new Application()

await app.init({
  antialias: true,
  backgroundAlpha: 0,
  preference: 'webgl',
  autoDensity: true,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
})
```

- `preference: 'webgl'`：优先 WebGL。
- `backgroundAlpha: 0`：透明背景。
- `resolution`：使用设备像素比，但最多为 2，防止高清屏消耗过大。
- `autoDensity`：自动处理 CSS 尺寸和实际像素尺寸。

### 把 Canvas 作为纹理

```ts
const texture = Texture.from(sourceCanvas)
texture.dynamic = true
const sprite = new Sprite(texture)
```

PixiJS 将处理后的 Canvas 当成纹理。

```ts
sprite.anchor.set(0.5)
```

把精灵锚点放在中心，方便居中。

### 同步纹理

每次滤镜重新绘制 Canvas 后：

```ts
texture.source.update()
texture.update()
```

告诉 PixiJS：纹理内容发生了改变，请上传到 GPU。

### 响应式缩放

```ts
const scale = Math.min(
  availableWidth / imageWidth,
  availableHeight / imageHeight,
)
```

取宽度缩放比和高度缩放比中更小的一个，相当于 CSS 的 `object-fit: contain`，确保图片完整显示。

`ResizeObserver` 用来监控预览容器尺寸：

```ts
observer = new ResizeObserver(resize)
observer.observe(host)
```

### WebGL 回退

```ts
try {
  await app.init(...)
} catch {
  setRenderer('Canvas 2D')
}
```

如果 WebGL 初始化失败，状态切换为 Canvas 2D。

### 图片变化时重新渲染

```ts
useEffect(() => {
  // renderImage(...)
}, [image, renderer, settings, showOriginal])
```

只要图片、滤镜参数、原图模式或渲染器发生变化，就重新处理。

```ts
const frame = requestAnimationFrame(() => {
  renderImage(...)
})
```

`requestAnimationFrame` 将处理安排到浏览器下一帧。

cleanup：

```ts
return () => cancelAnimationFrame(frame)
```

快速拖动滑块时，尚未执行的旧帧可以被取消。

不过一旦 `renderImage()` 已经开始执行，它是同步 CPU 运算，无法中途取消。

## 十三、图片处理算法

源码：[src/lib/imagePipeline.ts](./need-for-speed-filter/src/lib/imagePipeline.ts)

完整顺序是：

```text
原图
 → 居中裁剪
 → 缩放到预览/导出尺寸
 → 降低分辨率
 → 柔焦
 → 逐像素调色
 → 运动拖影
 → 高光溢出
 → 紫红叠色
 → 褪色叠层
 → 暗角
 → 颗粒
 → 输出 Canvas
```

### 1. 限制数值

```ts
const clamp = (
  value: number,
  min = 0,
  max = 255,
) => Math.min(max, Math.max(min, value))
```

RGB 合法范围是 `0–255`。

默认参数意味着：

```ts
clamp(300)       // 255
clamp(-10)       // 0
clamp(10, 0, 20) // 10
```

### 2. 确定性噪点

```ts
const noiseAt = (x, y, seed) => { ... }
```

它根据像素坐标和种子生成 `0–1` 的伪随机数。

使用：

- `Math.imul()`：32 位整数乘法。
- `^`：按位异或。
- `>>>`：无符号右移。
- `>>> 0`：将结果转换为无符号 32 位整数。

相同的 `(x, y, seed)` 永远产生相同结果，所以滑块变化时噪点不会随机闪烁。

### 3. 裁剪

```ts
const aspectForCrop = (...) => {
  if (crop === 'square') return 1
  if (crop === 'portrait') return 4 / 5
  return sourceWidth / sourceHeight
}
```

`getCropRect()` 比较原图比例和目标比例：

- 原图太宽：左右裁剪。
- 原图太高：上下裁剪。
- 始终居中裁剪。

### 4. 输出尺寸

```ts
if (aspect >= 1) {
  return {
    width: maxEdge,
    height: Math.round(maxEdge / aspect),
  }
}

return {
  width: Math.round(maxEdge * aspect),
  height: maxEdge,
}
```

横图最长边是宽，竖图最长边是高。

### 5. 降低分辨率

做法不是单纯模糊，而是：

1. 缩小到低分辨率 Canvas。
2. 再放大到原目标尺寸。

```ts
reducedContext.drawImage(
  canvas,
  0,
  0,
  reducedWidth,
  reducedHeight,
)

context.drawImage(
  reduced,
  0,
  0,
  canvas.width,
  canvas.height,
)
```

这样会制造早期数码相机的低清晰度感。

### 6. 逐像素读取

```ts
const image = context.getImageData(
  0,
  0,
  canvas.width,
  canvas.height,
)

const data = image.data
```

`data` 是 RGBA 一维数组：

```text
[R, G, B, A, R, G, B, A, ...]
```

某像素位置：

```ts
const index = (y * width + x) * 4
```

然后：

```ts
data[index]     // R
data[index + 1] // G
data[index + 2] // B
data[index + 3] // A
```

### 7. 曝光

```ts
const exposure = 2 ** settings.exposure
```

这是摄影中的档位关系：

- `exposure = 1` → 亮度乘 2。
- `exposure = 0` → 亮度不变。
- `exposure = -1` → 亮度乘 0.5。

### 8. 对比度

```ts
red = (red - 127.5) * contrast + 127.5
```

以中灰色 `127.5` 为中心：

- 大于中灰的像素更亮。
- 小于中灰的像素更暗。

### 9. 饱和度

先计算亮度：

```ts
const luminance =
  red * 0.299 +
  green * 0.587 +
  blue * 0.114
```

这些权重来自人眼对绿色、红色、蓝色敏感度差异。

然后让颜色在灰度和原色之间插值：

```ts
red =
  luminance * 255 +
  (red - luminance * 255) * saturation
```

### 10. 色温

```ts
red += temperature * 31
green += temperature * 5
blue -= temperature * 28
```

正色温：

- 增加红色。
- 少量增加绿色。
- 减少蓝色。

所以画面变暖。

### 11. 紫红偏色和褪色

紫红偏色更偏向阴影：

```ts
const shadowWeight =
  0.28 + (1 - luminance) * 0.72
```

像素越暗，权重越高。

褪色也是主要抬升阴影：

```ts
const fadeLift =
  fade * (1 - luminance) * 42
```

因此黑色不会保持纯黑，会出现旧印刷品的灰紫感。

### 12. 色差

```ts
const redIndex = x + channelShift
const blueIndex = x - channelShift
```

红色从右边像素取值，蓝色从左边像素取值，绿色保持原位置，从而制造 RGB 边缘错位。

### 13. 噪点

项目组合了：

- 每像素细噪声。
- 块状粗噪声。
- 行噪声。
- 红蓝彩色噪声。
- 阴影噪声增强。
- 色阶量化。

```ts
red = Math.round(red / quantizationStep)
  * quantizationStep
```

量化会减少颜色级数，产生低位深、早期传感器的感觉。

### 14. 运动拖影

```ts
for (let copy = 4; copy >= 1; copy -= 1) {
  context.drawImage(base, offset, 0)
  context.drawImage(base, -offset, 0)
}
```

向左右绘制多份低透明度图片，再覆盖清晰主体。

### 15. Bloom

```ts
context.globalCompositeOperation = 'screen'
context.filter = `blur(...) brightness(1.12)`
context.drawImage(base, 0, 0)
```

`screen` 是滤色混合模式，只会让画面变亮。模糊后的亮部覆盖原图，就形成高光溢出。

### 16. Canvas 状态保护

```ts
context.save()
// 修改透明度、混合模式、filter
context.restore()
```

`save()` 保存当前绘图状态，`restore()` 恢复，避免一个效果污染后续效果。

### 17. 暗角

```ts
const vignette =
  context.createRadialGradient(...)
```

中心透明，边缘逐渐变为深紫黑色。

### 18. 导出

```ts
exportCanvas.toBlob(callback, mimeType, quality)
```

`toBlob()` 使用回调，所以再次包装为 Promise：

```ts
const blob = await new Promise<Blob>(
  (resolve, reject) => {
    exportCanvas.toBlob((result) => {
      result
        ? resolve(result)
        : reject(new Error(...))
    })
  },
)
```

JPEG 不支持透明通道，因此先铺背景：

```ts
context.fillStyle = '#eee4ea'
context.fillRect(...)
context.drawImage(styled, 0, 0)
```

PNG 保留透明能力。

## 十四、下载过程

```ts
const result = await exportImage(...)
const url = URL.createObjectURL(result.blob)

const anchor = document.createElement('a')
anchor.href = url
anchor.download = '文件名.jpg'
anchor.click()
```

这里动态创建 `<a>`，利用浏览器下载能力。

文件名处理：

```ts
const fileStem = (name: string) =>
  name.replace(/\.[^.]+$/, '') || 'image'
```

删除最后一个扩展名：

```text
photo.jpeg → photo
my.photo.png → my.photo
```

```ts
format === 'jpeg' ? 'jpg' : 'png'
```

内部格式名为 `jpeg`，下载扩展名使用更常见的 `jpg`。

## 十五、CSS 结构

源码：[src/styles.css](./need-for-speed-filter/src/styles.css)

### CSS 变量

```css
:root {
  --bg: #0a080c;
  --panel: #100d13;
  --accent: #eb6db2;
}
```

后面通过：

```css
background: var(--bg);
```

统一使用主题颜色。

### 桌面布局

```css
.workspace {
  display: grid;
  grid-template-columns:
    276px
    minmax(360px, 1fr)
    300px;
}
```

三列分别是：

```text
左侧预设 276px | 中间预览自适应 | 右侧参数 300px
```

`minmax(360px, 1fr)` 表示中间至少 360px，并占据剩余空间。

### `minmax(0, 1fr)`

文件卡片和预设中经常出现：

```css
grid-template-columns: 48px minmax(0, 1fr) 26px;
```

中间列允许缩小到 0，这样：

```css
text-overflow: ellipsis;
```

才能正常显示省略号。

### 状态类

```css
.preset-card.is-active { ... }
.preview-stage.is-dragging { ... }
.toast.is-error { ... }
```

React 根据状态添加 `is-active`、`is-dragging`、`is-error`，CSS 负责视觉变化。

### 伪元素

```css
.preview-stage::before
.stage-grid::before
.stage-grid::after
```

这些元素不在 JSX 中，由 CSS 创建，用来绘制背景网格、中心线和装饰光泽。

### 响应式

```css
@media (max-width: 820px)
```

移动端将三列布局变成纵向布局：

```css
.workspace {
  display: flex;
  flex-direction: column;
}
```

视觉顺序：

```text
预览区
源图片与预设
效果参数
```

### 减少动画

```css
@media (prefers-reduced-motion: reduce)
```

当用户系统设置为“减少动态效果”时，项目会缩短动画和过渡时间，这是无障碍设计。

## 十六、构建配置

### `package.json`

源码：[package.json](./need-for-speed-filter/package.json)

主要依赖：

- `react`：组件和状态。
- `react-dom`：把 React 渲染到浏览器。
- `pixi.js`：WebGL 预览。
- `heic-to`：HEIC 转换。
- `lucide-react`：图标组件。

命令：

```json
"dev": "vite"
```

启动开发服务器。

```json
"build": "tsc --noEmit && vite build"
```

先运行 TypeScript 类型检查，再由 Vite 构建。

```json
"preview": "vite preview --host 0.0.0.0"
```

预览 `dist` 构建产物。

`"private": true` 防止误发布到 npm。

`"type": "module"` 表示 Node/Vite 配置使用 ES Module。

### `vite.config.ts`

源码：[vite.config.ts](./need-for-speed-filter/vite.config.ts)

```ts
export default defineConfig({
  plugins: [react()],
  base: './',
})
```

`react()` 提供 JSX 转换和开发热更新。

`base: './'` 让构建后的资源使用相对路径，适合 GitHub Pages、自定义静态目录和直接部署 `dist`。

### `tsconfig.json`

源码：[tsconfig.json](./need-for-speed-filter/tsconfig.json)

重要配置：

- `strict: true`：开启严格类型检查。
- `target: ES2022`：输出面向现代浏览器。
- `lib: ["ES2022", "DOM"]`：允许使用现代 JS 和浏览器 DOM 类型。
- `module: "ESNext"`：保留现代模块语法给 Vite。
- `moduleResolution: "Bundler"`：按照现代打包工具规则寻找模块。
- `noEmit: true`：TypeScript 只检查类型，不生成文件。
- `isolatedModules: true`：保证每个文件可以独立转换。
- `jsx: "react-jsx"`：启用新版 JSX 转换。

## 十七、Docker 和部署目录

### Docker

[Dockerfile](./need-for-speed-filter/Dockerfile) 使用 Alpine Linux，安装 Node 和 npm，然后运行 Vite。

[compose.yaml](./need-for-speed-filter/compose.yaml)：

```yaml
ports:
  - "4173:5173"
```

表示：

```text
电脑的 4173 端口 → 容器的 5173 端口
```

```yaml
volumes:
  - .:/app
  - node_modules:/app/node_modules
```

源码目录挂载到容器中，实现热更新；依赖使用独立命名卷，避免被宿主机目录覆盖。

### `public/`

`public/CNAME` 会被 Vite 原样复制到 `dist/CNAME`，供 GitHub Pages 配置自定义域名。

### `dist/`

`dist` 是构建结果，不应该作为学习 React 的主要源码。

其中：

- `dist/index.html`：生产入口。
- `dist/assets/index-*.js`：压缩打包后的 React 和业务代码。
- `dist/assets/index-*.css`：压缩后的 CSS。
- 其他 JS 文件：PixiJS、HEIC 等拆分模块。

## 十八、这个项目最值得学习的 React 思想

1. 状态驱动界面：不手动修改 DOM，而是更新 `image`、`settings` 等状态。

2. 数据驱动表单：用 `SLIDERS.map()` 从配置生成控件。

3. 父子组件分工：`App` 管状态，`PreviewStage` 管预览。

4. 副作用集中在 `useEffect`：定时器、Pixi 初始化、Canvas 渲染和资源清理都属于副作用。

5. ref 和 state 用途不同：state 用于影响界面；ref 用于保存 DOM、外部对象和异步序号。

6. 不可变更新：使用对象展开创建新的设置对象。

7. 资源需要清理：Object URL、定时器、动画帧、ResizeObserver、Pixi Application 都有 cleanup。

8. React 并没有处理像素：滤镜算法是普通 TypeScript + Canvas；React 只是组织它们。

最后一个容易误解的地方：项目虽然使用 PixiJS/WebGL，但当前滤镜算法仍然运行在 CPU 的 Canvas 2D 上。WebGL 主要负责预览显示，并没有用 shader 加速逐像素调色。拖动滑块时真正昂贵的是 `getImageData()` 和两层像素循环。
