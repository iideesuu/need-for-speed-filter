# NFS Lab

一个完全在浏览器本地运行的 Y2K / lo-fi 数码相机风格图片滤镜。当前项目使用 Vite、React、TypeScript、PixiJS 和 Canvas 2D。

## 仅使用 Docker 启动

宿主机不需要安装 Node.js 或 npm：

```bash
docker compose up --build
```

电脑打开 <http://localhost:4173>。开发服务器运行在容器内，源码通过 bind mount 热更新；当前流程不会生成 `dist/`。

手机和电脑连接同一 Wi-Fi 后，可以在手机浏览器打开 `http://电脑的局域网 IP:4173`，直接从系统相册选择图片。输入框接受所有浏览器可识别的图片；浏览器不能原生解码 HEIC / HEIF 时，会尝试在本地转换。超高像素照片仍可能受手机浏览器的内存限制，此时可先在相册中另存为 JPEG。

停止容器：

```bash
docker compose down
```

## 隐私

上传的文件只会被浏览器的 `File`、Object URL、Canvas 和 PixiJS 使用；HEIC / HEIF 兼容转换同样在浏览器内完成，不会发送到服务器。导出也在浏览器内完成。
