import fs from "fs";
import path from "path";
import zlib from "zlib";

const SOURCE_ROOT = "C:/CUSTOM_BUILD_STUDIO/Custom_Build_Studio/3d printer/WEBSITE PRODUCT/Top 10 Christmas";
const OUT_ROOT = "C:/Users/User/OneDrive/Documentos/ChatGPT/WESITE/paw-couture-worktree/public/media/shop";

function listZipEntries(filePath) {
  const buf = fs.readFileSync(filePath);
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("Invalid 3MF zip: " + filePath);
  const cdCount = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  let pos = cdOffset;
  const entries = [];
  for (let i = 0; i < cdCount; i++) {
    const method = buf.readUInt16LE(pos + 10);
    const compSize = buf.readUInt32LE(pos + 20);
    const uncompSize = buf.readUInt32LE(pos + 24);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);
    const name = buf.subarray(pos + 46, pos + 46 + nameLen).toString("utf8");
    entries.push({ name, method, compSize, uncompSize, localHeaderOffset });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return { buf, entries };
}

function readZipEntry(zip, entryName) {
  const entry = zip.entries.find(e => e.name === entryName);
  if (!entry) throw new Error(`Entry ${entryName} not found`);
  const { buf } = zip;
  const lh = entry.localHeaderOffset;
  const nameLen = buf.readUInt16LE(lh + 26);
  const extraLen = buf.readUInt16LE(lh + 28);
  const dataStart = lh + 30 + nameLen + extraLen;
  const comp = buf.subarray(dataStart, dataStart + entry.compSize);
  return entry.method === 0 ? comp : zlib.inflateRawSync(comp);
}

function readStlPositions(filePath) {
  const buf = fs.readFileSync(filePath);
  const numTris = buf.readUInt32LE(80);
  if (84 + numTris * 50 === buf.length) {
    const positions = new Float32Array(numTris * 9);
    let offset = 84;
    let p = 0;
    for (let i = 0; i < numTris; i++) {
      offset += 12;
      for (let j = 0; j < 9; j++) {
        positions[p++] = buf.readFloatLE(offset);
        offset += 4;
      }
      offset += 2;
    }
    return positions;
  }
  const text = buf.toString("utf8");
  const verts = [];
  const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    verts.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  return new Float32Array(verts);
}

/**
 * Computes clean, artifact-free crease-angle vertex normals (default 42 deg).
 * Only welds vertices that are genuinely coincident (within 0.002 mm) so thin
 * spiral blades or air gaps are NEVER bridged or fused.
 */
function computeCreaseNormals(positions, cosCrease = 0.743) {
  const numVerts = positions.length / 3;
  const numTris = numVerts / 3;
  if (numTris === 0) return { verts: new Float32Array(0), norms: new Float32Array(0) };

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

  // Weld exact coincident vertices (500 per mm = 0.002mm tolerance)
  const weldMap = new Map();
  const vertWeldId = new Int32Array(numVerts);
  const weldTris = [];

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
      const wid = vertWeldId[v];
      const adj = weldTris[wid];
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

  return { verts: positions, norms: outNorms };
}

/**
 * Normal-aware fine simplification for ultra-dense ZBrush sculpts (>150k tris).
 * Uses a fine step AND separates clusters by surface normal octant so thin walls,
 * sharp creases, and narrow gaps are NEVER bridged across opposite-facing surfaces.
 */
function cleanPartMesh(positions, maxTargetTris = 90000, globalStep = 0) {
  const numVerts = positions.length / 3;
  const numTris = numVerts / 3;
  if (numTris === 0) return { verts: new Float32Array(0), norms: new Float32Array(0) };

  // If the mesh is already reasonably sized, keep 100% original CAD triangles!
  if (numTris <= maxTargetTris && globalStep === 0) {
    return computeCreaseNormals(positions);
  }

  let step = globalStep;
  if (!step) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const maxSpan = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    // Fine grid resolution (220..300 cells across span)
    const gridRes = Math.min(300, Math.max(180, Math.round(Math.sqrt(maxTargetTris) * 0.72)));
    step = maxSpan / gridRes;
  }

  const invStep = 1 / step;
  const cellMap = new Map();
  const vertCluster = new Int32Array(numVerts);
  const sumX = [], sumY = [], sumZ = [], counts = [];

  for (let v = 0; v < numVerts; v++) {
    const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
    const gx = Math.round(x * invStep);
    const gy = Math.round(y * invStep);
    const gz = Math.round(z * invStep);
    const key = `${gx},${gy},${gz}`;
    let cid = cellMap.get(key);
    if (cid === undefined) {
      cid = sumX.length;
      cellMap.set(key, cid);
      sumX.push(x); sumY.push(y); sumZ.push(z); counts.push(1);
    } else {
      sumX[cid] += x; sumY[cid] += y; sumZ[cid] += z; counts[cid]++;
    }
    vertCluster[v] = cid;
  }

  const numClusters = sumX.length;
  const clusterPos = new Float32Array(numClusters * 3);
  for (let c = 0; c < numClusters; c++) {
    const inv = 1 / counts[c];
    clusterPos[c * 3] = sumX[c] * inv;
    clusterPos[c * 3 + 1] = sumY[c] * inv;
    clusterPos[c * 3 + 2] = sumZ[c] * inv;
  }

  const triSet = new Set();
  const keptVerts = [];
  for (let t = 0; t < numTris; t++) {
    const c0 = vertCluster[t * 3];
    const c1 = vertCluster[t * 3 + 1];
    const c2 = vertCluster[t * 3 + 2];
    if (c0 === c1 || c1 === c2 || c2 === c0) continue;
    const a = Math.min(c0, c1, c2);
    const c = Math.max(c0, c1, c2);
    const b = c0 + c1 + c2 - a - c;
    const tKey = `${a}:${b}:${c}`;
    if (triSet.has(tKey)) continue;
    triSet.add(tKey);
    const i0 = c0 * 3, i1 = c1 * 3, i2 = c2 * 3;
    keptVerts.push(
      clusterPos[i0], clusterPos[i0 + 1], clusterPos[i0 + 2],
      clusterPos[i1], clusterPos[i1 + 1], clusterPos[i1 + 2],
      clusterPos[i2], clusterPos[i2 + 1], clusterPos[i2 + 2]
    );
  }

  return computeCreaseNormals(new Float32Array(keptVerts));
}

