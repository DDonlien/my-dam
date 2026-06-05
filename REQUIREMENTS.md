# 需求与验收追踪

本文件记录 MyDAM（My Digital Asset Manager）的全部需求和任务状态。

## Phase 1：核心 Web 资产浏览器（已完成）

### 模块一：全局工作台布局
- [x] \[LAY-A-001] 三段式工作台布局 #P1
  - [x] 左侧窄导航栏（Nav Rail）
  - [x] 中间折叠式资源面板（Source Panel）
  - [x] 主工作区（列表与筛选）
  - [x] 右侧预览窗格（Preview Pane）
  - [x] 底部活动日志抽屉（Activity Dock）

### 模块二：左侧导航栏与资源面板
- [x] \[SIDE-A-001] 窄导航栏（Nav Rail）交互 #P1
  - [x] 提供面板展开/折叠控制
  - [x] Assets 页面入口（当前唯一且 active 状态）
- [x] \[SIDE-A-002] 资源面板功能 #P1
  - [x] 预览模式切换：点击预览（Click Preview）/ 悬停预览（Hover Preview）
  - [x] 预览锁定（Lock）：锁定后不自动隐藏预览窗格
  - [x] 重载按钮（Reload）：重新读取当前文件夹并刷新索引和元数据
- [x] \[SIDE-A-003] 文件夹与 Manifest 区 #P1
  - [x] 显示当前打开的根目录名
  - [x] 显示索引清单来源与状态（如使用 json 或由 csv/xlsx 生成）
  - [x] OPEN FOLDER：调用 File System Access API 选择本地文件夹
  - [x] 不支持 API 时展示 Chrome/Edge 浏览器环境提示
- [x] \[SIDE-A-004] 数据统计信息 #P1
  - [x] Assets：索引资产总数
  - [x] Visible：当前筛选条件下可见的资产数
  - [x] Selected：当前选中条目数（支持全选/多选）
  - [x] Missing：索引中存在但本地物理文件缺失的数量
  - [x] Busy 状态：加载/生成/写入时的忙碌动画提示
- [x] \[SIDE-A-005] 集合（Collections）列表 #P1
  - [x] 展示已存在集合并显示条目数（数据源自元数据）
  - [x] 点击集合作为过滤条件进行列表筛选

### 模块三：主工作区（搜索与筛选）
- [x] \[SRC-A-001] 顶部搜索与筛选器（Topbar） #P1
  - [x] 文本框搜索（名称/路径/标签匹配）
  - [x] 筛选行布局：Search + Type + Collection + Rating + Reset 在同一行，下方带分隔线
  - [x] Tag 筛选位于分隔线下方且左对齐
  - [x] 按资产类型（Type）筛选
  - [x] 按评分（Rating）多选筛选
  - [x] 按集合（Collection）多选筛选
  - [x] 按标签（Tag）多选筛选（弹窗选择形式）

### 模块四：资产列表交互
- [x] \[LIST-A-001] 资产列表渲染 #P1
  - [x] 列表表头与带滚动条的资产行区域
  - [x] 行核心字段展示：Name, Type, Rating, Path, Status, Tag, Actions
- [x] \[LIST-A-002] 列表行交互 #P1
  - [x] 单行点击选择，支持 Ctrl/Cmd/Shift 多选和全选
  - [x] 键盘交互：Enter/Space 键激活当前行的预览或首要行为
  - [x] 预览触发逻辑：根据 Click/Hover 模式，自动触发右侧预览
- [x] \[LIST-A-003] 标签（Tags）管理 #P1
  - [x] 行内展示部分标签，超出显示溢出计数
  - [x] 行内提供删除标签交互
  - [x] 输入新增标签交互，自动保存并写入 `asset-browser-metadata.json`
- [x] \[LIST-A-004] 行内音频播放器（仅限音频类资产） #P1
  - [x] 提供播放/暂停控制，行内交互式进度条
  - [x] 进度条支持点击跳转（seek）
  - [x] 在 Hover 模式下，支持随鼠标悬浮位置连续 seek 并自动播放
