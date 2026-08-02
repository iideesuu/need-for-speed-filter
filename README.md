# NFS Lab

一个完全在浏览器本地运行的 Y2K / lo-fi 数码相机风格图片滤镜。当前项目使用 Vite、React、TypeScript、PixiJS 和 Canvas 2D。

## 仅使用 Docker 启动

宿主机不需要安装 Node.js 或 npm：

```bash
docker compose up --build
```

打开 <http://localhost:4173>。开发服务器运行在容器内，源码通过 bind mount 热更新；当前流程不会生成 `dist/`。

停止容器：

```bash
docker compose down
```

## 隐私

上传的文件只会被浏览器的 `File`、Object URL、Canvas 和 PixiJS 使用，不会发送到服务器。导出也在浏览器内完成。
