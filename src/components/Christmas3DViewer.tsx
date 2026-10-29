import { useEffect, useRef, useState } from "react";

interface ModelPartMeta {
  name: string;
  color: [number, number, number];
  metallic: number;
  roughness: number;
  emissive: number;
  role: string;
  vertexStart: number;
  vertexCount: number;
  hidden?: boolean;
}

interface ModelHeader {
  version: number;
  productId: string;
  totalTriangles: number;
  hasKineticSpiral?: boolean;
  hasLampGlow?: boolean;
  lightPos?: [number, number, number];
  isCustomUpload?: boolean;
  customFileName?: string;
  parts: ModelPartMeta[];
}

export interface Christmas3DViewerProps {
  modelId: string;
  productName: string;
  warmLighting?: boolean;
  compact?: boolean;
  poster?: string;
}

const VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in float aPartId;

uniform mat4 uViewProj;
uniform float uYaw;
uniform float uPitch;
uniform float uZoom;
uniform float uSpiralSlide;
uniform float uFlipUpAxis;

out vec3 vWorldPos;
out vec3 vNormal;
flat out int vPartId;

mat3 rotY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}

mat3 rotX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}

void main() {
  int pid = int(aPartId + 0.5);
  vec3 pos = aPosition;
  vec3 norm = aNormal;

  if (uFlipUpAxis > 0.5) {
    pos = vec3(pos.x, pos.z, -pos.y);
    norm = vec3(norm.x, norm.z, -norm.y);
  }

  // Real 3D helical lift & twist for the Swirling Christmas Tree inner gold cone (role == 1)
  // Reversed twist direction (-3.935 rad per unit lift) so both spiral pieces twist in the exact same handedness!
  if (pid == 1) {
    float lift = uSpiralSlide * 0.36;
    float twist = -lift * 3.935;
    float c = cos(twist);
    float s = sin(twist);
    // Rotate (x, z) by +twist in atan2(z, x)
    mat2 m = mat2(c, s, -s, c);
    pos.xz = m * pos.xz;
    norm.xz = m * norm.xz;
    pos.y += lift;
  }

  mat3 R = rotX(uPitch) * rotY(uYaw);
  vec3 worldPos = R * (pos * uZoom);
  vec3 worldNorm = normalize(R * norm);

  vWorldPos = worldPos;
  vNormal = worldNorm;
  vPartId = pid;

  gl_Position = uViewProj * vec4(worldPos, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
flat in int vPartId;

uniform vec3 uBaseColor;
uniform float uMetallic;
uniform float uRoughness;
uniform float uEmissive;
uniform float uWarmMode;
uniform float uLampDimmer;
uniform float uHasLamp;
uniform vec3 uLampPos;
uniform float uYaw;
uniform float uPitch;
uniform float uZoom;

out vec4 fragColor;

mat3 rotY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}

mat3 rotX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}