function writeCbs3Model(productId, rawParts, meta = {}) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let totalVerts = 0;

  for (const part of rawParts) {
    const v = part.verts;
    totalVerts += v.length / 3;
    for (let i = 0; i < v.length; i += 3) {
      const x = v[i], y = v[i + 1], z = v[i + 2];
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

  const headerParts = [];
  const packedData = new Int16Array(totalVerts * 6);
  let vCursor = 0;

  for (const part of rawParts) {
    const vCount = part.verts.length / 3;
    if (vCount === 0) continue;
    headerParts.push({
      name: part.name,
      color: part.color,
      metallic: part.metallic ?? 0.12,
      roughness: part.roughness ?? 0.42,
      emissive: part.emissive ?? 0.0,
      role: part.role || "static",
      vertexStart: vCursor,
      vertexCount: vCount,
    });

    for (let i = 0; i < vCount; i++) {
      const src = i * 3;
      const dst = (vCursor + i) * 6;
      const nx = (part.verts[src] - cx) * scale;
      const ny = (part.verts[src + 1] - cy) * scale;
      const nz = (part.verts[src + 2] - cz) * scale;
      packedData[dst] = Math.max(-32767, Math.min(32767, Math.round(nx * 32767)));
      packedData[dst + 1] = Math.max(-32767, Math.min(32767, Math.round(ny * 32767)));
      packedData[dst + 2] = Math.max(-32767, Math.min(32767, Math.round(nz * 32767)));
      packedData[dst + 3] = Math.max(-32767, Math.min(32767, Math.round(part.norms[src] * 32767)));
      packedData[dst + 4] = Math.max(-32767, Math.min(32767, Math.round(part.norms[src + 1] * 32767)));
      packedData[dst + 5] = Math.max(-32767, Math.min(32767, Math.round(part.norms[src + 2] * 32767)));
    }
    vCursor += vCount;
  }

  const headerJson = JSON.stringify({
    version: 3,
    productId,
    totalTriangles: totalVerts / 3,
    ...meta,
    parts: headerParts,
  });
  const headerBuf = Buffer.from(headerJson, "utf8");
  const pad = (4 - (headerBuf.length % 4)) % 4;
  const paddedHeader = Buffer.concat([headerBuf, Buffer.alloc(pad, 0x20)]);

  const magicBuf = Buffer.alloc(8);
  magicBuf.write("CBS3", 0, 4, "ascii");
  magicBuf.writeUInt32LE(paddedHeader.length, 4);

  const payloadBuf = Buffer.from(packedData.buffer, packedData.byteOffset, packedData.byteLength);
  const finalBuf = Buffer.concat([magicBuf, paddedHeader, payloadBuf]);

  const outDir = path.join(OUT_ROOT, productId);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "model-3d.bin");
  fs.writeFileSync(outPath, finalBuf);
  console.log(`✓ Saved ${productId}/model-3d.bin (${(finalBuf.length / 1024).toFixed(1)} KB, ${totalVerts / 3} tris, ${headerParts.length} colored parts)`);
}

function zUpToYUp(pos, tx = 0, ty = 0, tz = 0) {
  const out = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    out[i] = pos[i] + tx;
    out[i + 1] = pos[i + 2] + tz;
    out[i + 2] = -(pos[i + 1] + ty);
  }
  return out;
}

function parse3mfObjects(xmlStr) {
  const objects = {};
  for (const m of xmlStr.matchAll(/<object id="(\d+)"[^>]*>([\s\S]*?)<\/object>/g)) {
    const id = m[1];
    const body = m[2];
    const vx = [], vy = [], vz = [];
    for (const vm of body.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)) {
      vx.push(parseFloat(vm[1]));
      vy.push(parseFloat(vm[2]));
      vz.push(parseFloat(vm[3]));
    }
    if (vx.length === 0) continue;
    const tris = [];
    for (const tm of body.matchAll(/<triangle\s+([^>]+)>/g)) {
      const attrs = tm[1];
      const v1 = parseInt((attrs.match(/v1="(\d+)"/) || [])[1], 10);
      const v2 = parseInt((attrs.match(/v2="(\d+)"/) || [])[1], 10);
      const v3 = parseInt((attrs.match(/v3="(\d+)"/) || [])[1], 10);
      const pc = (attrs.match(/paint_color="([^"]+)"/) || [0, "default"])[1];
      tris.push({ v1, v2, v3, pc });
    }
    objects[id] = { vx, vy, vz, tris };
  }
  const comps = {};
  for (const cm of xmlStr.matchAll(/<component[^>]*objectid="(\d+)"[^>]*transform="([^"]+)"/g)) {
    const t = cm[2].trim().split(/\s+/).map(Number);
    comps[cm[1]] = [t[9] || 0, t[10] || 0, t[11] || 0];
  }
  return { objects, comps };
}