- [x] \[LIST-A-005] 行内操作（Actions） #P1
  - [x] 重命名资产（同步元数据并写入 `asset-browser-metadata.json`）
  - [x] 下载当前文件
  - [x] 加入集合/收藏（ Favorite / Add to Collection ）
  - [x] 删除资产（删除本地物理文件并同步状态、记录日志）

### 模块五：右侧预览窗格
- [x] \[PREV-A-001] 预览窗格生命周期 #P1
  - [x] 基于预览模式（Click/Hover）、当前选中行、Lock 状态自动控制显隐
  - [x] 空状态展示：提示选择资产，并显示 Recent（最近预览）列表
- [x] \[PREV-A-002] 预览头部与外部打开 #P1
  - [x] 显示资产类型徽标与完整名称
  - [x] 提供 OPEN 外部打开入口
- [x] \[PREV-A-003] 预览舞台渲染 #P1
  - [x] 图片（Image）：显示图片预览
  - [x] 音频（Audio）：音频波形播放器，与行内播放联动
  - [x] 视频（Video）：视频预览及播放控制
  - [x] 3D 模型（3D Model）：渲染 glb/gltf/obj/stl，解析同目录相关贴图等依赖
  - [x] 文档（Document）：PDF、TXT、Markdown、JSON 等文本与富文本预览
  - [x] 未知/错误类型（Unknown/Error）：显示加载失败/不支持的占位与错误提示
- [x] \[PREV-A-004] 资产详细信息面板 #P1
  - [x] 展示资产名称、文件物理相对路径、分辨率（图片/视频）、文件格式与扩展名等

### 模块六：底部活动日志抽屉
- [x] \[LOG-A-001] 活动日志抽屉（Activity Dock） #P1
  - [x] 抽屉头部标题与折叠/展开按钮
  - [x] 按级别（Info, Warning, Error）列表展示操作记录与错误信息
  - [x] 无日志时的 Ready 状态展示

---

## Phase 2：Electron 桌面端打包与 CI 自动化（规划中）

### 模块一：Electron 桌面端封装
- [x] \[ELEC-A-001] 打包成 Electron 桌面端应用 #P2
  - [x] 搭建 Electron 基础运行环境与入口脚本，使应用能以桌面客户端运行
  - [x] 确保桌面端能良好加载 React/Vite 编译生成的 `dist` 静态资源
- [x] \[ELEC-A-002] 确保纯 TS Web 版本的核心逻辑开发规范 #P2
  - [x] 确保后续的日常功能迭代、UI 修改均只需直接修改 Web 版本的 TS 源码（`src/` 目录下常规代码）
  - [x] Electron 仅作为外壳封装，不侵入常规 Web 开发；Web 代码通过构建自动同步至 Electron 中运行
- [x] \[ELEC-A-003] Electron 专属特性的自动适配与优化（如文件系统访问） #P2
  - [x] 当应用在 Electron 环境下运行时，自动替代/增强 Web 端的 File System Access API 限制（例如无需每次重新授权、直接对物理路径进行无障碍读写）
  - [x] 在 Electron 进程中通过 preload 注入 native APIs，让前端能无缝使用，而在标准 Web 浏览器中仍平滑退回到原 File System Access API 流程
  - [x] \[ELEC-A-003.1] 修复 Electron 文件对象路径映射，不写入只读 `File.path` 属性
  - [x] \[ELEC-A-003.2] Electron 桌面窗口使用沉浸式标题栏，隐藏系统默认黑色 header，并保留可拖拽顶部安全区

### 模块二：自动化编译与推送（CI/CD）
- [x] \[ELEC-B-001] 执行 TS 编译时自动运行 Electron 打包 #P2
  - [x] 配置 npm 脚本，使构建流程（例如执行 `npm run build` 或 TypeScript 编译）自动触发 Electron 打包生成桌面二进制包
- [x] \[ELEC-B-002] CI 自动推送打包产物至 GitHub Packages / Releases #P2
  - [x] 配置 GitHub Actions 工作流，在每次推送代码触发 TS 编译/构建时，自动执行 Electron 打包
  - [x] 自动化工作流自动将打包好的桌面端程序（.dmg, .exe 等）发布并推送到 GitHub Releases 或 GitHub Packages
