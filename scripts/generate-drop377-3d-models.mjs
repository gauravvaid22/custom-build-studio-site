import fs from "fs";
import path from "path";
import zlib from "zlib";

const DROP_ROOT = "local-product-sources/christmas-drop-377/models";
const OUT_ROOT = "public/media/shop";

function listZipEntries(filePath) {
  const buf = typeof filePath === "string" ? fs.readFileSync(filePath) : filePath;
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("Invalid 3MF zip");
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
  if (!entry) return null;
  const { buf } = zip;
  const lh = entry.localHeaderOffset;
  const nameLen = buf.readUInt16LE(lh + 26);
  const extraLen = buf.readUInt16LE(lh + 28);
  const dataStart = lh + 30 + nameLen + extraLen;
  const comp = buf.subarray(dataStart, dataStart + entry.compSize);
  return entry.method === 0 ? comp : zlib.inflateRawSync(comp);
}

function parseBinaryStl(buf) {
  const numTris = buf.readUInt32LE(80);
  const pos = new Float32Array(numTris * 9);
  let offset = 84;
  let p = 0;
  for (let i = 0; i < numTris; i++) {
    offset += 12;
    for (let j = 0; j < 9; j++) {
      pos[p++] = buf.readFloatLE(offset);
      offset += 4;
    }
    offset += 2;
  }
  return pos;
}

function parseSlic3r3mf(zipPath, orientation = "z-up") {
  const zip = listZipEntries(zipPath);
  const xmlBuf = readZipEntry(zip, "3D/3dmodel.model");
  if (!xmlBuf) throw new Error("No 3dmodel.model in " + zipPath);
  const xml = xmlBuf.toString("utf8");

  const vx = [], vy = [], vz = [];
  for (const vm of xml.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)) {
    vx.push(parseFloat(vm[1]));
    vy.push(parseFloat(vm[2]));
    vz.push(parseFloat(vm[3]));
  }

  const t1 = [], t2 = [], t3 = [];
  for (const tm of xml.matchAll(/<triangle\s+([^>]+)>/g)) {
    const attrs = tm[1];
    t1.push(parseInt((attrs.match(/v1="(\d+)"/) || [])[1], 10));
    t2.push(parseInt((attrs.match(/v2="(\d+)"/) || [])[1], 10));
    t3.push(parseInt((attrs.match(/v3="(\d+)"/) || [])[1], 10));
  }

  const cfgBuf = readZipEntry(zip, "Metadata/Slic3r_PE_model.config");
  const volumes = [];
  if (cfgBuf) {
    const cfgXml = cfgBuf.toString("utf8");
    for (const vm of cfgXml.matchAll(/<volume[^>]+>([\s\S]*?)<\/volume>/g)) {
      const vtag = vm[0];
      const vbody = vm[1];
      const fid = parseInt((vtag.match(/firstid="(\d+)"/) || [])[1], 10);
      const lid = parseInt((vtag.match(/lastid="(\d+)"/) || [])[1], 10);
      const name = (vbody.match(/key="name" value="([^"]+)"/) || [0, "Volume"])[1];
      volumes.push({ name, fid, lid });
    }
  }

  if (!volumes.length) {
    volumes.push({ name: "Model", fid: 0, lid: t1.length - 1 });
  }

  const parts = [];
  for (const vol of volumes) {
    const count = vol.lid - vol.fid + 1;
    const pos = new Float32Array(count * 9);
    let p = 0;

    for (let ti = vol.fid; ti <= vol.lid && ti < t1.length; ti++) {
      for (const vi of [t1[ti], t2[ti], t3[ti]]) {
        const x = vx[vi];
        let y, z;
        if (orientation === "y-up") {
          // Native CAD orientation: Y is vertical height
          y = vy[vi];
          z = vz[vi];
        } else {
          // In Z-up 3MF, coordinates have Z as vertical height.
          // Convert to standard WebGL Y-up: Y = Z_3mf, Z = -Y_3mf
          y = vz[vi];
          z = -vy[vi];
        }
        pos[p++] = x;
        pos[p++] = y;
        pos[p++] = z;
      }
    }
    parts.push({ name: vol.name, positions: pos.subarray(0, p), triCount: p / 9 });
  }

  return parts;
}

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

