# Windows 构建指南

## 环境要求

- Windows 10/11 x64
- Node.js 22 LTS（项目要求 `>=22 <23`）
- 可访问 Electron 与 electron-builder 的二进制下载资源

确认版本：

```powershell
node -v
```

输出必须是 `v22.x`。不要使用 Node 26 进行发布构建。

## 目录版构建

```powershell
cd D:\Desktop\Product\web
npm ci
npm run lint
npm test
npm run pack:win:dir
```

成功后，目录版程序位于 `release\win-unpacked\`。

## 网络受限环境

若 electron-builder 无法访问 GitHub 二进制资源，可在当前 PowerShell 会话中设置镜像后再执行构建：

```powershell
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run pack:win:dir
```

若仍出现 `ETIMEDOUT` 或 `ECONNRESET`，请切换到可访问外部构建资源的网络，或使用 GitHub Actions 的 `windows-latest` Runner 构建。此类错误表示下载链路失败，不代表应用代码或前端构建失败。

## 发布构建

```powershell
npm run pack:win
```

该命令生成目录版、NSIS 安装包和便携版。安装包默认不签名；公开发布前应配置受信任的 Windows 代码签名流程。
