# Auto Login 项目对话迁移压缩摘要

## 1. 项目概况

项目名称：Auto Login

项目路径：`C:\Users\15721\Documents\Codex\2026-06-15\web`

项目类型：Windows 桌面应用

技术栈：Electron + React + Vite + SQLite

核心目标：通过一个桌面软件维护多站点账号信息，支持 Excel 导入、站点分组、站点搜索、批量打开、导出列表、手动新增与编辑站点，并调用系统默认浏览器打开登录页。

## 2. 核心功能范围

已实现功能：

- 站点列表展示
- 站点搜索
- 分组筛选
- 分组管理
- 手动新增站点
- 编辑站点
- 删除站点
- Excel 导入
- Excel 字段映射
- 下载 Excel 模板示例
- 导出当前站点列表
- 表格视图
- 卡片视图
- 分页，支持每页 10、20、50、100 条
- 批量打开站点
- 批量移动站点分组
- 本地 SQLite 持久化
- 密码本地加密保存
- 设置页支持页面比例、字体大小、亮暗模式
- 目录版 Windows EXE 打包

## 3. 当前最新界面状态

当前侧边栏状态：

- 侧边栏已去掉“导入 Excel”导航入口。
- 侧边栏已去掉“界面设置”导航入口。
- 侧边栏已去掉“站点列表”导航入口。
- 侧边栏品牌区保留 `Auto Login`。
- 侧边栏品牌区右侧保留设置按钮入口。
- 侧边栏主体为分组树。
- `GROUP TREE` 区域中文标题已改为“站点列表”。
- 分组树中“全部分组”和子分组已做更明显的层级区分。
- 子分组使用缩进和连接线表现层级关系。
- 侧边栏仍保留“分组管理”入口。

当前站点管理页状态：

- 顶部显示 `DIRECTORY / 站点管理`。
- 顶部右侧保留“导入 Excel”和“+ 新增站点”。
- 站点列表内部不再重复显示分组下拉筛选。
- 分组筛选由左侧分组树承担。
- 搜索框保留在站点管理页内部。
- 操作栏包含搜索、视图切换、打开当前分组全部站点、导出列表。
- 表格列顺序为：复选框、站点名称、一键登录、账号、分组、最近使用、操作。
- 操作列使用更多菜单收纳编辑和删除。
- 卡片视图的一键登录按钮为满宽按钮。
- 底部分页右侧显示“每页 xx 条”，并紧挨分页按钮。

当前分组管理页状态：

- 分组管理页已按站点管理页框架优化。
- 顶部显示 `GROUP DIRECTORY / 分组管理`。
- 顶部右侧使用“+”新增分组。
- 页面内支持搜索分组名称或备注。
- 表格列包含分组名称、站点数量、备注、更新时间、操作。
- 分组操作通过更多菜单执行编辑和删除。

当前窗口与响应式状态：

- Windows 吸附到桌面右侧时，不再自动塌成上下结构。
- 应用采用桌面端固定双栏结构。
- 内容区域使用最小宽度和内部横向滚动保证结构不乱。

## 4. 重要源码文件

前端主界面：

`C:\Users\15721\Documents\Codex\2026-06-15\web\src\renderer\App.jsx`

前端样式：

`C:\Users\15721\Documents\Codex\2026-06-15\web\src\renderer\styles.css`

Electron 主进程：

`C:\Users\15721\Documents\Codex\2026-06-15\web\src\main\index.js`

本地数据库：

`C:\Users\15721\Documents\Codex\2026-06-15\web\src\main\database.js`

预加载桥接：

`C:\Users\15721\Documents\Codex\2026-06-15\web\src\preload\index.js`

共享站点工具：

`C:\Users\15721\Documents\Codex\2026-06-15\web\src\shared\site.js`

应用配置：

`C:\Users\15721\Documents\Codex\2026-06-15\web\src\main\app\appConfig.js`

## 5. 当前最新打包产物

最新目录版 EXE：

`C:\Users\15721\Documents\Codex\2026-06-15\web\outputs\Auto-Login-sidebar-tree-fixed\Auto Login.exe`

说明：

- 这是目录版 Windows 程序。
- 不是单文件便携版。
- 依赖 DLL、资源文件和 `resources` 目录允许存在。
- 源码通过 asar 打包隐藏。

## 6. 已验证命令

最近一次已执行并通过：

```powershell
npm test
npm run build
npm run pack:win
```

最近一次 EXE 启动校验结果：

```text
AliveAfter5s=True
```

## 7. 打包命令

在项目根目录执行：

```powershell
npm run pack:win
```

打包输出目录：

```text
release\win-unpacked
```

如需复制为独立输出目录，可将 `release\win-unpacked` 下所有文件复制到 `outputs` 下的新目录。

## 8. 历史关键需求记录

用户提出并已逐步实现的主要需求：

- 软件名称改为 `Auto Login`。
- 软件描述改为更专业的中文说明。
- 不需要单文件便携版 EXE。
- 需要目录版 EXE，允许依赖库 DLL 和配置文件存在。
- 源码尽量隐藏。
- Excel 导入支持字段映射。
- Excel 导入页提供模板示例下载。
- 支持导出当前站点列表。
- 新增站点按钮使用“+”。
- 站点编辑集成到站点列表流程中。
- 支持站点分组。
- 支持分组管理。
- 支持按分组批量打开。
- 一键登录调用本地默认浏览器。
- 打开一个分组内多个站点时使用默认浏览器多标签页。
- 支持分页，每页 10、20、50、100 条。
- 支持设置页面比例、字体大小、亮暗模式。
- 修复设置中页面比例不生效问题。
- 修复手动新增站点前端无错误反馈问题。
- 修复 EXE 白屏问题。
- 修复 Windows 右侧吸附时布局塌陷问题。
- 将分组筛选从全局导航改为站点列表相关能力。
- 将每页选择移动到分页按钮旁边。
- 将分组管理优化成和站点管理一致的框架。

## 9. 迁移到新对话的使用方式

在新对话中粘贴以下指令：

```text
请继续基于 Auto Login 项目开发。

项目路径：
C:\Users\15721\Documents\Codex\2026-06-15\web

请先阅读以下迁移摘要：
C:\Users\15721\Documents\Codex\2026-06-15\web\Auto Login 对话迁移压缩摘要.md

当前最新打包产物：
C:\Users\15721\Documents\Codex\2026-06-15\web\outputs\Auto-Login-sidebar-tree-fixed\Auto Login.exe

重点源码文件：
src\renderer\App.jsx
src\renderer\styles.css
src\main\index.js
src\main\database.js
src\preload\index.js
src\shared\site.js

请基于当前版本继续修改，不要回退已有功能。
```

## 10. 后续开发注意事项

- 不要删除用户已有数据。
- 不要回退当前 UI 结构。
- 不要重新引入侧边栏中的“导入 Excel / 界面设置 / 站点列表”导航。
- 侧边栏当前定位是品牌区、设置入口、站点列表分组树、分组管理入口。
- 站点管理页不要再放重复的分组筛选下拉。
- 分页中的“每页 xx 条”应保持在右侧并靠近分页按钮。
- Windows 右侧吸附时应保持双栏结构，不要在桌面端切换成上下布局。
- 打包时继续使用目录版，不要改成单文件便携版。
- 修改后应执行 `npm test`、`npm run build`，需要交付 EXE 时执行 `npm run pack:win`。