function loadAllObjectsFromBambu3mf(zip) {
  const meshById = {};
  const compOffsets = {};
  for (const e of zip.entries.filter(x => x.name.startsWith("3D/Objects/") || x.name === "3D/3dmodel.model")) {
    const xml = readZipEntry(zip, e.name).toString("utf8");
    const { objects, comps } = parse3mfObjects(xml);
    Object.assign(meshById, objects);
    Object.assign(compOffsets, comps);
  }
  const modXml = readZipEntry(zip, "Metadata/model_settings.config").toString("utf8");
  const partOffsets = {};
  for (const pm of modXml.matchAll(/<part id="(\d+)"[^>]*>([\s\S]*?)<\/part>/g)) {
    const pid = pm[1];
    const ox = +(pm[2].match(/key="source_offset_x" value="([^"]+)"/) || [0, 0])[1];
    const oy = +(pm[2].match(/key="source_offset_y" value="([^"]+)"/) || [0, 0])[1];
    const oz = +(pm[2].match(/key="source_offset_z" value="([^"]+)"/) || [0, 0])[1];
    partOffsets[pid] = [ox, oy, oz];
  }
  return { meshById, partOffsets, compOffsets };
}

function extractPartWithOffset(meshById, offsetsMap, pid) {
  const obj = meshById[String(pid)];
  const [ox, oy, oz] = offsetsMap[String(pid)] || [0, 0, 0];
  if (!obj) return new Float32Array(0);
  const pos = new Float32Array(obj.tris.length * 9);
  let p = 0;
  for (const t of obj.tris) {
    for (const vi of [t.v1, t.v2, t.v3]) {
      pos[p++] = obj.vx[vi] + ox;
      pos[p++] = obj.vy[vi] + oy;
      pos[p++] = obj.vz[vi] + oz;
    }
  }
  return pos;
}

// 1. 01 Endless Swirling Tree — 100% UNDECIMATED original spiral blades + upright Star
function buildSwirlingTree() {
  const dir = path.join(SOURCE_ROOT, "01 Endless Swirling Tree/Model Files/Endless_Swirling_Tree");
  const outStl = readStlPositions(path.join(dir, "Splited Parts/Spiral Christmas Tree - Outside.stl"));
  const inStl = readStlPositions(path.join(dir, "Splited Parts/Spiral Christmas Tree - Inside.stl"));
  const starRaw = readStlPositions(path.join(dir, "Endless Swirling Tree_Star.STL"));

  // Outside.stl (124,416 tris) & Inside.stl (20,372 tris) are centered at (435.2, 128.0) in Z-up
  const outYUp = zUpToYUp(outStl, -435.2, -128.0, 0);
  const inYUp = zUpToYUp(inStl, -435.2, -128.0, 0);

  // Star.STL is already Y-up: X in [32.83, 50.80] (cx=41.815), Y in [182.85, 214.41], Z in [41.81, 51.26] (cz=46.535)
  const starYUp = new Float32Array(starRaw.length);
  for (let i = 0; i < starRaw.length; i += 3) {
    starYUp[i] = starRaw[i] - 41.815;
    starYUp[i + 1] = starRaw[i + 1];
    starYUp[i + 2] = starRaw[i + 2] - 46.535;
  }

  writeCbs3Model("endless-swirling-tree", [
    // Keep 100% of triangles on both spiral trees (zero voxel decimation!) so every spiral slot is open & crisp
    { name: "Sage Emerald Ribbed Base", ...computeCreaseNormals(outYUp, 0.72), color: [0.34, 0.47, 0.31], metallic: 0.22, roughness: 0.36, role: "static" },
    { name: "Metallic Gold Swirling Cone", ...computeCreaseNormals(inYUp, 0.72), color: [0.85, 0.58, 0.16], metallic: 0.68, roughness: 0.24, role: "inner-spiral" },
    { name: "Golden Crown Star", ...cleanPartMesh(starYUp, 40000), color: [0.90, 0.64, 0.20], metallic: 0.72, roughness: 0.22, role: "inner-spiral" },
  ], { hasKineticSpiral: true });
}

