# Asset Browser (资产浏览器)

本项目是一个用于本地文件夹资产浏览和管理的 React 单页应用，并提供 Electron 桌面封装。当本地文件夹的根目录包含 `asset-browser-index` JSON、CSV 或 Excel 索引时，本应用利用浏览器的 File System Access API 或 Electron preload 注入的本地文件系统桥接能力来读取文件夹、解析并预览其中的媒体资源，并写回包含元数据和交互状态的 JSON 文件。

## 项目概述

- 项目名称：Asset Browser (资产浏览器)
- 一句话简介：基于索引的本地多媒体资产浏览器与管理器。
- 解决的问题：在不上传云端的情况下，极速预览、打标签、分集管理本地存储的海量多媒体资产（图片、音视频、3D模型、文档）。
- 目标用户：独立游戏开发者、美术设计师、音效创作者以及需要整理大量本地素材的创作者。
- 当前状态：已使用 npm workspaces 进行单体大仓管理。Web 前端应用代码及相关配置存放在 `ts/`，桌面封装存放在 `electron/`，脚本文件存放在 `node/`。由于启用了 workspaces，开发、构建、校验和桌面打包命令**直接在根目录执行即可**。

## 当前能力

- **多模态媒体预览**：支持图片 (png, jpg, webp, svg)、音频 (mp3, wav, flac)、视频 (mp4, webm)、3D 模型 (glb, gltf, obj, stl) 及常见文档格式 (pdf, txt, md, json)。
- **深度交互式音频**：包含行内波形播放器，支持 Hover 自动预览，以及在波形图上通过滑过（hover）进行快速跳转寻轨播放。
- **自定义属性管理**：支持给资产打标签（Tags）、添加评分（Rating）、归纳集合（Collections），无需修改原始资源文件。
- **元数据物理隔离**：所有用户交互状态（评分、标签、集合）均存储在对应文件夹根目录下的 `asset-browser-metadata.json` 中，不同目录之间状态天然隔离。
- **自动索引转换**：在打开文件夹时，自动检测 CSV/XLSX 与 JSON 索引的更新情况。如果 CSV/XLSX 较新或 JSON 缺失，则自动解析并生成全新的 JSON 索引文件。
- **Electron 桌面封装**：提供 Electron 主进程、preload 文件系统桥接和 electron-builder 打包配置；桌面端加载同一份 `ts/dist` Web 构建产物。

## 快速开始

在根目录下直接执行命令（无需 `cd ts`）：

### 依赖安装
```bash
npm install
```

### 本地开发
```bash
npm run dev
```

### 代码打包
```bash
npm run build
```

该命令会先执行 Web 构建，再执行 Electron directory pack，生成可运行的桌面应用目录。

### 仅构建 Web
```bash
npm run build:web
```

### 桌面端开发
```bash
npm run desktop:dev
```

该命令会同时启动 Vite 开发服务器和 Electron 外壳。

### 桌面端安装包
```bash
npm run desktop:dist
```

本地 macOS 未配置有效 Developer ID 证书时，electron-builder 会跳过代码签名；CI 中可通过 GitHub tag `v*` 触发 GitHub Releases 发布。

### 代码检查
```bash
npm run lint
```

打开浏览器访问 `http://127.0.0.1:5173/`。由于 File System Access API 限制，建议使用 Chrome 或 Edge 浏览器。

## 目录结构

```text
.
├── package.json               # 根目录全局 package.json（定义 workspaces 及命令代理）
├── package-lock.json          # 根目录全局 lockfile
├── node_modules/              # 根目录统一依赖库（ts 和 electron 共享）
├── AGENTS.md                  # Agent 协作规范与环境判定准则
├── README.md                  # 项目概述与说明入口
├── REQUIREMENTS.md            # 需求与已完成/规划中的任务追踪
├── DESIGN.md                  # 界面风格与视觉规范（Linear-like 风格）
├── agent-log/                 # 记录 Agent 历次任务执行日志
├── agent-template/            # 项目规范模板与参考文件
├── reference/                 # Linear 风格视觉设计截图参考
├── ts/                        # 网页与前端源码（Vite + TS React 子项目）
│   ├── src/                   # 前端源码（App.tsx, components/ 等）
│   ├── public/                # 静态资源
│   ├── package.json           # 前端项目配置（被 root package.json 代理）
│   ├── vite.config.ts         # Vite 配置
│   └── ...
├── electron/                  # Electron 桌面封装及相关资源（规划中）
└── node/                      # Node.js 脚本与工具目录
    └── generate-asset-browser-index.mjs  # 本地索引自动生成脚本
```

## 文档入口

- Agent 协作规范：`AGENTS.md`
- 需求与验收追踪：`REQUIREMENTS.md`
- 视觉规范：`DESIGN.md`
- 执行日志：`agent-log/`

## 运行与验证

- **开发**：在根目录运行 `npm run dev`，系统会自动将指令路由到 `ts` 工作区，启动开发服务器。
- **Web 编译**：在根目录运行 `npm run build:web`，系统会执行 TypeScript 检查并使用 Vite 进行前端构建，输出放置在 `ts/dist/`。
- **完整构建**：在根目录运行 `npm run build`，系统会执行 Web 构建并自动运行 Electron directory pack，输出放置在 `electron/dist/`。
- **桌面发布包**：在根目录运行 `npm run desktop:dist`，系统会使用 electron-builder 生成平台安装包。
- **规范检查**：在根目录运行 `npm run lint` 验证前端代码风格是否符合 ESLint 规则。
- **CI**：`.github/workflows/deploy-pages.yml` 只构建并发布 Web 版本到 GitHub Pages；`.github/workflows/electron-release.yml` 在推送到 `main` 或手动触发时构建桌面端并上传 Actions artifact，在推送 `v*` tag 时发布到 GitHub Releases。

## 边界与限制

- **浏览器限制**：Web 版本仅支持提供了 File System Access API 的现代浏览器（如 Chrome, Edge）。Safari、Firefox 因缺乏文件夹读写权限暂不支持此工作流；Electron 桌面端通过 preload 桥接提供本地文件系统访问。
- **外部依赖**：gltf 3D模型预览若依赖外部贴图、Buffer 等资产，这些资产必须与 gltf 文件存放在相同的文件夹层级下。
- **无内置服务端**：当前纯 Web 网页版本完全在浏览器沙箱内运行，无法自动静默修改本地文件或绕过浏览器的安全授权弹窗。
