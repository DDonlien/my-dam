# Asset Browser

Local asset browser for folders whose root contains an `asset-browser-index` JSON, CSV, or Excel index. It uses the browser File System Access API to resolve local files, preview media, and write parsable JSON documents.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/` in Chrome or Edge. Safari and Firefox do not expose folder read/write permissions for this workflow.

## Index Workflow

The app only treats these root-level files as asset indexes:

- `asset-browser-index.json`
- `asset-browser-index.csv`
- `asset-browser-index.xlsx`

This avoids accidentally reading unrelated spreadsheets when a folder contains many CSV or Excel files.

On every folder open or reload:

1. If `asset-browser-index.json` exists, the app parses and validates it.
2. If the JSON is valid and no `asset-browser-index.csv` / `.xlsx` file is newer, the app loads the JSON and does not write it.
3. If the JSON is missing, invalid, or older than the CSV/XLSX source, the app chooses the newest source between `asset-browser-index.csv` and `asset-browser-index.xlsx`.
4. The selected source is parsed and used to generate a fresh `asset-browser-index.json`.
5. If generation fails, the app reports the failure instead of silently falling back.

The JSON document is only modified when it is generated or refreshed. Its file modification time therefore remains the timestamp of the last real index generation.

## Manifest Columns

The parser accepts `asset-browser-index.csv` or `asset-browser-index.xlsx` in the selected folder root. It looks for these columns, including Chinese aliases:

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

## Metadata Document

Favorites, collection membership, history, rename records, and user tags are stored in the selected asset root as `asset-browser-metadata.json`:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-05-18T00:00:00.000Z",
  "favorites": [],
  "history": [],
  "renames": [],
  "assetTags": {
    "asset-id": ["review", "hero"]
  }
}
```

When a folder is opened, the app tries to load `asset-browser-metadata.json` from that folder. After interactions such as favoriting, grouping into collections, opening assets, renaming, or editing tags, the app writes the updated metadata back to the same root folder. Browser `localStorage` is kept as a temporary fallback before a folder is selected, but folder-specific behavior lives in the root metadata file so different content folders and devices do not share accidental state.

This file is intentionally separate from `asset-browser-index.json` so interactions do not change the index file modification time.

## Supported Preview Types

- Images: `png`, `jpg`, `jpeg`, `gif`, `webp`, `avif`, `svg`
- Audio: `mp3`, `wav`, `ogg`, `m4a`, `flac`
- Video: `mp4`, `mov`, `webm`, `m4v`
- 3D: `glb`, `gltf`, `obj`, `stl`
- Documents: `pdf`, `txt`, `md`, `json`

GLTF relative buffers and textures are resolved from the same folder tree when they sit beside the model path.

## Preview Behavior

- Click preview mode: clicking an image, video, or model opens the preview pane; clicking an audio row starts playback inside the row.
- Hover preview mode: hovering an image, video, or model opens the preview pane; hovering an audio row starts playback inside the row and leaving the row pauses it.
- Audio progress bars are interactive in both modes. Clicking the waveform jumps to that point and plays. In hover mode, moving over the waveform continuously seeks to the hovered position and plays.
- The lock button keeps the preview pane visible even when the current row would normally hide it.
