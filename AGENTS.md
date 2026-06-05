# Agent 协作规范

本文件分为“标准内容”和“项目专用内容”。除非用户明确要求修改协作规范，否则只允许在“项目专用内容”下补充或调整，不修改标准内容。

## 标准内容

### 0. 文档缺失时先创建

- 如果当前仓库或当前子功能根目录没有 `AGENTS.md`，先阅读 `agent-template/AGENTS.md` ，并在根目录创建属于该目录自己的 `AGENTS.md` 。
- 如果没有 `REQUIREMENTS.md` ，先阅读 `agent-template/REQUIREMENTS.md` ，并在根目录属于该目录自己的`REQUIREMENTS.md` 。
- 如果没有 `DESIGN.md` ，先阅读 `agent-template/DESIGN.md` ，并在根目录属于该目录自己的 `DESIGN.md` 。
- 如果没有 `README.md`，先阅读 `agent-template/README.md` ，并在根目录属于该目录自己的 `README.md` 。
- 如果仓库内已有内容，或已经与当前agent进行过对话，基于仓库内的内容 and 对话的实际情况，填写上述文件，填写规则会在下文中写明。
- `AGENTS.md`、`REQUIREMENTS.md`、`DESIGN.md` 和 `README.md` 默认使用中文书写；除非用户特别说明，或术语、代码符号、专有名词本身应使用英文。
- `agent-template/` 中的 `README.md`、`REQUIREMENTS.md`、`DESIGN.md` 和 `agent-log/` 日志模板只保留演示内容；具体撰写规则统一以本 `AGENTS.md` 为准，阅读时需要注意分辨规则和示例的差异。
- 上述创建的文件的文件名必须全大写，其中AGENTS和REQUIREMENTS需要复数，即使用户临时写成小写或单数，也应该注意到该统一标准（除非用户数明确要求修改）。
- 由于本template也经由git管理，所以目录下会存在.git等相关文件，所有实际仓库在使用时，应该先删除agent-template下的git相关资产，移除其git仓库特征，避免上层仓库管理问题。

### 1. 每次任务开始前

- 确认当前分支是用户希望工作的分支；分支切换由用户手动完成，Agent 不主动切换分支。
- 如果当前目录属于 git 仓库，先执行 `git pull`，确保任务基准更新到最新。
- If `git pull` 失败、发生冲突，或提示需要人工处理，停止执行并告知用户。
- 阅读用户本次原始 prompt。
- 阅读当前目录适用的 `AGENTS.md`、`README.md`、`REQUIREMENTS.md`、`DESIGN.md` 和 `agent-log/` 中的日志。日志的阅读规则如下：
  - 找到由当前agent/对话创建的最新日志。
  - 如果有任何日志比该日志更新，阅读所有更新。
  - 如果没有，则不阅读 any 日志
- 检查 `REQUIREMENTS.md`，确认用户本次需求是否匹配已有需求、子需求、验收项或已标记的阻塞项。
- 如果仓库内有父级与子级 `AGENTS.md`，从父到子依次阅读；更具体目录的规则优先，但不得违反父级标准内容和用户明确要求。

### 2. 每次任务执行中

- 为每次任务执行创建一条新的执行日志，放在当前适用目录 of `agent-log/`。
- 日志命名规则：`YYYYMMDDHHMMSS-utcpN-model.md` 或 `YYYYMMDDHHMMSS-utcnN-model.md`。
- `utcpN` 表示 UTC 正偏移，`utcnN` 表示 UTC 负偏移；不要在文件名中使用 `+` 或 `-`，以确保不同系统和工具链的适配性，N由实际数字代替。
- 示例：`20260530174209-utcp8-gpt5.md`、`20260530094209-utcn8-gpt5.md`。
- 使用任务完成时间作为日志文件名中的时间；如果任务开始时先创建临时日志，交付前按完成时间重命名。
- 一次任务执行从 Agent 开始处理用户请求算起，到交付、提交、阻塞或明确暂停为止。
- 如果用户在同一次执行中补充或修正要求、引导对话，把补充 prompt 原文和时间追加到同一条日志。
- 如果上一次执行已经交付，用户提出新任务时创建新日志。
- 每条日志记录一次任务执行中的对话、行动和总结；中间过程可由 Agent 自行概括，但要足够支持后续接手。
- 每条日志开头必须包含：
  - 用户原始 prompt
  - 启动运行时的分支 and 版本，也就是 `git pull` 以后实际所在分支与提交版本
  - 任务开始时间
  - 任务结束时间
  - 任务结束时是否执行了提交
- 每条日志还应包含：
  - 已阅读上下文
  - 对话与行动记录
  - 完成工作
  - 更新的需求 ID
  - 更新的 README 或 DESIGN 章节
  - 验证方式
  - 备注