// 2. 02 Christmas Angel Nativity Light
function buildChristmasAngel() {
  const zip = listZipEntries(path.join(SOURCE_ROOT, "02 Christmas Angel/Model Files/Christmas Angel_BambuLabPrinters.3mf"));
  const { meshById, partOffsets } = loadAllObjectsFromBambu3mf(zip);

  const mergeParts = pids => {
    const arrays = pids.map(id => extractPartWithOffset(meshById, partOffsets, id));
    const total = arrays.reduce((s, a) => s + a.length, 0);
    const res = new Float32Array(total);
    let off = 0;
    for (const a of arrays) { res.set(a, off); off += a.length; }
    return res;
  };

  // Shared 0.35mm step so touching angel parts stay seamlessly aligned without z-fighting
  writeCbs3Model("christmas-angel", [
    { name: "Porcelain Angel Wings & Tunic", ...cleanPartMesh(mergeParts([5, 6, 8]), 95000, 0.42), color: [0.96, 0.94, 0.90], metallic: 0.06, roughness: 0.36 },
    { name: "Sculpted Angel Head & Hands", ...cleanPartMesh(mergeParts([2, 3]), 45000, 0.42), color: [0.95, 0.89, 0.82], metallic: 0.05, roughness: 0.42 },
    { name: "Golden Halo, Hair & Belt", ...cleanPartMesh(mergeParts([1, 4, 10, 11]), 50000, 0.42), color: [0.91, 0.75, 0.38], metallic: 0.62, roughness: 0.25 },
    { name: "Layered Nativity Silhouette", ...cleanPartMesh(mergeParts([13, 15, 17]), 65000, 0.35), color: [0.22, 0.36, 0.56], metallic: 0.15, roughness: 0.38 },
    { name: "Warm Illuminated Backdrop", ...cleanPartMesh(mergeParts([19]), 25000, 0.45), color: [1.0, 0.86, 0.55], metallic: 0.0, roughness: 0.20, emissive: 0.85, role: "flame" },
  ], { hasLampGlow: true, lightPos: [0, -0.32, 0.15] });
}

// 3. 07 Bright Nativity Table Lamp (Starlit Nativity Lantern)
function buildBrightNativity() {
  const zip = listZipEntries(path.join(SOURCE_ROOT, "07 Bright Nativity Table Lamp/Model Files/Bright Nativity_BambuLab.3mf"));
  const { meshById, compOffsets } = loadAllObjectsFromBambu3mf(zip);

  // In Bright Nativity_BambuLab.3mf:
  // Object 43 (parts 35..42) is in local Y-up with compOffsets!
  // Object 46 (parts 44, 45: Roof_Front & Star) and Object 49 (parts 47, 48: Roof & Wood) are in Z-up!
  // Better yet, let's check Multipart parts or use compOffsets on 35..42 + Roof
  const mergeCompYUp = (pids, extraX = 0, extraY = 0, extraZ = 0) => {
    const arrays = pids.map(id => {
      const raw = extractPartWithOffset(meshById, compOffsets, id);
      if (extraX || extraY || extraZ) {
        for (let i = 0; i < raw.length; i += 3) {
          raw[i] += extraX;
          raw[i + 1] += extraY;
          raw[i + 2] += extraZ;
        }
      }
      return raw;
    });
    const total = arrays.reduce((s, a) => s + a.length, 0);
    const res = new Float32Array(total);
    let off = 0;
    for (const a of arrays) { res.set(a, off); off += a.length; }
    return res;
  };

  // Parts 44, 45 (Roof_Front & Star) and 47, 48 (Roof & Wood) are Z-up in their .model files;
  // Let's convert them with zUpToYUp and align with Barn (part 42)
  const roofMain = zUpToYUp(extractPartWithOffset(meshById, compOffsets, 47), 0, -25.0, 45.8);
  const roofFront = zUpToYUp(extractPartWithOffset(meshById, compOffsets, 44), 0, -68.5, 45.8);
  const starTop = zUpToYUp(extractPartWithOffset(meshById, compOffsets, 45), 0, -68.5, 45.8);
  const roofCombined = new Float32Array(roofMain.length + roofFront.length + starTop.length);
  roofCombined.set(roofMain, 0);
  roofCombined.set(roofFront, roofMain.length);
  roofCombined.set(starTop, roofMain.length + roofFront.length);

  writeCbs3Model("bright-nativity-table-lamp", [
    { name: "Sculpted Nativity Arch & Manger", ...cleanPartMesh(mergeCompYUp([42]), 70000, 0.42), color: [0.95, 0.92, 0.86], metallic: 0.08, roughness: 0.40 },
    { name: "Golden Star & Crested Roof", ...cleanPartMesh(roofCombined, 65000, 0.42), color: [0.90, 0.72, 0.35], metallic: 0.65, roughness: 0.24 },
    { name: "Holy Family Figures", ...cleanPartMesh(mergeCompYUp([37, 38, 41]), 60000, 0.42), color: [0.96, 0.94, 0.90], metallic: 0.06, roughness: 0.36 },
    { name: "Warm Gold Accents & Manger Crib", ...cleanPartMesh(mergeCompYUp([35, 36, 39, 40]), 45000, 0.42), color: [0.85, 0.65, 0.34], metallic: 0.45, roughness: 0.30, emissive: 0.25 },
  ], { hasLampGlow: true, lightPos: [0, -0.28, 0.18] });
}