void main() {
  vec3 N = normalize(gl_FrontFacing ? vNormal : -vNormal);
  vec3 V = normalize(vec3(0.0, 0.12, 2.8) - vWorldPos);

  // Studio 3-point lighting + subtle environment hemisphere
  vec3 L1 = normalize(vec3(0.58, 0.78, 0.68));
  vec3 L2 = normalize(vec3(-0.72, 0.32, 0.48));
  vec3 L3 = normalize(vec3(0.0, -0.85, 0.35));

  vec3 keyColor = mix(vec3(1.0, 0.98, 0.95), vec3(1.04, 0.96, 0.86), uWarmMode);
  vec3 fillColor = mix(vec3(0.76, 0.84, 0.94), vec3(0.92, 0.84, 0.74), uWarmMode);
  vec3 bounceColor = vec3(0.45, 0.38, 0.30);

  // Soft wrap diffuse for realistic 3D-printed PLA subsurface scatter feel
  float diff1 = max(0.0, (dot(N, L1) + 0.18) / 1.18);
  float diff2 = max(0.0, (dot(N, L2) + 0.15) / 1.15);
  float diff3 = max(0.0, dot(N, L3));

  vec3 H1 = normalize(L1 + V);
  vec3 H2 = normalize(L2 + V);
  float shininess = mix(96.0, 14.0, clamp(uRoughness, 0.08, 0.95));
  float spec1 = pow(max(dot(N, H1), 0.0), shininess) * mix(0.24, 1.15, uMetallic);
  float spec2 = pow(max(dot(N, H2), 0.0), shininess * 0.6) * mix(0.10, 0.45, uMetallic);

  // Rim / Fresnel highlight
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.2);
  vec3 rimColor = mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.86, 0.60), uWarmMode) * fresnel * 0.32;

  vec3 specTint = mix(vec3(1.0), uBaseColor * 1.25, uMetallic * 0.72);
  vec3 ambient = uBaseColor * mix(vec3(0.36, 0.38, 0.40), vec3(0.42, 0.38, 0.33), uWarmMode);

  vec3 color =
    ambient +
    uBaseColor * (diff1 * keyColor * 0.74 + diff2 * fillColor * 0.36 + diff3 * bounceColor * 0.18) +
    specTint * (spec1 * keyColor + spec2 * fillColor) +
    rimColor;

  // Internal 3D point light for Christmas lamps (Nativity, Angel, Moon Village, Bonfire)
  if (uHasLamp > 0.5 && uLampDimmer > 0.01) {
    mat3 R = rotX(uPitch) * rotY(uYaw);
    vec3 worldLampPos = R * (uLampPos * uZoom);
    vec3 toLight = worldLampPos - vWorldPos;
    float dist = length(toLight);
    vec3 L_lamp = toLight / max(dist, 0.001);
    float atten = 1.0 / (1.0 + 2.4 * dist * dist);
    float wrapN = max(0.0, (dot(N, L_lamp) + 0.55) / 1.55);
    vec3 candleColor = vec3(1.0, 0.72, 0.28) * uLampDimmer * 1.75;
    color += uBaseColor * candleColor * wrapN * atten;
    color += candleColor * (0.28 * atten);
  }

  if (uEmissive > 0.01) {
    float glow = uEmissive * mix(0.45, 1.35, uLampDimmer);
    color += uBaseColor * glow * vec3(1.0, 0.88, 0.58);
  }

  // Smooth ACES-style filmic tone mapping
  color = color / (color + vec3(0.88));
  color = pow(clamp(color * 1.14, 0.0, 1.0), vec3(1.0 / 1.12));

  fragColor = vec4(color, 1.0);
}
`;

function createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, vsSrc);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(vs) || "Vertex shader error");
  }
  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, fsSrc);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(fs) || "Fragment shader error");
  }
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || "Link error");
  }
  return prog;
}

function perspectiveMatrix(fovRad: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1.0 / Math.tan(fovRad / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function translateViewProj(proj: Float32Array, tx: number, ty: number, tz: number): Float32Array {
  const out = new Float32Array(proj);
  out[12] = proj[0] * tx + proj[4] * ty + proj[8] * tz + proj[12];
  out[13] = proj[1] * tx + proj[5] * ty + proj[9] * tz + proj[13];
  out[14] = proj[2] * tx + proj[6] * ty + proj[10] * tz + proj[14];
  out[15] = proj[3] * tx + proj[7] * ty + proj[11] * tz + proj[15];
  return out;
}

function rgbToHex(c: [number, number, number]): string {
  const r = Math.max(0, Math.min(255, Math.round(c[0] * 255))).toString(16).padStart(2, "0");
  const g = Math.max(0, Math.min(255, Math.round(c[1] * 255))).toString(16).padStart(2, "0");
  const b = Math.max(0, Math.min(255, Math.round(c[2] * 255))).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16) || 0;
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

/**
 * Computes clean crease-angle vertex normals (42 deg threshold) in the browser
 * for any user-uploaded .STL or .3MF mesh at 100% original CAD resolution!
 */
function computeBrowserCreaseNormals(positions: Float32Array, cosCrease = 0.743): Float32Array {
  const numVerts = positions.length / 3;
  const numTris = (numVerts / 3) | 0;
  const faceNorms = new Float32Array(numTris * 3);
  const faceAreas = new Float32Array(numTris);

  for (let t = 0; t < numTris; t++) {
    const b = t * 9;
    const ax = positions[b + 3] - positions[b];
    const ay = positions[b + 4] - positions[b + 1];
    const az = positions[b + 5] - positions[b + 2];
    const bx = positions[b + 6] - positions[b];
    const by = positions[b + 7] - positions[b + 1];
    const bz = positions[b + 8] - positions[b + 2];
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz);
    faceAreas[t] = len;
    if (len > 1e-12) {
      faceNorms[t * 3] = nx / len;
      faceNorms[t * 3 + 1] = ny / len;
      faceNorms[t * 3 + 2] = nz / len;
    } else {
      faceNorms[t * 3 + 1] = 1;
    }
  }

  const weldMap = new Map<string, number>();
  const vertWeldId = new Int32Array(numVerts);
  const weldTris: number[][] = [];

  for (let v = 0; v < numVerts; v++) {
    const x = Math.round(positions[v * 3] * 500);
    const y = Math.round(positions[v * 3 + 1] * 500);
    const z = Math.round(positions[v * 3 + 2] * 500);
    const key = `${x},${y},${z}`;
    let wid = weldMap.get(key);
    if (wid === undefined) {
      wid = weldTris.length;
      weldMap.set(key, wid);
      weldTris.push([]);
    }
    vertWeldId[v] = wid;
    weldTris[wid].push((v / 3) | 0);
  }

  const outNorms = new Float32Array(numVerts * 3);
  for (let t = 0; t < numTris; t++) {
    const fnx = faceNorms[t * 3];
    const fny = faceNorms[t * 3 + 1];
    const fnz = faceNorms[t * 3 + 2];
    for (let k = 0; k < 3; k++) {
      const v = t * 3 + k;
      const adj = weldTris[vertWeldId[v]];
      let sx = 0, sy = 0, sz = 0;
      if (adj.length <= 64) {
        for (let i = 0; i < adj.length; i++) {
          const ot = adj[i];
          const onx = faceNorms[ot * 3];
          const ony = faceNorms[ot * 3 + 1];
          const onz = faceNorms[ot * 3 + 2];
          if (fnx * onx + fny * ony + fnz * onz >= cosCrease) {
            const w = faceAreas[ot] || 1;
            sx += onx * w;
            sy += ony * w;
            sz += onz * w;
          }
        }
      } else {
        sx = fnx; sy = fny; sz = fnz;
      }
      const len = Math.hypot(sx, sy, sz) || 1;
      outNorms[v * 3] = sx / len;
      outNorms[v * 3 + 1] = sy / len;
      outNorms[v * 3 + 2] = sz / len;
    }
  }
  return outNorms;
}

function parseStlBuffer(buf: ArrayBuffer): Float32Array {
  const dv = new DataView(buf);
  if (buf.byteLength >= 84) {
    const numTris = dv.getUint32(80, true);
    if (84 + numTris * 50 === buf.byteLength) {
      const out = new Float32Array(numTris * 9);
      let off = 84;
      let p = 0;
      for (let i = 0; i < numTris; i++) {
        off += 12;
        for (let j = 0; j < 9; j++) {
          out[p++] = dv.getFloat32(off, true);
          off += 4;
        }
        off += 2;
      }
      return out;
    }
  }
  const text = new TextDecoder().decode(buf);
  const verts: number[] = [];
  const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    verts.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  return new Float32Array(verts);
}

async function inflateRawBrowser(compBytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(compBytes as any);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

async function unzip3mfBrowser(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buf);
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("Not a valid .3mf archive");
  const count = dv.getUint16(eocd + 10, true);
  let pos = dv.getUint32(eocd + 16, true);
  const files = new Map<string, Uint8Array>();
  const dec = new TextDecoder();

  for (let i = 0; i < count; i++) {
    const method = dv.getUint16(pos + 10, true);
    const compSize = dv.getUint32(pos + 20, true);
    const nameLen = dv.getUint16(pos + 28, true);
    const extraLen = dv.getUint16(pos + 30, true);
    const commentLen = dv.getUint16(pos + 32, true);
    const lh = dv.getUint32(pos + 42, true);
    const name = dec.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
    const dStart = lh + 30 + dv.getUint16(lh + 26, true) + dv.getUint16(lh + 28, true);
    const compSlice = bytes.subarray(dStart, dStart + compSize);
    if (name.endsWith(".model") || name.endsWith(".config")) {
      const content = method === 0 ? compSlice : await inflateRawBrowser(compSlice);
      files.set(name, content);
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const DEFAULT_PALETTE: [number, number, number][] = [
  [0.88, 0.64, 0.22], // Warm Gold
  [0.14, 0.45, 0.28], // Festive Pine Green
  [0.82, 0.14, 0.18], // Christmas Cranberry Red
  [0.96, 0.95, 0.92], // Porcelain Snow White
  [0.92, 0.73, 0.58], // Warm Peach / Wood
  [0.20, 0.34, 0.54], // Winter Midnight Blue
];

async function parseUploadedFilesToGpu(
  fileList: FileList,
  productId: string
): Promise<{ header: ModelHeader; posNorm: Float32Array; partIds: Float32Array }> {
  const rawParts: {
    name: string;
    verts: Float32Array;
    norms: Float32Array;
    color: [number, number, number];
    metallic?: number;
    roughness?: number;
    emissive?: number;
    role?: string;
  }[] = [];

  for (let fi = 0; fi < fileList.length; fi++) {
    const file = fileList[fi];
    const ext = file.name.toLowerCase();
    const buf = await file.arrayBuffer();

    if (ext.endsWith(".stl")) {
      const rawStl = parseStlBuffer(buf);
      // Convert Z-up STL to Y-up by default
      const yUp = new Float32Array(rawStl.length);
      for (let i = 0; i < rawStl.length; i += 3) {
        yUp[i] = rawStl[i];
        yUp[i + 1] = rawStl[i + 2];
        yUp[i + 2] = -rawStl[i + 1];
      }
      const norms = computeBrowserCreaseNormals(yUp);
      const baseName = file.name.replace(/\.stl$/i, "");
      rawParts.push({
        name: baseName,
        verts: yUp,
        norms,
        color: DEFAULT_PALETTE[rawParts.length % DEFAULT_PALETTE.length],
        metallic: 0.2,
        roughness: 0.36,
      });
    } else if (ext.endsWith(".3mf")) {
      const entries = await unzip3mfBrowser(buf);
      const dec = new TextDecoder();

      // Extract filament colors from project_settings.config if present
      let palette: [number, number, number][] = [...DEFAULT_PALETTE];
      const projCfg = entries.get("Metadata/project_settings.config");
      if (projCfg) {
        try {
          const json = JSON.parse(dec.decode(projCfg));
          if (Array.isArray(json.filament_colour) && json.filament_colour.length > 0) {
            palette = json.filament_colour.map((hex: string) => hexToRgb(hex));
          }
        } catch {
          // ignore
        }
      }

      // Parse part names and extruder indices from model_settings.config or Slic3r_PE_model.config
      const partMeta: Record<string, { name?: string; extruder?: number; ox?: number; oy?: number; oz?: number }> = {};
      const modCfg = entries.get("Metadata/model_settings.config");
      if (modCfg) {
        const txt = dec.decode(modCfg);
        for (const pm of txt.matchAll(/<part id="(\d+)"[^>]*>([\s\S]*?)<\/part>/g)) {
          const pid = pm[1];
          const name = (pm[2].match(/key="name" value="([^"]+)"/) || [])[1];
          const extNum = parseInt((pm[2].match(/key="extruder" value="(\d+)"/) || [])[1] || "0", 10);
          const ox = +(pm[2].match(/key="source_offset_x" value="([^"]+)"/) || [0, 0])[1];
          const oy = +(pm[2].match(/key="source_offset_y" value="([^"]+)"/) || [0, 0])[1];
          const oz = +(pm[2].match(/key="source_offset_z" value="([^"]+)"/) || [0, 0])[1];
          partMeta[pid] = { name, extruder: extNum, ox, oy, oz };
        }
      }

      const compTransforms: Record<string, [number, number, number]> = {};
      const rootModel = entries.get("3D/3dmodel.model");
      if (rootModel) {
        const txt = dec.decode(rootModel);
        for (const cm of txt.matchAll(/<component[^>]*objectid="(\d+)"[^>]*transform="([^"]+)"/g)) {
          const t = cm[2].trim().split(/\s+/).map(Number);
          compTransforms[cm[1]] = [t[9] || 0, t[10] || 0, t[11] || 0];
        }
      }

      for (const [entryName, content] of entries.entries()) {
        if (!entryName.endsWith(".model")) continue;
        const xml = dec.decode(content);
        for (const m of xml.matchAll(/<object id="(\d+)"[^>]*>([\s\S]*?)<\/object>/g)) {
          const oid = m[1];
          const body = m[2];
          const vx: number[] = [], vy: number[] = [], vz: number[] = [];
          for (const vm of body.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)) {
            vx.push(parseFloat(vm[1]));
            vy.push(parseFloat(vm[2]));
            vz.push(parseFloat(vm[3]));
          }
          if (vx.length === 0) continue;

          const [tx, ty, tz] = compTransforms[oid] || [
            partMeta[oid]?.ox || 0,
            partMeta[oid]?.oy || 0,
            partMeta[oid]?.oz || 0,
          ];

          // Group triangles by paint_color attribute if painted in Bambu Studio
          const byPaint = new Map<string, number[]>();
          for (const tm of body.matchAll(/<triangle\s+([^>]+)>/g)) {
            const attrs = tm[1];
            const v1 = parseInt((attrs.match(/v1="(\d+)"/) || [])[1], 10);
            const v2 = parseInt((attrs.match(/v2="(\d+)"/) || [])[1], 10);
            const v3 = parseInt((attrs.match(/v3="(\d+)"/) || [])[1], 10);
            const pc = (attrs.match(/paint_color="([^"]+)"/) || [0, "default"])[1];
            let arr = byPaint.get(pc);
            if (!arr) {
              arr = [];
              byPaint.set(pc, arr);
            }
            for (const vi of [v1, v2, v3]) {
              arr.push(vx[vi] + tx, vy[vi] + ty, vz[vi] + tz);
            }
          }

          let groupIdx = 0;
          for (const [pc, coords] of byPaint.entries()) {
            const verts = new Float32Array(coords);
            const norms = computeBrowserCreaseNormals(verts);
            const meta = partMeta[oid];
            const partIndex = rawParts.length;
            const colorIdx =
              meta?.extruder && meta.extruder > 0
                ? (meta.extruder - 1) % palette.length
                : (partIndex + groupIdx) % palette.length;
            const cleanName = (meta?.name || `Part ${oid}`).replace(/\.(stl|3mf)$/i, "");
            rawParts.push({
              name: byPaint.size > 1 ? `${cleanName} (Color ${groupIdx + 1})` : cleanName,
              verts,
              norms,
              color: palette[colorIdx],
              metallic: 0.16,
              roughness: 0.38,
            });
            groupIdx++;
          }
        }
      }
    }
  }

  if (rawParts.length === 0) {
    throw new Error("No 3D mesh triangles found in the selected file.");
  }

  // Normalize all parts into [-0.89, +0.89] centered world box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let totalVerts = 0;

  for (const p of rawParts) {
    totalVerts += p.verts.length / 3;
    for (let i = 0; i < p.verts.length; i += 3) {
      const x = p.verts[i], y = p.verts[i + 1], z = p.verts[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
  }

  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const maxSpan = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
  const scale = 1.78 / maxSpan;

  const posNorm = new Float32Array(totalVerts * 6);
  const partIds = new Float32Array(totalVerts);
  const headerParts: ModelPartMeta[] = [];
  let vCursor = 0;

  for (const p of rawParts) {
    const vCount = p.verts.length / 3;
    headerParts.push({
      name: p.name,
      color: p.color,
      metallic: p.metallic ?? 0.16,
      roughness: p.roughness ?? 0.38,
      emissive: p.emissive ?? 0,
      role: p.role || "static",
      vertexStart: vCursor,
      vertexCount: vCount,
    });

    for (let i = 0; i < vCount; i++) {
      const s = i * 3;
      const d = (vCursor + i) * 6;
      posNorm[d] = (p.verts[s] - cx) * scale;
      posNorm[d + 1] = (p.verts[s + 1] - cy) * scale;
      posNorm[d + 2] = (p.verts[s + 2] - cz) * scale;
      posNorm[d + 3] = p.norms[s];
      posNorm[d + 4] = p.norms[s + 1];
      posNorm[d + 5] = p.norms[s + 2];
      partIds[vCursor + i] = 0;
    }
    vCursor += vCount;
  }

  const header: ModelHeader = {
    version: 3,
    productId,
    totalTriangles: totalVerts / 3,
    isCustomUpload: true,
    customFileName: Array.from(fileList).map(f => f.name).join(" + "),
    parts: headerParts,
  };

  return { header, posNorm, partIds };
}

/** Load geometry near the viewport on desktop, or only by request on a phone. */
export default function Christmas3DViewer(props: Christmas3DViewerProps) {
  const host = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [photoOnly, setPhotoOnly] = useState(false);
  useEffect(() => {
    if (started || photoOnly || !host.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && window.matchMedia('(min-width: 761px) and (prefers-reduced-motion: no-preference)').matches) {
        setStarted(true);
      }
    }, { rootMargin: '100px' });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [started, photoOnly]);
  return <div ref={host} className="xmas-viewer-shell">
    {started && !photoOnly ? <>
      <Christmas3DStage key={props.modelId} {...props} onUnavailable={() => setPhotoOnly(true)} />
      <button className="xmas-viewer-photo-toggle" type="button" onClick={() => setPhotoOnly(true)}>Return to photo · stop 3D</button>
    </> : <div className="xmas-viewer-poster">
      {props.poster && <img src={props.poster} alt={props.productName} loading="lazy" />}
      <button type="button" className="xmas-button" onClick={() => { setPhotoOnly(false); setStarted(true); }}>Explore in 3D ↗</button>
    </div>}
  </div>;
}

function Christmas3DStage({
  modelId,
  productName,
  warmLighting = true,
  compact = false,
  onUnavailable,
}: Christmas3DViewerProps & { onUnavailable: () => void }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [header, setHeader] = useState<ModelHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [spiralSlide, setSpiralSlide] = useState(0);
  const [autoSpiral, setAutoSpiral] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [lampDimmer, setLampDimmer] = useState(90);
  const [flipUpAxis, setFlipUpAxis] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  useEffect(() => { if (error) onUnavailable(); }, [error, onUnavailable]);

  const stateRef = useRef({
    yaw: 0.35,
    pitch: 0.16,
    zoom: 1.05,
    dragging: false,
    lastX: 0,
    lastY: 0,
    autoRotate: true,
    spiralSlide: 0,
    autoSpiral: true,
    lampDimmer: 0.9,
    warmLighting: true,
    flipUpAxis: false,
    parts: [] as ModelPartMeta[],
  });

  stateRef.current.autoRotate = autoRotate;
  stateRef.current.spiralSlide = spiralSlide / 100;
  stateRef.current.autoSpiral = autoSpiral;
  stateRef.current.lampDimmer = lampDimmer / 100;
  stateRef.current.warmLighting = warmLighting;
  stateRef.current.flipUpAxis = flipUpAxis;
  if (header) {
    stateRef.current.parts = header.parts;
  }

  const gpuDataRef = useRef<{
    header: ModelHeader;
    posNorm: Float32Array;
    partIds: Float32Array;
    dirty: boolean;
  } | null>(null);

  // Native non-passive wheel listener on the 3D canvas wrapper so scrolling NEVER scrolls the page!
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onNativeWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.09 : 0.91;
      stateRef.current.zoom = Math.max(0.55, Math.min(2.6, stateRef.current.zoom * factor));
    };
    wrap.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => {
      wrap.removeEventListener("wheel", onNativeWheel);
    };
  }, []);

  const loadDefaultModel = () => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFlipUpAxis(false);

    fetch(`/media/shop/${modelId}/model-3d.bin`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then(buf => {
        if (cancelled) return;
        const dv = new DataView(buf);
        const magic = String.fromCharCode(
          dv.getUint8(0),
          dv.getUint8(1),
          dv.getUint8(2),
          dv.getUint8(3)
        );
        if (magic !== "CBS3") throw new Error("Invalid CBS3 model format");
        const headerLen = dv.getUint32(4, true);
        const headerBytes = new Uint8Array(buf, 8, headerLen);
        const hdr = JSON.parse(new TextDecoder().decode(headerBytes)) as ModelHeader;

        const payloadOffset = 8 + headerLen;
        const int16 = new Int16Array(buf, payloadOffset);
        const totalVerts = int16.length / 6;

        const posNorm = new Float32Array(totalVerts * 6);
        const partIds = new Float32Array(totalVerts);

        for (let i = 0; i < totalVerts; i++) {
          const s = i * 6;
          posNorm[s] = int16[s] / 32767.0;
          posNorm[s + 1] = int16[s + 1] / 32767.0;
          posNorm[s + 2] = int16[s + 2] / 32767.0;
          posNorm[s + 3] = int16[s + 3] / 32767.0;
          posNorm[s + 4] = int16[s + 4] / 32767.0;
          posNorm[s + 5] = int16[s + 5] / 32767.0;
        }

        hdr.parts.forEach(part => {
          const roleCode = part.role === "inner-spiral" ? 1.0 : part.role === "flame" ? 2.0 : 0.0;
          for (let v = part.vertexStart; v < part.vertexStart + part.vertexCount; v++) {
            partIds[v] = roleCode;
          }
        });

        gpuDataRef.current = { header: hdr, posNorm, partIds, dirty: true };
        stateRef.current.yaw = 0.35;
        stateRef.current.pitch = 0.16;
        stateRef.current.zoom = 1.05;
        setHeader(hdr);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message || "Could not load 3D model");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    return loadDefaultModel();
  }, [modelId]);

  const handleUserFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseUploadedFilesToGpu(files, modelId);
      gpuDataRef.current = { ...parsed, dirty: true };
      stateRef.current.yaw = 0.35;
      stateRef.current.pitch = 0.16;
      stateRef.current.zoom = 1.05;
      setFlipUpAxis(false);
      setHeader(parsed.header);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "Failed to parse uploaded 3D file (.stl / .3mf)");
      setLoading(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: true });
    if (!gl) {
      setError("WebGL2 is required for real 3D model rendering.");
      return;
    }

    let prog: WebGLProgram;
    try {
      prog = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    } catch (e: any) {
      setError(e.message);
      return;
    }

    const vao = gl.createVertexArray()!;
    const vboPosNorm = gl.createBuffer()!;
    const vboPart = gl.createBuffer()!;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vboPosNorm);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);

    gl.bindBuffer(gl.ARRAY_BUFFER, vboPart);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 4, 0);
    gl.bindVertexArray(null);

    const locs = {
      uViewProj: gl.getUniformLocation(prog, "uViewProj"),
      uYaw: gl.getUniformLocation(prog, "uYaw"),
      uPitch: gl.getUniformLocation(prog, "uPitch"),
      uZoom: gl.getUniformLocation(prog, "uZoom"),
      uSpiralSlide: gl.getUniformLocation(prog, "uSpiralSlide"),
      uFlipUpAxis: gl.getUniformLocation(prog, "uFlipUpAxis"),
      uBaseColor: gl.getUniformLocation(prog, "uBaseColor"),
      uMetallic: gl.getUniformLocation(prog, "uMetallic"),
      uRoughness: gl.getUniformLocation(prog, "uRoughness"),
      uEmissive: gl.getUniformLocation(prog, "uEmissive"),
      uWarmMode: gl.getUniformLocation(prog, "uWarmMode"),
      uLampDimmer: gl.getUniformLocation(prog, "uLampDimmer"),
      uHasLamp: gl.getUniformLocation(prog, "uHasLamp"),
      uLampPos: gl.getUniformLocation(prog, "uLampPos"),
    };

    let rafId = 0;
    let lastTime = performance.now();
    let inView = true;

    const render = (now: number) => {
      rafId = 0;
      if (!inView || document.hidden) return;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      gl.viewport(0, 0, w, h);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const gpu = gpuDataRef.current;
      if (gpu) {
        if (gpu.dirty) {
          gl.bindBuffer(gl.ARRAY_BUFFER, vboPosNorm);
          gl.bufferData(gl.ARRAY_BUFFER, gpu.posNorm, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ARRAY_BUFFER, vboPart);
          gl.bufferData(gl.ARRAY_BUFFER, gpu.partIds, gl.STATIC_DRAW);
          gpu.dirty = false;
        }

        const st = stateRef.current;
        if (st.autoRotate && !st.dragging) {
          st.yaw += dt * 0.48;
        }

        let slideVal = st.spiralSlide;
        if (gpu.header.hasKineticSpiral && st.autoSpiral) {
          slideVal = (Math.sin(now * 0.0017) * 0.5 + 0.5) * 0.88;
        }

        const proj = perspectiveMatrix((36 * Math.PI) / 180, w / h, 0.1, 25.0);
        const vp = translateViewProj(proj, 0, -0.04, -3.15);

        gl.useProgram(prog);
        gl.bindVertexArray(vao);

        gl.uniformMatrix4fv(locs.uViewProj, false, vp);
        gl.uniform1f(locs.uYaw, st.yaw);
        gl.uniform1f(locs.uPitch, st.pitch);
        gl.uniform1f(locs.uZoom, st.zoom);
        gl.uniform1f(locs.uSpiralSlide, slideVal);
        gl.uniform1f(locs.uFlipUpAxis, st.flipUpAxis ? 1.0 : 0.0);
        gl.uniform1f(locs.uWarmMode, st.warmLighting ? 1.0 : 0.0);
        gl.uniform1f(locs.uLampDimmer, st.lampDimmer);
        gl.uniform1f(locs.uHasLamp, gpu.header.hasLampGlow ? 1.0 : 0.0);
        const lp = gpu.header.lightPos || [0, -0.25, 0.12];
        gl.uniform3f(locs.uLampPos, lp[0], lp[1], lp[2]);

        const activeParts = st.parts.length > 0 ? st.parts : gpu.header.parts;
        for (const part of activeParts) {
          if (part.hidden) continue;
          gl.uniform3f(locs.uBaseColor, part.color[0], part.color[1], part.color[2]);
          gl.uniform1f(locs.uMetallic, part.metallic);
          gl.uniform1f(locs.uRoughness, part.roughness);
          gl.uniform1f(locs.uEmissive, part.emissive);
          gl.drawArrays(gl.TRIANGLES, part.vertexStart, part.vertexCount);
        }

        gl.bindVertexArray(null);
      }

      rafId = requestAnimationFrame(render);
    };

    const resume = () => {
      if (inView && !document.hidden && !rafId) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(render);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      resume();
    });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', resume);
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const respectMotion = () => {
      if (motionPreference.matches) { setAutoRotate(false); setAutoSpiral(false); }
    };
    motionPreference.addEventListener('change', respectMotion);
    resume();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      motionPreference.removeEventListener('change', respectMotion);
      cancelAnimationFrame(rafId);
      gl.deleteBuffer(vboPosNorm);
      gl.deleteBuffer(vboPart);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
    };
  }, []);

  const updatePartColor = (partIndex: number, hexColor: string) => {
    if (!header) return;
    const rgb = hexToRgb(hexColor);
    const nextParts = header.parts.map((p, i) => (i === partIndex ? { ...p, color: rgb } : p));
    setHeader({ ...header, parts: nextParts });
  };

  const togglePartHidden = (partIndex: number) => {
    if (!header) return;
    const nextParts = header.parts.map((p, i) => (i === partIndex ? { ...p, hidden: !p.hidden } : p));
    setHeader({ ...header, parts: nextParts });
  };

  return (
    <div className={`xmas-real3d-widget ${compact ? "is-compact" : ""}`}>

      <div ref={wrapRef} className="xmas-real3d-canvas-wrap">
        <div className="xmas-real3d-top-pills">
          <span className="xmas-real3d-live-tag">
            <i aria-hidden="true" />{" "}
            REAL 3D MODEL · DRAG TO ROTATE
          </span>
          {header && (
            <span className="xmas-real3d-poly-tag">
              {header.totalTriangles.toLocaleString()} triangles · {header.parts.length} {header.parts.length === 1 ? "part" : "colored parts"}
            </span>
          )}
        </div>

        <canvas
          ref={canvasRef}
          className="xmas-real3d-canvas"
          tabIndex={0}
          onKeyDown={e => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '='].includes(e.key)) return;
            e.preventDefault();
            setAutoRotate(false);
            if (e.key === 'ArrowLeft') stateRef.current.yaw -= 0.15;
            if (e.key === 'ArrowRight') stateRef.current.yaw += 0.15;
            if (e.key === 'ArrowUp') stateRef.current.pitch = Math.max(-1.25, stateRef.current.pitch - 0.15);
            if (e.key === 'ArrowDown') stateRef.current.pitch = Math.min(1.25, stateRef.current.pitch + 0.15);
            if (e.key === '+' || e.key === '=') stateRef.current.zoom = Math.min(2.6, stateRef.current.zoom * 1.1);
            if (e.key === '-') stateRef.current.zoom = Math.max(0.55, stateRef.current.zoom / 1.1);
          }}
          aria-label={`Interactive 3D model of ${productName}. Drag sideways to rotate, or use arrow keys and the zoom buttons. Swipe vertically to scroll the page.`}
          onPointerDown={e => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            stateRef.current.dragging = true;
            stateRef.current.lastX = e.clientX;
            stateRef.current.lastY = e.clientY;
          }}
          onPointerMove={e => {
            if (!stateRef.current.dragging) return;
            e.stopPropagation();
            const dx = e.clientX - stateRef.current.lastX;
            const dy = e.clientY - stateRef.current.lastY;
            stateRef.current.lastX = e.clientX;
            stateRef.current.lastY = e.clientY;
            stateRef.current.yaw += dx * 0.011;
            stateRef.current.pitch = Math.max(-1.25, Math.min(1.25, stateRef.current.pitch + dy * 0.011));
          }}
          onPointerUp={() => {
            stateRef.current.dragging = false;
          }}
          onPointerCancel={() => {
            stateRef.current.dragging = false;
          }}
        />

        {loading && (
          <div className="xmas-real3d-overlay">
            <span>Loading clean 3D geometry for {productName}…</span>
          </div>
        )}
        {error && (
          <div className="xmas-real3d-overlay is-error">
            <span>{error}</span>
          </div>
        )}


        <p className="xmas-real3d-touch-guide">Swipe sideways on the model to rotate · Swipe up or down to scroll</p>
        <div className="xmas-real3d-toolbar">
          <button
            type="button"
            className={autoRotate ? "is-active" : ""}
            onClick={() => setAutoRotate(!autoRotate)}
          >
            {autoRotate ? "⟳ Auto-Spin On" : "⟳ Auto-Spin Off"}
          </button>
          <button
            type="button"
            onClick={() => {
              stateRef.current.zoom = Math.min(2.6, stateRef.current.zoom * 1.18);
            }}
            title="Zoom in"
          >
            ＋ Zoom In
          </button>
          <button
            type="button"
            onClick={() => {
              stateRef.current.zoom = Math.max(0.55, stateRef.current.zoom * 0.85);
            }}
            title="Zoom out"
          >
            － Zoom Out
          </button>
          <button
            type="button"
            onClick={() => {
              stateRef.current.yaw = 0.35;
              stateRef.current.pitch = 0.16;
              stateRef.current.zoom = 1.05;
            }}
          >
            ↺ Reset Angle
          </button>

        </div>
      </div>

      {header?.hasKineticSpiral && (
        <div className="xmas-real3d-interactive-bar">
          <div className="xmas-real3d-slider-head">
            <strong>🌀 Real 3D Kinetic Spiral Action:</strong>
            <button
              type="button"
              className={`xmas-mini-pill-btn ${autoSpiral ? "is-active" : ""}`}
              onClick={() => setAutoSpiral(!autoSpiral)}
            >
              {autoSpiral ? "● Auto-Sliding Spiral" : "Manual Slider"}
            </button>
          </div>
          <label className="xmas-real3d-range">
            <span>Slide &amp; Twist Gold Cone along Sage Green Spiral Grooves:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={spiralSlide}
              onChange={e => {
                setAutoSpiral(false);
                setSpiralSlide(Number(e.target.value));
              }}
            />
          </label>
        </div>
      )}

      {header?.hasLampGlow && (
        <div className="xmas-real3d-interactive-bar">
          <div className="xmas-real3d-slider-head">
            <span>
              🕯️ Internal Tealight: <strong>{lampDimmer === 0 ? "Off (Daylight)" : `${lampDimmer}% Glow`}</strong>
            </span>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button
                type="button"
                className={`xmas-mini-pill-btn ${lampDimmer === 0 ? "is-active" : ""}`}
                onClick={() => setLampDimmer(0)}
                title="Turn off internal light to view daylight PLA finish"
              >
                ☀️ Off
              </button>
              <button
                type="button"
                className={`xmas-mini-pill-btn ${lampDimmer > 0 ? "is-active" : ""}`}
                onClick={() => setLampDimmer(lampDimmer === 0 ? 90 : lampDimmer)}
                title="Turn on internal candle to view warm internal glow"
              >
                🕯️ On (90%)
              </button>
            </div>
          </div>
          <label className="xmas-real3d-range">
            <input
              type="range"
              min="0"
              max="100"
              value={lampDimmer}
              onChange={e => setLampDimmer(Number(e.target.value))}
              aria-label="Internal Tealight Brightness"
            />
          </label>
        </div>
      )}

      {header && header.parts.length > 0 && (
        <div className="xmas-real3d-parts-legend" aria-label="3D printed elements included">
          <span className="xmas-parts-legend-label">
            🎨 Authentic Multi-Material 3D Details:
          </span>
          {header.parts.map((part, i) => (
            <span key={i} className="xmas-real3d-part-chip">
              <i
                style={{
                  backgroundColor: `rgb(${Math.round(part.color[0] * 255)}, ${Math.round(part.color[1] * 255)}, ${Math.round(part.color[2] * 255)})`,
                }}
              />
              <span>{part.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