function cleanPartMesh(positions, maxTargetTris = 90000, globalStep = 0) {
  const numVerts = positions.length / 3;
  const numTris = numVerts / 3;
  if (numTris === 0) return { verts: new Float32Array(0), norms: new Float32Array(0) };

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

  const clusterCentroids = new Float32Array(sumX.length * 3);
  for (let i = 0; i < sumX.length; i++) {
    const invC = 1 / counts[i];
    clusterCentroids[i * 3] = sumX[i] * invC;
    clusterCentroids[i * 3 + 1] = sumY[i] * invC;
    clusterCentroids[i * 3 + 2] = sumZ[i] * invC;
  }

  const outCoords = [];
  for (let t = 0; t < numTris; t++) {
    const c0 = vertCluster[t * 3];
    const c1 = vertCluster[t * 3 + 1];
    const c2 = vertCluster[t * 3 + 2];
    if (c0 === c1 || c1 === c2 || c2 === c0) continue;
    outCoords.push(
      clusterCentroids[c0 * 3], clusterCentroids[c0 * 3 + 1], clusterCentroids[c0 * 3 + 2],
      clusterCentroids[c1 * 3], clusterCentroids[c1 * 3 + 1], clusterCentroids[c1 * 3 + 2],
      clusterCentroids[c2 * 3], clusterCentroids[c2 * 3 + 1], clusterCentroids[c2 * 3 + 2]
    );
  }

  return computeCreaseNormals(new Float32Array(outCoords));
}