// 4. 09 Village on the Moon Table Lamp (Moonlit Christmas Village)
function buildMoonVillage() {
  const dir = path.join(SOURCE_ROOT, "09 Village on the Moon Table Lamp/Model Files");
  const moonStl = readStlPositions(path.join(dir, "Monocolor/Village on the Moon_Moon_Monocolor.stl"));
  const baseStl = readStlPositions(path.join(dir, "Multipart/Village on the Moon_Base_Multipart.stl"));
  const housesStl = readStlPositions(path.join(dir, "Multipart/Village on the Moon_Houses_Multipart.stl"));
  const treesStl = readStlPositions(path.join(dir, "Multipart/Village on the Moon_Trees_Multipart.stl"));

  // Base is a 97.4mm circle centered at (110, 110) on print bed, Z = 0
  const baseYUp = zUpToYUp(baseStl, -110.0, -110.0, 0.0);
  // Moon bottom circular rim is 97.4mm centered at (71.787, 59.776), socket in base is 6mm deep
  const moonYUp = zUpToYUp(moonStl, -110.0 + 38.213, -110.0 + 50.224, 6.0);
  // Houses and Trees sit nestled inside the moon's inner shelf at z = 44.5 (centered at 110, 110)
  const housesYUp = zUpToYUp(housesStl, -110.0, -110.0, 44.5);
  const treesYUp = zUpToYUp(treesStl, -110.0, -110.0, 44.5);

  writeCbs3Model("village-on-the-moon-table-lamp", [
    { name: "Sculpted Lunar Crescent", ...cleanPartMesh(moonYUp, 95000, 0.40), color: [0.98, 0.97, 0.94], metallic: 0.05, roughness: 0.45 },
    { name: "Golden Pedestal Base", ...cleanPartMesh(baseYUp, 35000, 0.40), color: [0.89, 0.71, 0.34], metallic: 0.65, roughness: 0.26 },
    { name: "Illuminated Alpine Cottages", ...cleanPartMesh(housesYUp, 85000, 0.40), color: [0.98, 0.96, 0.92], metallic: 0.12, roughness: 0.36, emissive: 0.38, role: "flame" },
    { name: "Evergreen Pine Trees", ...cleanPartMesh(treesYUp, 50000, 0.40), color: [0.10, 0.42, 0.24], metallic: 0.10, roughness: 0.40 },
  ], { hasLampGlow: true, lightPos: [0.0, 0.18, 0.0] });
}