- 日志模板文件只保留演示内容；日志命名、必填字段、撰写规则以本 `AGENTS.md` 为准。

### 3. REQUIREMENTS.md 的维护标准

- `REQUIREMENTS.md` 使用 Obsidian 原生友好的 Markdown 格式：标题层级、缩进任务列表、稳定 ID、少量标签。
- 不使用复杂表格。
- 不使用 YAML 字段。
- 通过标题分级拆分阶段、模块和主题；阶段如何命名、是否使用 Phase、Phase 如何划分，由具体项目自行决定。
- 更频繁地通过缩进 checkbox 表达父子任务、子任务、验收项和检查点关系。
- 每个可执行需求必须有稳定 ID。
- 任务状态使用原生 Markdown checkbox：
  - `- [ ]` 表示未完成。
  - `- [x]` 表示已完成。
  - 阻塞、延后、取消在任务后追加 `#blocked`、`#deferred` 或 `#cut`。
  - 如果条目本身不适合涵盖已完成、未完成的信息，但确实需要被记录，则checkbox视作是否已读。
  - 如果条目本身既不适合记录是否已读、也不适合记录完成状态，但确实需要记录，则酌情使用有序、无序列表。
- 稳定 ID 不因排序、插入或移动而改变。
- 拆分任务时保留原 ID，并新增子 ID。
- 不静默删除需求；取消的需求保留并标记 `#cut`，附简短原因。
- 每次任务开始前，先检查 `REQUIREMENTS.md` 中是否已有匹配需求。
- 每次任务完成后，再根据本次记忆或重新检查 `REQUIREMENTS.md`，把已经完成的需求、子需求或验收项勾选为完成。
- 如果任务改变范围、状态、验收标准、优先级或阻塞条件，必须同步更新 `REQUIREMENTS.md`。
- 具体需求、验收标准、任务拆分、优先级、阻塞状态和完成状态只写入 `REQUIREMENTS.md`，不要写入 `README.md` 或 `DESIGN.md`。

### 4. README.md 的维护纪律

- `README.md` 记录系统、仓库或应用的整体说明，而不是视觉规范或具体任务清单。
- `README.md` 应说明项目是什么、解决什么问题、当前能力、目录结构、运行方式、文档入口和适用边界，可以视作对外的项目介绍文档，便于不了解项目的人用于第一时间了解项目。
- 当系统范围、仓库结构、应用能力、运行方式或用户入口发生变化时，同步更新 `README.md`。
- 不要把具体待办、验收项和任务状态写进 `README.md`；这些内容写入 `REQUIREMENTS.md`。

### 5. DESIGN 维护纪律

- `DESIGN.md` 不是系统整体设计文档；它是视觉规范和界面风格文档。
- `DESIGN.md` 参考 Google Stitch / DESIGN.md 的语义：用 Markdown 描述 AI 和开发者可执行的视觉设计系统，包括颜色、字体、间距、布局、组件样式、视觉语气、响应式规则和可访问性约束。
- 如果该文件在首次创建时仓库中已有内容、或者已有agent对话记录，则应该根据已有内容总结并创建符合实际情况的文件。
- `DESIGN.md` 用于让 AI 在实现 UI 时不猜测视觉风格；它不记录系统架构、数据模型、产品路线图或任务列表。
- 当品牌视觉、UI 风格、设计 token、组件外观、布局原则或可访问性规则变化时，同步更新 `DESIGN.md`。
- 如果项目没有 UI 或视觉界面，`DESIGN.md` 可只记录“不适用”和原因。
- 如果仓库中已有旧名 `DESIGNS.md`且内容其实是系统/架构说明，后续整理时应迁移：系统/仓库/应用说明进入 `README.md`，视觉规范进入 `DESIGN.md`，具体需求进入 `REQUIREMENTS.md`。
- 如果项目的设计风格发生了大幅度、颠覆性的改变，应该将老版本的内容创建为一个DESIGN-yyyymmddhhmmss.md的文件，保存到根目录/archive/design/的地址，如果改地址不存在，创建。
- 针对更复杂的、存在“内容”和“系统”的项目，应当在agent-log下再创建2个文件夹，分别为agent-log/system and agent-log/content。每次实际执行任务时，应该针对性的记录log而非总是都记录。内容和系统改动任务的分类由ai自行判断，通常来说，web系统的数据、游戏的装备数值和技能等属于内容更新。

### 6. 父子文档关系

- 如果仓库内有明显的多个子功能、子应用、子游戏、工具包或独立模块，应在根目录和每一层子功能根目录创建一套文档：
  - `AGENTS.md`
  - `README.md`
  - `REQUIREMENTS.md`
  - `DESIGN.md`
  - `agent-log/`
