import type { AssetRecord } from '../types'

export function createTemplateAssets(): AssetRecord[] {
  return [
    createTemplateAsset({
      id: 'template-audio',
      name: 'Template Audio Loop',
      kind: 'audio',
      typeLabel: 'audio/wav',
      reference: 'template/audio-loop.wav',
      extension: 'wav',
      previewUrl: createToneWavDataUrl(),
      tags: ['template', 'audio'],
    }),
    createTemplateAsset({
      id: 'template-image',
      name: 'Template Image Sprite',
      kind: 'image',
      typeLabel: 'image/svg+xml',
      reference: 'template/image-sprite.svg',
      extension: 'svg',
      previewUrl: svgDataUrl(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
          <rect width="960" height="540" fill="#fbfbf8"/>
          <pattern id="dot" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#d9d9d3"/>
          </pattern>
          <rect width="960" height="540" fill="url(#dot)"/>
          <rect x="220" y="120" width="520" height="300" fill="#eef2ff" stroke="#2856ff" stroke-width="4"/>
          <circle cx="375" cy="270" r="76" fill="#2856ff"/>
          <path d="M510 340 602 218 715 340Z" fill="#167a44"/>
          <text x="480" y="468" text-anchor="middle" font-family="monospace" font-size="28" font-weight="700" fill="#2c3230">IMAGE TEMPLATE</text>
        </svg>
      `),
      tags: ['template', 'image'],
    }),
    createTemplateAsset({
      id: 'template-video',
      name: 'Template Video Clip',
      kind: 'video',
      typeLabel: 'video/mp4',
      reference: 'template/video-clip.mp4',
      extension: 'mp4',
      previewUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      tags: ['template', 'video'],
      isExternal: true,
    }),
    createTemplateAsset({
      id: 'template-model-static',
      name: 'Template Static Model',
      kind: 'model',
      typeLabel: 'model/gltf+json',
      reference: 'template/static-model.gltf',
      extension: 'gltf',
      previewUrl: createTriangleGltfDataUrl(false),
      tags: ['template', 'model'],
    }),
    createTemplateAsset({
      id: 'template-model-animated',
      name: 'Template Animated Model',
      kind: 'model',
      typeLabel: 'model/gltf+json',
      reference: 'template/animated-model.gltf',
      extension: 'gltf',
      previewUrl: createTriangleGltfDataUrl(true),
      tags: ['template', 'model', 'animated'],
    }),
  ]
}

function createTemplateAsset(
  asset: Pick<
    AssetRecord,
    | 'id'
    | 'name'
    | 'kind'
    | 'typeLabel'
    | 'reference'
    | 'extension'
    | 'previewUrl'
    | 'tags'
  > &
    Partial<AssetRecord>,
): AssetRecord {
  return {
    folder: 'template',
    normalizedPath: asset.reference,
    sourceRow: 0,
    metadata: { source: 'template' },
    status: 'external',
    isExternal: asset.isExternal ?? false,
    ...asset,
  }
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function createToneWavDataUrl() {
  const sampleRate = 22050
  const duration = 1.4
  const frameCount = Math.floor(sampleRate * duration)
  const data = new Uint8Array(44 + frameCount * 2)
  const view = new DataView(data.buffer)
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + frameCount * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, frameCount * 2, true)

  for (let index = 0; index < frameCount; index += 1) {
    const envelope = 1 - index / frameCount
    const sample =
      Math.sin((index / sampleRate) * Math.PI * 2 * 220) * 0.42 * envelope
    view.setInt16(44 + index * 2, sample * 32767, true)
  }

  return `data:audio/wav;base64,${arrayBufferToBase64(data.buffer)}`
}

function createTriangleGltfDataUrl(animated: boolean) {
  const positions = new Float32Array([
    0, 1, 0,
    -0.9, -0.55, 0,
    0.9, -0.55, 0,
  ])
  const indices = new Uint16Array([0, 1, 2])
  const times = new Float32Array([0, 1.2, 2.4])
  const rotations = new Float32Array([
    0, 0, 0, 1,
    0, 0.707, 0, 0.707,
    0, 0, 0, 1,
  ])
  const sections = alignBuffers([
    positions.buffer,
    indices.buffer,
    ...(animated ? [times.buffer, rotations.buffer] : []),
  ])
  const combined = sections.buffer
  const bufferViews: Array<{
    buffer: number
    byteOffset: number
    byteLength: number
    target?: number
  }> = [
    {
      buffer: 0,
      byteOffset: sections.offsets[0],
      byteLength: positions.byteLength,
      target: 34962,
    },
    {
      buffer: 0,
      byteOffset: sections.offsets[1],
      byteLength: indices.byteLength,
      target: 34963,
    },
  ]
  const accessors = [
    {
      bufferView: 0,
      componentType: 5126,
      count: 3,
      type: 'VEC3',
      min: [-0.9, -0.55, 0],
      max: [0.9, 1, 0],
    },
    { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' },
  ]

  if (animated) {
    bufferViews.push(
      {
        buffer: 0,
        byteOffset: sections.offsets[2],
        byteLength: times.byteLength,
      },
      {
        buffer: 0,
        byteOffset: sections.offsets[3],
        byteLength: rotations.byteLength,
      },
    )
    accessors.push(
      { bufferView: 2, componentType: 5126, count: 3, type: 'SCALAR' },
      { bufferView: 3, componentType: 5126, count: 3, type: 'VEC4' },
    )
  }

  const gltf = {
    asset: { version: '2.0', generator: 'MyDAM Template' },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ mesh: 0, name: animated ? 'Animated Triangle' : 'Static Triangle' }],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: animated ? [0.16, 0.34, 1, 1] : [0.09, 0.48, 0.27, 1],
          metallicFactor: 0.08,
          roughnessFactor: 0.64,
        },
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
            material: 0,
          },
        ],
      },
    ],
    buffers: [
      {
        uri: `data:application/octet-stream;base64,${arrayBufferToBase64(combined)}`,
        byteLength: combined.byteLength,
      },
    ],
    bufferViews,
    accessors,
    animations: animated
      ? [
          {
            name: 'Turntable',
            samplers: [{ input: 2, output: 3, interpolation: 'LINEAR' }],
            channels: [{ sampler: 0, target: { node: 0, path: 'rotation' } }],
          },
        ]
      : undefined,
  }

  return `data:model/gltf+json;base64,${btoa(JSON.stringify(gltf))}`
}

function alignBuffers(buffers: ArrayBuffer[]) {
  const offsets: number[] = []
  let byteLength = 0
  buffers.forEach((buffer) => {
    byteLength = align4(byteLength)
    offsets.push(byteLength)
    byteLength += buffer.byteLength
  })
  const merged = new Uint8Array(byteLength)
  buffers.forEach((buffer, index) => {
    const offset = offsets[index]
    merged.set(new Uint8Array(buffer), offset)
  })
  return { buffer: merged.buffer, offsets }
}

function align4(value: number) {
  return Math.ceil(value / 4) * 4
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}