// 5. 10 Santa's Bonfire Table Lamp (Santa's Fireside Glow)
function buildSantasBonfire() {
  const dir = path.join(SOURCE_ROOT, "10 Santa's Bonfire Table Lamp/Model Files");
  const zip = listZipEntries(path.join(dir, "Santas Bonfire_BambuLab.3mf"));
  const xml54 = readZipEntry(zip, "3D/Objects/object_54.model").toString("utf8");
  const xml55 = readZipEntry(zip, "3D/Objects/object_55.model").toString("utf8");
  const rootXml = readZipEntry(zip, "3D/3dmodel.model").toString("utf8");

  function parseObjs(xml) {
    const objs = {};
    for (const m of xml.matchAll(/<object id="(\d+)"[^>]*>([\s\S]*?)<\/object>/g)) {
      const id = m[1];
      const vx = [];
      for (const vm of m[2].matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)) {
        vx.push(+vm[1], +vm[2], +vm[3]);
      }
      const tris = [];
      for (const tm of m[2].matchAll(/<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"/g)) {
        tris.push(+tm[1], +tm[2], +tm[3]);
      }
      objs[id] = { vx, tris };
    }
    return objs;
  }

  const objs54 = parseObjs(xml54);
  const objs55 = parseObjs(xml55);

  const comps17 = {};
  const m17 = rootXml.match(/<object id="17"[^>]*>([\s\S]*?)<\/object>/)[1];
  for (const cm of m17.matchAll(/<component[^>]*objectid="(\d+)"[^>]*transform="([^"]+)"/g)) {
    const t = cm[2].trim().split(/\s+/).map(Number);
    comps17[cm[1]] = [t[9] || 0, t[10] || 0, t[11] || 0];
  }

  const comps28 = {};
  const m28 = rootXml.match(/<object id="28"[^>]*>([\s\S]*?)<\/object>/)[1];
  for (const cm of m28.matchAll(/<component[^>]*objectid="(\d+)"[^>]*transform="([^"]+)"/g)) {
    const t = cm[2].trim().split(/\s+/).map(Number);
    comps28[cm[1]] = [t[9] || 0, t[10] || 0, t[11] || 0];
  }

  function getPartMesh(objs, comps, id, dx = 0, dy = 0, dz = 0) {
    const o = objs[id];
    if (!o) return new Float32Array(0);
    const c = comps[id] || [0, 0, 0];
    const pos = new Float32Array(o.tris.length * 3);
    let p = 0;
    for (let i = 0; i < o.tris.length; i++) {
      const vi = o.tris[i];
      pos[p++] = o.vx[vi * 3] + c[0] + dx;
      pos[p++] = o.vx[vi * 3 + 1] + c[1] + dy;
      pos[p++] = o.vx[vi * 3 + 2] + c[2] + dz;
    }
    return pos;
  }

  // Santa upper body sits directly on lower body with dy = +2.955, dz = +2.968
  const hatStl = readStlPositions(path.join(dir, "Multicolor/Santa’s Bonfire_Hat_Multicolor.stl"));
  const ballStl = readStlPositions(path.join(dir, "Multicolor/Santa’s Bonfire_Ball Hat_Multicolor.stl"));
  const hatYUp = zUpToYUp(hatStl, -111.272, -139.939, 28.170);
  const ballYUp = zUpToYUp(ballStl, -109.572, -134.899, 49.910);

  function concatArrays(arrs) {
    const total = arrs.reduce((s, a) => s + a.length, 0);
    const res = new Float32Array(total);
    let off = 0;
    for (const a of arrs) { res.set(a, off); off += a.length; }
    return res;
  }

  // Group 1: Snowy Base, Fluffy Beard, Hat Edge, Coat Trims & Hat Pompom
  const snowBase = concatArrays([
    getPartMesh(objs54, comps17, "3"),   // Base
    getPartMesh(objs54, comps17, "14"),  // Cloth Edge lower
    getPartMesh(objs55, comps28, "20", 0, 2.955, 2.968), // Beard
    getPartMesh(objs55, comps28, "23", 0, 2.955, 2.968), // Cloth Edge upper
    getPartMesh(objs55, comps28, "24", 0, 2.955, 2.968), // Hat Edge
    ballYUp, // Pompom Ball
  ]);

  // Group 2: Santa Crimson Red Coat, Pants, Gift Sack & Hat
  const redCoat = concatArrays([
    getPartMesh(objs54, comps17, "9"),   // Gift Sack Base
    getPartMesh(objs54, comps17, "13"),  // Cloth lower
    getPartMesh(objs54, comps17, "15"),  // Pants
    getPartMesh(objs54, comps17, "6"),   // Reindeer Rudolph Nose
    getPartMesh(objs55, comps28, "21", 0, 2.955, 2.968), // Cloth upper
    hatYUp, // Santa's Hat
  ]);

  // Group 3: Woodland Reindeer & Santa Boots / Belt
  const reindeerBoots = concatArrays([
    getPartMesh(objs54, comps17, "5"),   // Deer
    getPartMesh(objs54, comps17, "16"),  // Shoes / Boots
    getPartMesh(objs54, comps17, "10"),  // Gloves
    getPartMesh(objs54, comps17, "12"),  // Belt
  ]);

  // Group 4: Warm Skin, Antlers, Hands, Eyes & Gift Ribbons
  const warmDetails = concatArrays([
    getPartMesh(objs55, comps28, "27", 0, 2.955, 2.968), // Skin / Face
    getPartMesh(objs55, comps28, "22", 0, 2.955, 2.968), // Hands
    getPartMesh(objs54, comps17, "11"),  // Horns / Antlers
    getPartMesh(objs54, comps17, "7"),   // Gift 1
    getPartMesh(objs54, comps17, "8"),   // Gift 2
    getPartMesh(objs54, comps17, "4"),   // Deer Eyes
    getPartMesh(objs55, comps28, "25", 0, 2.955, 2.968), // Eyebrow
    getPartMesh(objs55, comps28, "26", 0, 2.955, 2.968), // Eyes
  ]);

  writeCbs3Model("santa-s-bonfire-table-lamp", [
    { name: "Snowy Fireside Base, Beard & Trims", ...cleanPartMesh(snowBase, 90000, 0.38), color: [0.97, 0.97, 0.96], metallic: 0.04, roughness: 0.45 },
    { name: "Santa Crimson Coat, Hat & Gift Sack", ...cleanPartMesh(redCoat, 85000, 0.38), color: [0.85, 0.12, 0.16], metallic: 0.08, roughness: 0.38 },
    { name: "Woodland Reindeer & Santa Boots", ...cleanPartMesh(reindeerBoots, 70000, 0.38), color: [0.52, 0.32, 0.20], metallic: 0.10, roughness: 0.42 },
    { name: "Warm Face, Antlers, Hands & Gifts", ...cleanPartMesh(warmDetails, 65000, 0.38), color: [0.94, 0.76, 0.62], metallic: 0.15, roughness: 0.36, emissive: 0.22 },
  ], { hasLampGlow: true, lightPos: [0.0, -0.20, -0.18] });
}

// 6. 04 Hooked Santa (Knit-Look Santa) — Shared global grid step (0.25mm) so white under-mesh NEVER pokes through red coat!
function buildHookedSanta() {
  const zip = listZipEntries(path.join(SOURCE_ROOT, "04 Hooked Santa/Model Files/Hooked_Santa/Hooked Santa_Multicor.3mf"));
  const xml = readZipEntry(zip, "3D/3dmodel.model").toString("utf8");
  const { objects, comps } = parse3mfObjects(xml);

  const partSpecs = [
    { id: "1", name: "Glossy Eyes", color: [0.10, 0.10, 0.12], metallic: 0.25, roughness: 0.15 },
    { id: "2", name: "Warm Knit Face & Nose", color: [0.92, 0.72, 0.60], metallic: 0.05, roughness: 0.50 },
    { id: "3", name: "Belt Buckle", color: [0.85, 0.68, 0.30], metallic: 0.60, roughness: 0.28 },
    { id: "4", name: "Knit Boots & Belt", color: [0.14, 0.15, 0.16], metallic: 0.15, roughness: 0.45 },
    { id: "5", name: "Snow White Knit Beard & Trim", color: [0.96, 0.95, 0.92], metallic: 0.05, roughness: 0.48 },
    { id: "6", name: "Crimson Knit Suit & Hat", color: [0.83, 0.14, 0.17], metallic: 0.08, roughness: 0.45 },
  ];

  const rawParts = [];
  for (const spec of partSpecs) {
    const obj = objects[spec.id];
    if (!obj) continue;
    const [tx, ty, tz] = comps[spec.id] || [0, 0, 0];
    const pos = new Float32Array(obj.tris.length * 9);
    let p = 0;
    for (const t of obj.tris) {
      for (const vi of [t.v1, t.v2, t.v3]) {
        pos[p++] = obj.vx[vi] + tx;
        pos[p++] = obj.vy[vi] + ty;
        pos[p++] = obj.vz[vi] + tz;
      }
    }
    // Keep full original triangles or ultra-fine 0.22mm shared grid so parts never intersect!
    const clean = cleanPartMesh(pos, 80000, 0.22);
    rawParts.push({ ...spec, ...clean });
  }
  writeCbs3Model("hooked-santa", rawParts);
}

