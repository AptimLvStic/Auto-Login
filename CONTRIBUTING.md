# 贡献指南

## 开始之前

```powershell
npm ci
npm run lint
npm test
npm run build
```

请基于 `main` 创建小而聚焦的分支和 Pull Request；不要提交 `node_modules`、本地数据库、登录结果、截图、真实凭据或生成的安装包。

## 提交建议

建议使用 Conventional Commits 风格，例如：

```text
feat: add bulk group move feedback
fix: reject unsupported external URL schemes
docs: document local data protection
```

## Pull Request 要求

- 说明问题、方案、测试结果与潜在回滚方式；
- 涉及 UI 时附上脱敏截图；
- 涉及数据结构时说明兼容性与备份方案；
- 新功能或缺陷修复应提供相应自动化测试。
