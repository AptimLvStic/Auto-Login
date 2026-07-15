# 变更记录

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的记录方式，并采用语义化版本。

## [Unreleased]

## [0.1.1] - 2026-07-15

### Changed

- 完善本地桌面应用的安全边界、质量门禁与发布流程。
- 升级 Electron 至 43.1.0、electron-builder 至 26.15.3。
- Windows 打包交由 GitHub Actions 发布步骤上传，避免构建阶段重复发布。

### Security

- 依赖审计、密钥扫描和 Windows 构建纳入持续集成。