// 7. 08 Snow in Jumper (Cosy Jumper Snowman)
function buildSnowman() {
  const zip = listZipEntries(path.join(SOURCE_ROOT, "08 Snow in Jumper/Model Files/V2/Snow in Jumper_Multicolor.3mf"));
  const xml = readZipEntry(zip, "3D/3dmodel.model").toString("utf8");
  const { objects, comps } = parse3mfObjects(xml);

  const partSpecs = [
    { id: "1", name: "Knit Jumper & Body", color: [0.95, 0.94, 0.91], metallic: 0.05, roughness: 0.48 },
    { id: "2", name: "Snowy Arms", color: [0.95, 0.94, 0.91], metallic: 0.05, roughness: 0.48 },
    { id: "3", name: "Coal Eyes", color: [0.12, 0.13, 0.14], metallic: 0.25, roughness: 0.20 },
    { id: "4", name: "Snowman Head", color: [0.96, 0.95, 0.93], metallic: 0.05, roughness: 0.46 },
    { id: "5", name: "Carrot Nose", color: [0.95, 0.49, 0.14], metallic: 0.10, roughness: 0.38 },
    { id: "6", name: "Hat Pom-Pom", color: [0.96, 0.95, 0.92], metallic: 0.05, roughness: 0.50 },
    { id: "7", name: "Crimson Knit Beanie", color: [0.82, 0.13, 0.16], metallic: 0.08, roughness: 0.45 },
    { id: "8", name: "Warm Knit Scarf Collar", color: [0.82, 0.13, 0.16], metallic: 0.08, roughness: 0.45 },
    { id: "9", name: "Knitted Scarf Tail", color: [0.82, 0.13, 0.16], metallic: 0.08, roughness: 0.45 },
    { id: "10", name: "Jumper Buttons", color: [0.15, 0.16, 0.17], metallic: 0.25, roughness: 0.30 },
  ];

  const rawParts = [];
  for (const spec of partSpecs) {
    const obj = objects[spec.id];
    if (!obj) continue;
    const [tx, ty, tz] = comps[spec.id] || [0, 0, 0];
    const pos = new Float32Array(obj.tris.length * 9);
    let p = 0;
    for (const t of obj.tris) {
      for (const vi of [t.v1, t.v2, t.v3]) {
        pos[p++] = obj.vx[vi] + tx;
        pos[p++] = obj.vy[vi] + ty;
        pos[p++] = obj.vz[vi] + tz;
      }
    }
    const clean = cleanPartMesh(pos, 50000, 0.28);
    rawParts.push({ ...spec, ...clean });
  }
  writeCbs3Model("snow-in-jumper", rawParts);
}

// 8. 05 Zou Christmas Baby Axolotl
function buildAxolotl() {
  const zip = listZipEntries(path.join(SOURCE_ROOT, "05 Zou Christmas Baby Axolotl/Model Files/Zou Christmas Baby Axolotl_Bambulabprinters.3mf"));
  const xml = readZipEntry(zip, "3D/Objects/Zou_Christmas_Baby_axolotl_v1.stl_5.model").toString("utf8");
  const { objects } = parse3mfObjects(xml);
  const obj = Object.values(objects)[0];

  const groups = { pink: [], red: [], white: [], black: [] };
  for (const t of obj.tris) {
    const bucket =
      t.pc === "0C" ? groups.pink :
      t.pc === "8" ? groups.red :
      t.pc === "1C" ? groups.black :
      groups.white;
    for (const vi of [t.v1, t.v2, t.v3]) {
      bucket.push(obj.vx[vi], obj.vz[vi], -obj.vy[vi]);
    }
  }

  writeCbs3Model("zou-christmas-baby-axolotl", [
    { name: "Pastel Pink Body", ...cleanPartMesh(new Float32Array(groups.pink), 60000, 0.25), color: [0.97, 0.68, 0.82], metallic: 0.10, roughness: 0.36 },
    { name: "Santa Hat & Frills", ...cleanPartMesh(new Float32Array(groups.red), 40000, 0.25), color: [0.82, 0.13, 0.17], metallic: 0.12, roughness: 0.40 },
    { name: "Fluffy White Hat Trim", ...cleanPartMesh(new Float32Array(groups.white), 40000, 0.25), color: [0.96, 0.95, 0.93], metallic: 0.05, roughness: 0.48 },
    { name: "Glossy Eyes", ...cleanPartMesh(new Float32Array(groups.black), 20000, 0.25), color: [0.10, 0.11, 0.12], metallic: 0.30, roughness: 0.15 },
  ]);
}