- 根目录 `README.md` 描述全局目标、共享约束、目录索引和跨子功能关系。
- 子功能 `README.md` 只描述该子功能独有的用途、入口、命令和边界，避免复制父级已有内容。
- 子功能 `DESIGN.md` 只描述该子功能独有视觉规范；如果沿用父级视觉规范，写明继承关系即可。
- 父级 `AGENTS.md` 必须索引子功能目录，并说明每个子功能的文档入口。
- 当一个任务只影响某个子功能时，优先更新该子功能的 `README.md`、`REQUIREMENTS.md`、`DESIGN.md` 和 `agent-log/`；如影响全局规则或跨子功能关系，再同步更新父级文档。
- 如果仓库中存在 `reference/`、`references/`、`third_party/`、`vendor/`、`examples/`、`project/` 等目录，并且其中嵌套了外部 GitHub 仓库、参考项目、示例项目或只读资料，这些目录不需要创建本规范涉及的文档；更新 `README.md`、`REQUIREMENTS.md`、`DESIGN.md` 和 `agent-log/` 时也不把这些外部参考仓库纳入项目自身范围，除非用户明确要求整理或改造这些目录。

### 7. 工程默认规则

- 优先遵循仓库已有技术栈、目录结构、命名和风格。
- 保持改动聚焦在用户请求范围内。
- 不覆盖用户改动，不回滚无关文件。
- 行为、共享逻辑或用户可见流程发生变化时，补充或更新测试。
- 交付前运行相关验证命令；如果无法运行，说明原因并记录剩余风险。
- 搜索优先使用 `rg`。
- 手工编辑文件优先使用补丁方式，避免产生无关格式化或大范围重写。

---

## 项目专用内容

### 项目概况

- 项目名称：MyDAM（My Digital Asset Manager，正式产品名；代码内部 npm package 名为 `my-dam`）
- 产品简介：通过 `asset-browser-index` JSON、CSV 或 Excel 索引来读取、预览和管理本地资产（图片、音频、视频、3D模型、文档）的浏览器。利用浏览器的 File System Access API 实现本地文件夹读取。
- 主要用户：个人开发者、3D 美术创作者、音效设计师等，用于本地资产的整理与预览。
- 当前阶段：已完成单页应用的核心工作台开发（P1 需求），正在准备进行 Electron 打包与工程规范化（P2 需求）。

### 技术栈与命令

- 技术栈：React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Three.js（使用 npm workspaces 单体仓库管理）
- 开发命令：`npm run dev` （在根目录执行即可自动启动 ts 子工作区开发环境）
- 构建命令：`npm run build`
- 校验命令：`npm run lint`

### 文档入口

- 项目说明：`README.md`
- 需求追踪：`REQUIREMENTS.md`
- 视觉规范：`DESIGN.md`
- 执行日志：`agent-log/`

### 目录索引

- 根目录：项目整体工程说明与配置（如 README.md, AGENTS.md, REQUIREMENTS.md, DESIGN.md）
- 网页与前端源码（TS）：`ts/`
- Electron 桌面封装与资源：`electron/`
- Node 脚本及实用小工具：`node/`
- 规范模板：`agent-template/`

### 子功能文档入口

暂无独立子功能模块。

### 项目特殊约束

#### 1. 环境识别与双重角色
在修改任何文件之前，首先判定自己所处的环境：
- **处于“代码仓库”（Code Repository）**：若项目包含 `ts/package.json`、`ts/vite.config.ts`、`ts/src/App.tsx`、`ts/src/lib/indexDocument.ts` 以及本 `AGENTS.md` 等代码仓库特征文件。
- **处于“资产仓库”（Asset Repository）**：若根目录主要包含资产文件，以及名为以下之一的索引文件：
  - `asset-browser-index.json`
  - `asset-browser-index.csv`
  - `asset-browser-index.xlsx`
  *注意：只有以上确切命名的文件才被视为资产浏览器索引。不要将任意 CSV 或 Excel 文件误判为索引文件。*
- **混合情况**：如果同时存在两类特征，若包含 `ts/package.json` 且其中声明了 MyDAM 应用本身（package name 为 `my-dam`），则优先作为代码仓库处理；否则作为资产仓库处理，避免破坏应用的源码假设。

#### 2. 代码仓库开发规范
遵循现有的 React/Vite 实现，并保持改动范围聚焦：
- 优先使用 `rg` / `rg --files` 进行代码检索。
- 除非用户明确要求，否则不要回滚无关的用户改动、生成输出或脏工作区状态。
- 修改代码后，必须在根目录下运行 `npm run build` 和 `npm run lint` 进行校验。
- 对于可见 of UI 改动，在本地运行的 localhost URL 可用时，在浏览器中进行验证。

