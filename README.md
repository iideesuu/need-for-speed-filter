# NFS Lab

NFS Lab 是一个完全在浏览器本地运行的 Y2K / 富士胶片数码影像滤镜工具，视觉方向来自早期消费级数码相机、夜间闪光、高速公路灯光、褪色印刷，以及经典胶片模拟的色彩与颗粒。

在线体验：<https://lab.deesuu.com/>

照片不会上传到服务器。读取、HEIC / HEIF 兼容转换、滤镜处理和导出均在当前浏览器中完成。

> 本项目是非官方视觉实验，与任何同名作品、艺人或品牌不存在隶属或授权关系。

## Features

- 16 个内置风格预设，分为 Y2K 风格与富士胶片两组；Y2K 组包含 4 个原版高清滤镜及对应的 4 个低分辨率噪点版本。
- 富士胶片组包含 PROVIA、Velvia、ASTIA、Classic Chrome、Classic Neg、Nostalgic Neg.、ETERNA 和 ACROS 八种常见模拟风格。
- 风格覆盖紫调速度封面、黄昏高架、硬闪抓拍、褪色印刷、经典胶片色彩、电影低反差和黑白颗粒。
- 支持点击或拖拽上传，并可在效果图与原图之间快速切换。
- 支持 `1:1`、`4:5` 和原始比例三种画幅。
- 提供曝光、反差、饱和度、色温、紫红偏色、高光溢出、运动拖影、低清晰度、亮度噪点、噪点粗糙度、彩色噪声、褪色、柔焦、暗角和色差调节。
- 输出最长边可在 640–3200 px 之间调整，右上角会实时显示预计导出尺寸。
- 支持 JPG 与 PNG 导出；JPG 可调整 65%–100% 输出质量。
- 支持浏览器可识别的常见图片格式，并在 HEIC / HEIF 原生解码失败时尝试浏览器内转换。
- 使用 PixiJS / WebGL 显示实时预览，WebGL 不可用时自动回退到 Canvas 2D。
- 响应式桌面与手机界面；手机浏览器可以直接从系统相册选择照片。
- 无后端、无数据库，图片只保存在当前页面的设备内存中。

## 技术栈

- React 19
- TypeScript 5.7
- Vite 6
- PixiJS 8 / WebGL
- Canvas 2D 像素处理管线
- `heic-to` 浏览器端 HEIC / HEIF 解码
- Docker Compose

## 本地运行

项目使用 Docker 完成依赖安装和开发运行，宿主机不需要安装 Node.js 或 npm。

```bash
docker compose up --build
```

电脑浏览器打开：

```text
http://localhost:4173
```

源码通过 bind mount 热更新，容器中的开发服务器不会生成静态 `dist/`。

停止服务：

```bash
docker compose down
```

### 手机局域网访问

手机与电脑连接同一 Wi-Fi 后，在手机浏览器打开：

```text
http://电脑的局域网 IP:4173
```

macOS 防火墙、VPN 或路由器的访客网络隔离可能阻止局域网访问。

## 构建静态文件

只使用 Docker 执行正式构建：

```bash
docker compose run --rm --no-deps web npm run build
```

构建产物位于：

```text
dist/
```

其中 `dist/index.html` 是静态站点入口，部署时需要同时保留完整的 `dist/assets/` 目录。

## GitHub Pages 部署

本项目在 `main` 分支追踪 `dist/`，并将该目录作为独立 subtree 发布到 `gh-pages`：

```bash
git add dist
git commit -m "build: 更新静态文件"
git push origin main
git subtree push --prefix dist origin gh-pages
```

自定义域名由 `public/CNAME` 管理，Vite 构建时会自动复制为 `dist/CNAME`。当前域名为 <https://lab.deesuu.com/>。

## 隐私与兼容性

- 文件通过浏览器的 `File`、Object URL、Canvas 和 PixiJS 读取，不会发送到服务器。
- 导出的 JPG / PNG 也在浏览器本地生成。
- 清除图片、关闭或刷新页面后，应用不会持久保存照片。
- HEIC / HEIF 转换需要较多内存；超高像素 iPhone 照片可能受移动浏览器的内存或 Canvas 尺寸限制，可先在相册中另存为 JPEG。
- 动图、SVG、AVIF 等格式的实际解码能力取决于当前浏览器。

## 计划功能 / Roadmap

- 加入更多 Y2K 风格滤镜，例如 CCD 夜景、直闪派对、VHS 色偏、早期手机摄像头、霓虹加油站、杂志扫描和金属闪光质感。
- 支持保存、复制、导入和导出自定义预设。
- 增加批量图片处理、历史记录和前后效果对比工具。
- 优化高像素图片、HEIC 解码和移动端内存占用，并评估 Web Worker、OffscreenCanvas 与 GPU shader 管线。
- 增加 PWA 离线安装、多语言和更完整的无障碍支持。
- 评估使用 Flutter 重构独立应用（application），面向 iOS、Android、macOS 和 Windows 发布，并尽量复用现有滤镜参数与视觉规范。

## License

本项目基于 [MIT License](./LICENSE) 开源。