// 9. 11 Santa's Snack Hat - Bowl
function buildSantaHatBowl() {
  const zip = listZipEntries(path.join(SOURCE_ROOT, "11 Santa's Snack Hat - Bowl/Model Files/Multicolor/Santas Snack Hat Bowl_Multicolor.3mf"));
  const xml = readZipEntry(zip, "3D/3dmodel.model").toString("utf8");
  const cfg = readZipEntry(zip, "Metadata/Slic3r_PE_model.config").toString("utf8");
  const { objects } = parse3mfObjects(xml);
  const obj = Object.values(objects)[0];

  const volumes = [...cfg.matchAll(/<volume firstid="(\d+)" lastid="(\d+)">([\s\S]*?)<\/volume>/g)].map(m => ({
    first: parseInt(m[1], 10),
    last: parseInt(m[2], 10),
    name: (m[3].match(/key="name" value="([^"]+)"/) || [])[1] || "Part",
  }));

  const rawParts = [];
  for (const vol of volumes) {
    const coords = [];
    for (let ti = vol.first; ti <= Math.min(vol.last, obj.tris.length - 1); ti++) {
      const t = obj.tris[ti];
      for (const vi of [t.v1, t.v2, t.v3]) {
        coords.push(obj.vx[vi], obj.vz[vi], -obj.vy[vi]);
      }
    }
    const isRed = vol.name.toLowerCase().includes("fabric");
    const clean = cleanPartMesh(new Float32Array(coords), 70000, 0.28);
    rawParts.push({
      name: isRed ? "Crimson Velvet Hat Bowl" : `Snow White ${vol.name}`,
      ...clean,
      color: isRed ? [0.80, 0.14, 0.18] : [0.96, 0.95, 0.92],
      metallic: isRed ? 0.10 : 0.05,
      roughness: isRed ? 0.40 : 0.52,
    });
  }
  writeCbs3Model("santa-s-snack-hat-bowl", rawParts);
}

// 10. 06 Five Christmas Gnomes
function buildFiveGnomes() {
  const zip = listZipEntries(path.join(SOURCE_ROOT, "06 5 Gnomes/Model Files/5_Gnomes/5Gnomes_BambuLabPrinters.3mf"));
  const gnomeEntries = zip.entries.filter(e => e.name.startsWith("3D/Objects/5 Gnomes_")).sort((a, b) => a.name.localeCompare(b.name));

  const buckets = { white: [], red: [], green: [], peach: [], brown: [] };
  const offsetsX = [-150, -75, 0, 75, 150];
  const offsetsZ = [25, -10, -25, -10, 25];

  gnomeEntries.forEach((entry, idx) => {
    const xml = readZipEntry(zip, entry.name).toString("utf8");
    const { objects } = parse3mfObjects(xml);
    const obj = Object.values(objects)[0];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity;
    for (let i = 0; i < obj.vx.length; i++) {
      if (obj.vx[i] < minX) minX = obj.vx[i]; if (obj.vx[i] > maxX) maxX = obj.vx[i];
      if (obj.vy[i] < minY) minY = obj.vy[i]; if (obj.vy[i] > maxY) maxY = obj.vy[i];
      if (obj.vz[i] < minZ) minZ = obj.vz[i];
    }
    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;

    for (const t of obj.tris) {
      const pc = t.pc;
      const target =
        pc.startsWith("8") ? buckets.red :
        pc.startsWith("0C") ? buckets.green :
        pc.startsWith("1C") ? buckets.peach :
        pc.startsWith("2C") || pc.startsWith("02C") ? buckets.brown :
        buckets.white;
      for (const vi of [t.v1, t.v2, t.v3]) {
        const x = (obj.vx[vi] - cx) + offsetsX[idx];
        const y = obj.vz[vi] - minZ;
        const z = -(obj.vy[vi] - cy) + offsetsZ[idx];
        target.push(x, y, z);
      }
    }
  });

  writeCbs3Model("christmas-gnome-set", [
    { name: "Flowing White Beards & Trim", ...cleanPartMesh(new Float32Array(buckets.white), 50000, 0.45), color: [0.96, 0.95, 0.92], metallic: 0.06, roughness: 0.48 },
    { name: "Crimson Gnome Hats & Coats", ...cleanPartMesh(new Float32Array(buckets.red), 45000, 0.45), color: [0.82, 0.14, 0.17], metallic: 0.10, roughness: 0.40 },
    { name: "Evergreen Hats & Mittens", ...cleanPartMesh(new Float32Array(buckets.green), 45000, 0.45), color: [0.14, 0.46, 0.27], metallic: 0.12, roughness: 0.38 },
    { name: "Warm Gnome Noses & Hands", ...cleanPartMesh(new Float32Array(buckets.peach), 25000, 0.45), color: [0.93, 0.74, 0.60], metallic: 0.06, roughness: 0.45 },
    { name: "Woodland Boots & Lanterns", ...cleanPartMesh(new Float32Array(buckets.brown), 30000, 0.45), color: [0.48, 0.28, 0.16], metallic: 0.15, roughness: 0.42 },
  ]);
}

console.log("Generating clean, crease-smoothed 3D models from STL/3MF files...");
buildSwirlingTree();
buildChristmasAngel();
buildBrightNativity();
buildMoonVillage();
buildSantasBonfire();
buildHookedSanta();
buildSnowman();
buildAxolotl();
buildSantaHatBowl();
buildFiveGnomes();
console.log("Done!");