**索引行为与应用约定：**
- 应用仅识别根目录下的 `asset-browser-index.json`、`asset-browser-index.csv` 和 `asset-browser-index.xlsx`。
- 打开文件夹时，如果存在有效的当前 JSON 索引，直接加载而不重新写入。
- 如果 CSV/XLSX 比 JSON 更新，或 JSON 缺失/无效，在拥有写入权限时，解析最新的 CSV/XLSX 数据并写入一份全新的 JSON。
- 用户交互状态（标签、评分、集合、历史等）保存在独立的 `asset-browser-metadata.json` 中，必须与索引文件分开，避免频繁更改索引文件的时间戳。

**UI 修复与设计纪律：**
- 保持安静、密集的 Linear 风格布局。避免使用装饰性的 hero 区域、营销横幅、卡片嵌卡片（card-inside-card）、发光球体（orb）或单一渐变效果。
- 左侧边栏应在视觉上与应用背景融合。其行内容应靠左对齐，而数量/值等内容应靠右对齐。
- 折叠后的边栏应是背景的一部分，而非悬浮卡片。点击首个折叠控件应能展开边栏。
- 主筛选/搜索栏应作为顶部工具栏置于资产列表卡片内部。
- 资产标题行是全局对齐的基准。主体列数据必须与标题行对齐相同的网格。
- 选择框和 `Name` 列保持在最左侧，`Actions` 列保持在最右侧。中间的资产列在宽度紧张时可以压缩或横向滚动。
- `Type` 是等宽的图标徽章，且水平居中。
- `FileType` 为纯文本，不要使用药丸（pill）背景。
- `Size` 右对齐且永不换行。
- `Rating`、`Tag` 以及文本列均左对齐（除非有明确特殊要求）。
- 标签药丸可以折行展示（最多两行），但悬停或选中时不应改变行高。过长的标签文本应通过省略号截断。
- 操作区（Actions）目前指下载和删除。不要在操作区内重新引入重复的收藏按钮。
- 活动日志（Log）是底部的行内控件，而非浮动窗口。折叠状态下应保持紧凑、右对齐，并在视觉上与 `Generate Index` 按钮对齐。

#### 3. 资产仓库索引规范
在资产根目录下生成和维护索引文件。规范的基本文件名永远是 `asset-browser-index`。

**目标表格列：**
- `name`：文件名或显示名称
- `path`：从资产根目录出发的相对路径，统一使用 `/` 作为分隔符
- `type`：资产类型，取值为 `image`、`audio`、`video`、`model`、`document` 或 `unknown`
- `filetype`：实际文件后缀，在写入 CSV/XLSX 时使用大写
- `size`：以 MB 为单位的文件大小
- `collection`：直接父文件夹名称；若文件直接位于根目录下则为 `root`

当前应用解析器会从 CSV/XLSX 中消费 `name`、`type`、`path` 以及可选的 `tags`。保留 `filetype`、`size` 和 `collection` 作为有用的元数据列，它们会被保留在 JSON 资产的元数据中。

**处理场景：**
1. **已有 CSV 或 Excel 索引**：以它们作为数据源。若两者同时存在，选择修改时间最新者。验证源文件是否包含可用的路径/引用列，并根据它重新生成或补全 JSON 索引。若 JSON 索引有效且是最新，则不重新写入。生成后，需验证 JSON 符合应用的数据结构。
2. **无有效索引文件**：扫描目录树并自动生成新索引文件。跳过隐藏文件、`node_modules`、`.git`、现有的 `asset-browser-index.*` 和 `asset-browser-metadata.json`。导出 `asset-browser-index.csv`，如果环境可用则同时导出 `.xlsx`，并生成符合规格的 `asset-browser-index.json`。
3. **仅有 JSON 索引而无 CSV/XLSX**：若 JSON 有效则无需重新写入。如果用户要求表格文件，可以从 JSON 的 `assets` 列表中导出 CSV/XLSX。若 JSON 无效且无表格源，则退回到场景 2 重新扫描构建。

**资产仓库验证检查单：**
- 确认仅创建或更新了根目录下的 `asset-browser-index.*` 文件。
- 确认所有路径均相对于资产根目录，且使用 `/`。
- 确认 JSON 可通过 `JSON.parse` 解析。
- 确认每个 JSON 资产对象包含必填字段：`id`, `name`, `kind`, `typeLabel`, `reference`, `normalizedPath`, `folder`, `extension`, `status`, `sourceRow`, `tags`, `metadata`, `isExternal`。
- 确认 CSV/XLSX 中的 `size` 单位为 MB，而 JSON 中的 `size` 单位为字节。
- 除非有明确要求，否则不要修改任何实际资产文件本身。
