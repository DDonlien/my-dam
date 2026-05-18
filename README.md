# Asset Browser

Local asset browser for folders whose root contains a CSV or Excel manifest. It uses the browser File System Access API to resolve local files, preview media, and write parsable JSON documents.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/` in Chrome or Edge. Safari and Firefox do not expose folder read/write permissions for this workflow.

## Index Workflow

The app treats `asset-browser.index.json` as the generated asset index.

On every folder open or reload, it checks:

- Is `asset-browser.index.json` missing or unreadable?
- Does the JSON's recorded manifest list differ from the current root CSV/XLSX files?
- Is any CSV/XLSX `lastModified` newer than the JSON file's `lastModified`?

If any answer is yes, the app parses the current CSV/XLSX files and writes a fresh `asset-browser.index.json`. If all answers are no, it reads the existing JSON and does not write it, so the JSON file modification time remains a reliable timestamp of the last real index generation.

## Manifest Columns

The parser accepts CSV or XLSX files in the selected folder root. It looks for these columns, including Chinese aliases:

```csv
name,type,path,tags
Ambience Loop,audio,Audio/ambience-loop.mp3,ambient;loop
Hero Mesh,model,Models/hero.glb,character
```

Supported aliases:

- `name`: `name`, `asset`, `title`, `filename`, `名称`, `资产名称`, `文件名`
- `type`: `type`, `kind`, `category`, `mime`, `类型`, `资产类型`, `分类`
- `path`: `path`, `url`, `address`, `reference`, `file`, `路径`, `地址`, `引用`, `文件路径`
- `tags`: `tags`, `labels`, `keywords`, `标签`, `关键词`

If the path does not match exactly, the app falls back to a unique filename match within the selected folder tree.

## State Document

Favorites, history, and rename records are stored as JSON:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-05-18T00:00:00.000Z",
  "favorites": [],
  "history": [],
  "renames": []
}
```

The UI can save or load this document from browser `localStorage`, the selected asset root as `asset-browser.state.json`, or a custom folder chosen by the user. This is intentionally separate from `asset-browser.index.json` so favorites and history do not change the index file modification time.

## Supported Preview Types

- Images: `png`, `jpg`, `jpeg`, `gif`, `webp`, `avif`, `svg`
- Audio: `mp3`, `wav`, `ogg`, `m4a`, `flac`
- Video: `mp4`, `mov`, `webm`, `m4v`
- 3D: `glb`, `gltf`, `obj`, `stl`
- Documents: `pdf`, `txt`, `md`, `json`

GLTF relative buffers and textures are resolved from the same folder tree when they sit beside the model path.