function writeCbs3Model(productId, rawParts, meta = {}) {
  let totalVerts = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const part of rawParts) {
    totalVerts += part.verts.length / 3;
    for (let i = 0; i < part.verts.length; i += 3) {
      const x = part.verts[i], y = part.verts[i + 1], z = part.verts[i + 2];
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
  console.log(`✓ Saved ${productId}/model-3d.bin (${(finalBuf.length / 1024).toFixed(1)} KB, ${totalVerts / 3} tris, ${headerParts.length} parts)`);
}

// ==========================================
// 1. CHRISTMAS TREE TRINKET TRAY
// ==========================================
function buildChristmasTreeTray() {
  const f = path.join(DROP_ROOT, "christmas-tree-tray/Multicolor/Christmas Tree Tray_Multicolor.3mf");
  const parts = parseSlic3r3mf(f);
  const treeVol = parts.find(p => p.name.toLowerCase().includes("tree")) || parts[0];
  const detailsVol = parts.find(p => p.name.toLowerCase().includes("detail")) || parts[1];

  writeCbs3Model("christmas-tree-tray", [
    {
      name: "Forest Alpine Green Tray",
      ...cleanPartMesh(treeVol.positions, 30000),
      color: [0.14, 0.32, 0.22], // #244D38
      metallic: 0.10,
      roughness: 0.48,
    },
    {
      name: "Silk Metallic Gold Fluted Accents",
      ...cleanPartMesh(detailsVol.positions, 65000),
      color: [0.84, 0.68, 0.22], // #D4AF37
      metallic: 0.65,
      roughness: 0.26,
    },
  ]);
}

// ==========================================
// 2. EVERGREEN CHRISTMAS WREATH
// ==========================================
function buildEvergreenWreath() {
  const f = path.join(DROP_ROOT, "evergreen-wreath/Multicolor/Evergreen Wreath_Multicolor.3mf");
  const parts = parseSlic3r3mf(f);

  const starsVol = parts.find(p => p.name.toLowerCase().includes("star"));
  const tieVol = parts.find(p => p.name.toLowerCase().includes("tie"));
  const wreathVol = parts.find(p => p.name.toLowerCase().includes("wreath"));
  const ballsVol = parts.find(p => p.name.toLowerCase().includes("ball"));

  writeCbs3Model("evergreen-wreath", [
    {
      name: "Deep Pine Needles Wreath Ring",
      ...cleanPartMesh(wreathVol.positions, 48000),
      color: [0.12, 0.28, 0.13], // #1E4620
      metallic: 0.08,
      roughness: 0.52,
    },
    {
      name: "Satin Crimson Bow Ribbon",
      ...cleanPartMesh(tieVol.positions, 38000),
      color: [0.65, 0.11, 0.14], // #A31D24
      metallic: 0.22,
      roughness: 0.34,
    },
    {
      name: "Silk Champagne Stars",
      ...cleanPartMesh(starsVol.positions, 26000),
      color: [0.88, 0.74, 0.32], // #E2C268
      metallic: 0.68,
      roughness: 0.24,
    },
    {
      name: "Gloss Cranberry Baubles",
      ...cleanPartMesh(ballsVol.positions, 28000),
      color: [0.77, 0.13, 0.15], // #C42026
      metallic: 0.35,
      roughness: 0.18,
    },
  ]);
}

// ==========================================
// 3. GUIDING STAR CHRISTMAS TREE TOPPER
// ==========================================
function buildGuidingStarTreeTopper() {
  const mainZip = listZipEntries(path.join(DROP_ROOT, "guiding-star-tree-topper/Guiding_Star_Tree_Topper_c3845f08ec.zip"));

  const baseStl = parseBinaryStl(readZipEntry(mainZip, "Multipart/Guiding Star-Large_Base_Multipart.stl"));
  const frontStl = parseBinaryStl(readZipEntry(mainZip, "Multipart/Guiding Star-Large_Front_Multipart.stl"));
  const backStl = parseBinaryStl(readZipEntry(mainZip, "Multipart/Guiding Star-Large_Back_Multipart.stl"));
  const midFrontStl = parseBinaryStl(readZipEntry(mainZip, "Multipart/Guiding Star-Large_Middle_Front_Multipart.stl"));
  const midBackStl = parseBinaryStl(readZipEntry(mainZip, "Multipart/Guiding Star-Large_Middle_Back_Multipart.stl"));

  // Base center: cx = 411.826, cy = 382.048, top z = 128.8
  const basePos = new Float32Array(baseStl.length);
  for (let i = 0; i < baseStl.length; i += 3) {
    basePos[i] = baseStl[i] - 411.826;
    basePos[i + 1] = baseStl[i + 2]; // Z becomes Y-up
    basePos[i + 2] = -(baseStl[i + 1] - 382.048);
  }

  // Front & Back star shells + Middle Front & Middle Back gold lattice
  // In STL, the star is flat on the print bed with Y as vertical height spanning 118.3 mm.
  // Seated directly in the base socket at Y = 124.0 mm (4mm socket insertion depth), top reaches Y = 246 mm
  const frontYUp = new Float32Array(frontStl.length);
  for (let i = 0; i < frontStl.length; i += 3) {
    frontYUp[i] = frontStl[i] - 188.489;
    frontYUp[i + 1] = (frontStl[i + 1] - 363.492) + 124.0;
    frontYUp[i + 2] = frontStl[i + 2] - 7.757;
  }

  const backYUp = new Float32Array(backStl.length);
  for (let i = 0; i < backStl.length; i += 3) {
    backYUp[i] = backStl[i] - 142.170;
    backYUp[i + 1] = (backStl[i + 1] - 88.269) + 124.0;
    backYUp[i + 2] = -(backStl[i + 2] - 7.757);
  }

  const midFrontYUp = new Float32Array(midFrontStl.length);
  for (let i = 0; i < midFrontStl.length; i += 3) {
    midFrontYUp[i] = midFrontStl[i] - 508.947;
    midFrontYUp[i + 1] = (midFrontStl[i + 1] - 40.858) + 124.0;
    midFrontYUp[i + 2] = midFrontStl[i + 2] - 6.993;
  }

  const midBackYUp = new Float32Array(midBackStl.length);
  for (let i = 0; i < midBackStl.length; i += 3) {
    midBackYUp[i] = midBackStl[i] - 231.766;
    midBackYUp[i + 1] = (midBackStl[i + 1] - (-2.887)) + 124.0;
    midBackYUp[i + 2] = -(midBackStl[i + 2] - 6.970);
  }

  // Combine white outer framing vs gold inner core into ONE unified solid connected model
  const whiteShells = new Float32Array(basePos.length + frontYUp.length + backYUp.length);
  whiteShells.set(basePos, 0);
  whiteShells.set(frontYUp, basePos.length);
  whiteShells.set(backYUp, basePos.length + frontYUp.length);

  const goldCore = new Float32Array(midFrontYUp.length + midBackYUp.length);
  goldCore.set(midFrontYUp, 0);
  goldCore.set(midBackYUp, midFrontYUp.length);

  writeCbs3Model("guiding-star-tree-topper", [
    {
      name: "Warm Ivory Spiral Base & Geometric Star Frame",
      ...cleanPartMesh(whiteShells, 55000),
      color: [0.95, 0.94, 0.91], // #F4F1EA
      metallic: 0.12,
      roughness: 0.38,
    },
    {
      name: "Silk Golden Core Lattice",
      ...cleanPartMesh(goldCore, 55000),
      color: [0.87, 0.66, 0.22], // #DDA73A
      metallic: 0.72,
      roughness: 0.22,
    },
  ]);
}

// ==========================================
// 4. HEAVENLY TRIO ANGEL FIGURINE
// ==========================================
// Generates a single unified, connected Angel model (Angel holding Guiding Star)
// with feathered wings attached and gold emblem held in hands.
function buildHeavenlyTrio() {
  const starParts = parseSlic3r3mf(path.join(DROP_ROOT, "heavenly-trio/Multicolor/Heavenly Trio-Star_Multicolor.3mf"), "z-up");
  const bodyVol = starParts.find(p => p.name.toLowerCase().includes("angel")) || starParts[0];
  const starVol = starParts.find(p => p.name.toLowerCase().includes("star")) || starParts[1];
  const wingsVol = starParts.find(p => p.name.toLowerCase().includes("wing")) || starParts[2];

  writeCbs3Model("heavenly-trio", [
    {
      name: "Porcelain Ivory Angel Robes",
      ...cleanPartMesh(bodyVol.positions, 50000),
      color: [0.98, 0.97, 0.95], // #FAF8F5
      metallic: 0.06,
      roughness: 0.44,
    },
    {
      name: "Feathered Warm Cream Pearl Wings",
      ...cleanPartMesh(wingsVol.positions, 42000),
      color: [0.94, 0.92, 0.88], // #F2ECE1
      metallic: 0.15,
      roughness: 0.38,
    },
    {
      name: "Silk Golden Guiding Star",
      ...cleanPartMesh(starVol.positions, 25000),
      color: [0.85, 0.67, 0.23], // #D8AC3A
      metallic: 0.70,
      roughness: 0.22,
    },
  ]);
}

// ==========================================
// 5. HOLY FAMILY NATIVITY SCULPTURE
// ==========================================
function buildHolyFamilyEmbrace() {
  const parts = parseSlic3r3mf(path.join(DROP_ROOT, "holy-family-embrace/Multicolor/Holy Family Embrace_Multicolor.3mf"), "y-up");

  const embraceVol = parts.find(p => p.name.toLowerCase().includes("holy family"));
  const cradleVol = parts.find(p => p.name.toLowerCase().includes("cradle"));
  const crownJesus = parts.find(p => p.name.toLowerCase().includes("crown jesus"));
  const crownJose = parts.find(p => p.name.toLowerCase().includes("crown jose"));
  const headVol = parts.find(p => p.name.toLowerCase().includes("head"));

  // Combine crowns/halos
  const totalCrownTris = (crownJesus?.positions.length || 0) + (crownJose?.positions.length || 0) + (headVol?.positions.length || 0);
  const crownsPos = new Float32Array(totalCrownTris);
  let off = 0;
  if (crownJesus) { crownsPos.set(crownJesus.positions, off); off += crownJesus.positions.length; }
  if (crownJose) { crownsPos.set(crownJose.positions, off); off += crownJose.positions.length; }
  if (headVol) { crownsPos.set(headVol.positions, off); off += headVol.positions.length; }

  writeCbs3Model("holy-family-embrace", [
    {
      name: "Sculptural Alabaster Embrace",
      ...cleanPartMesh(embraceVol.positions, 55000),
      color: [0.96, 0.95, 0.93], // #F6F3ED
      metallic: 0.05,
      roughness: 0.46,
    },
    {
      name: "Warm Natural Cedar Manger",
      ...cleanPartMesh(cradleVol.positions, 25000),
      color: [0.64, 0.46, 0.28], // #A37547
      metallic: 0.06,
      roughness: 0.58,
    },
    {
      name: "Polished Gold Halos & Headdress",
      ...cleanPartMesh(crownsPos, 35000),
      color: [0.84, 0.67, 0.23], // #D6AA3B
      metallic: 0.74,
      roughness: 0.20,
    },
  ]);
}

// ==========================================
// 6. LUMINOUS CHRISTMAS TREE LED LANTERNS (1, 2, 3)
// ==========================================
function buildLuminousTreeVariants() {
  const treeConfigs = [
    { id: "luminous-tree", file: "Luminous Tree-1_Multicolor.3mf", label: "Star Pierced Pattern" },
    { id: "luminous-tree-stars", file: "Luminous Tree-2_Multicolor.3mf", label: "Snowflake Baubles Pattern" },
    { id: "luminous-tree-spiral", file: "Luminous Tree-3_Multicolor.3mf", label: "Spiral Ribbons Pattern" },
  ];

  for (const tc of treeConfigs) {
    const f = path.join(DROP_ROOT, "luminous-tree/Multicolor", tc.file);
    const parts = parseSlic3r3mf(f);

    const treeVol = parts.find(p => p.name.toLowerCase().includes("tree")) || parts[0];
    const starVol = parts.find(p => p.name.toLowerCase().includes("star")) || parts[1];
    const detailsVol = parts.find(p => p.name.toLowerCase().includes("detail") || p.name.toLowerCase().includes("ball"));

    const rawParts = [
      {
        name: "Translucent White Pine Shell",
        ...cleanPartMesh(treeVol.positions, 48000),
        color: [0.95, 0.93, 0.90], // #F3EFE6
        metallic: 0.08,
        roughness: 0.42,
        emissive: 0.32, // Captures warm internal transmission when tealight is ON
      },
    ];

    if (starVol) {
      rawParts.push({
        name: "Silk Radiance Crown Star",
        ...cleanPartMesh(starVol.positions, 22000),
        color: [0.85, 0.67, 0.23], // #D8AC3A
        metallic: 0.70,
        roughness: 0.22,
        emissive: 0.0,
      });
    }

    if (detailsVol) {
      rawParts.push({
        name: "Holiday Gold Ribbons & Accents",
        ...cleanPartMesh(detailsVol.positions, 24000),
        color: [0.85, 0.67, 0.23],
        metallic: 0.68,
        roughness: 0.24,
        emissive: 0.0,
      });
    }

    // Point light positioned strictly inside the base cavity (lightPos in normalized coords)
    writeCbs3Model(tc.id, rawParts, {
      hasLampGlow: true,
      lightPos: [0, -0.32, 0],
    });
  }
}

// ==========================================
// 7. SNOWFLAKE CHRISTMAS TRINKET TRAY
// ==========================================
function buildSnowflakeTray() {
  const f = path.join(DROP_ROOT, "snowflake-tray/Multicolor/Snowflake Tray_Multicolor.3mf");
  const parts = parseSlic3r3mf(f);
  const snowVol = parts.find(p => p.name.toLowerCase().includes("snow")) || parts[0];
  const detailVol = parts.find(p => p.name.toLowerCase().includes("detail")) || parts[1];

  writeCbs3Model("snowflake-tray", [
    {
      name: "Festive Alpine Green Basin",
      ...cleanPartMesh(snowVol.positions, 28000),
      color: [0.14, 0.32, 0.22], // #244D38
      metallic: 0.10,
      roughness: 0.48,
    },
    {
      name: "Silk Silver-White Crystalline Ribs",
      ...cleanPartMesh(detailVol.positions, 55000),
      color: [0.94, 0.95, 0.97], // #F0F4F8
      metallic: 0.45,
      roughness: 0.28,
    },
  ]);
}

// ==========================================
// 8. CHRISTMAS STOCKING TRINKET TRAY
// ==========================================
function buildStockingTray() {
  const f = path.join(DROP_ROOT, "stocking-tray/Multicolor/Stocking Tray_Multicolor.3mf");
  const parts = parseSlic3r3mf(f);
  const bootVol = parts.find(p => p.name.toLowerCase().includes("half")) || parts[0];
  const detailVol = parts.find(p => p.name.toLowerCase().includes("detail")) || parts[1];

  writeCbs3Model("stocking-tray", [
    {
      name: "Holiday Crimson Red Stocking Bowl",
      ...cleanPartMesh(bootVol.positions, 24000),
      color: [0.69, 0.12, 0.15], // #B11E26
      metallic: 0.10,
      roughness: 0.40,
    },
    {
      name: "Fluffy Snow White Cuff, Heel & Toe",
      ...cleanPartMesh(detailVol.positions, 48000),
      color: [0.97, 0.97, 0.96], // #F7F7F6
      metallic: 0.05,
      roughness: 0.48,
    },
  ]);
}

// ==========================================
// 9. CHRISTMAS VILLAGE LED HOUSE
// ==========================================
// Generates a single connected, unified Alpine Chalet model with snow-frosted gables,
// timber & stone cottage walls, spruce door garland, and internal tea light cavity.
function buildVillageLights() {
  const h1Parts = parseSlic3r3mf(path.join(DROP_ROOT, "village-lights/Multicolor/Village Lights-H_1_CR2032_Multicolor.3mf"), "y-up");

  const h1House = h1Parts.find(p => p.name.toLowerCase().includes("house")) || h1Parts[0];
  const h1Garland = h1Parts.find(p => p.name.toLowerCase().includes("garland")) || h1Parts[1];
  const h1Roof = h1Parts.find(p => p.name.toLowerCase().includes("roof")) || h1Parts[2];

  writeCbs3Model("village-lights", [
    {
      name: "Alpine Timber & Stone Cottage Walls",
      ...cleanPartMesh(h1House.positions, 52000),
      color: [0.90, 0.87, 0.81], // #E6DDD0
      metallic: 0.05,
      roughness: 0.52,
      emissive: 0.22, // Illuminates realistically when internal lamp is lit
    },
    {
      name: "Snow-Frosted Gabled Roofs",
      ...cleanPartMesh(h1Roof.positions, 45000),
      color: [0.98, 0.98, 0.96], // #FCFAF6
      metallic: 0.05,
      roughness: 0.38,
      emissive: 0.0,
    },
    {
      name: "Evergreen Spruce Door Garlands",
      ...cleanPartMesh(h1Garland.positions, 20000),
      color: [0.15, 0.32, 0.20], // #275034
      metallic: 0.08,
      roughness: 0.50,
      emissive: 0.0,
    },
  ], {
    hasLampGlow: true,
    lightPos: [0, -0.22, 0], // Point light placed inside the central ground chamber
  });
}

console.log("Generating 3D binary models for Christmas Drop 377...");
buildChristmasTreeTray();
buildEvergreenWreath();
buildGuidingStarTreeTopper();
buildHeavenlyTrio();
buildHolyFamilyEmbrace();
buildLuminousTreeVariants();
buildSnowflakeTray();
buildStockingTray();
buildVillageLights();
console.log("Drop 377 3D models generated successfully!");
