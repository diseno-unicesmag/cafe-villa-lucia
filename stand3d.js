/* ==================================================================
   Café Villa Lucía · Modelo 3D del stand
   «La casa de tapia deconstruida» — tableros planos que encajan en
   seco: esquinas en cremallera, dientes que atraviesan mesón y losa, losas
   unidas con dientes y cumbreras dentadas. Sin tornillos.

   Geometría medida sobre el modelo de referencia del diseño
   (recursos_entrada/04_renders/modelo_ia_tripo.glb + render_madre.jpg):
   planos, espesores y pendientes se tomaron de cortes del GLB.
   Las cotas internas están en «unidades de medición» (GLB × 3,43);
   la escala real se ajusta con K para que el mesón quede a 1,00 m.

   Ejes: x = ancho (izq → der), y = alto,
   z = fondo (0 = parte trasera, + hacia el pasillo ferial).
   ================================================================== */
(function () {
  'use strict';
  const T = window.THREE;
  if (!T) { window.Stand3D = null; return; }

  /* ---------------- medidas del diseño (unidades de medición) ---------------- */
  /* Escala real: un mueble-stand de feria de ~2 m de frente. La losa (1,740) queda como mostrador a ~1,02 m
     y el mesón (0,920) como repisa de exhibición a ~0,54 m. K0 es la escala con la que se encuadraron las cámaras. */
  const K = 1.0 / 1.70, K0 = 1.0 / 0.920;
  const E = 0.018 / K;                 // espesor único de tablero: triplex de pino radiata de 18 mm
  const A = 45 * Math.PI / 180;        // pendiente 45°: los faldones se encuentran a 90° en la cumbrera
  const CA = Math.cos(A), SA = Math.sin(A);
  const Y_MES = [0.920 - E, 0.920];    // mesón (cara superior a 1,00 m)
  const Y_LOS = [1.740 - E, 1.740];    // losa continua
  /* Tres modelos de diente, y el stand dimensionado para que cada canto sea un múltiplo exacto:
       TW = alto del mesón / 7   → muros, esquinas, mesón, alféizar, losas, postes
       TS = (E + TW) / 3         → piezas esbeltas: hastiales, postes y T contra el techo, poste del muro
       TR = ancho del techo / 15 → cumbreras, limahoya y labio (cantos de todo el ancho del techo) */
  const TW = Y_MES[0] / 7, TS = (E + TW) / 3;
  const X_MURO = [1.637, 1.637 + E];   // muro de la casa (puerta + ventana)
  const X_BOD = [3.361 - 8 * TW, 3.361];           // bodega: poste 3·TW + frente libre 5·TW
  const Z_MOD = [0.025, 0.025 + E + 10 * TW];      // fondo: frente E + costado libre 7·TW + poste 3·TW
  const X_CUB = [0.005, X_MURO[1]];        // ancho de ambas cubiertas: del pilar en L a la cara exterior del muro
  const X_ALE = X_CUB;                 // el alero es el mismo módulo: mismo ancho, centrado con la cubierta mayor
  const TR = (X_CUB[1] - X_CUB[0]) / 15;
  const H_T = 9 * TS * SA;             // altura de los hastiales: cada lado inclinado mide 9·TS
  const L_SL = 3 * TS * SA;            // tramo inclinado de los postes contra el techo: 3·TS (proyección en z)
  // En cada canto todos los tramos son iguales: nº impar de tramos, el más cercano al modelo de diente.
  function segB(L, tw = TW) {
    let n = 3;                                                        // impar con el tramo más parecido a tw
    for (let k = 5; k < 99; k += 2) if (Math.abs(L / k - tw) < Math.abs(L / n - tw)) n = k;
    const b = [];
    for (let j = 0; j <= n; j++) b.push(L * j / n);
    return b;
  }
  const segIdx = (B, u) => { let i = 0; while (i < B.length - 2 && u >= B[i + 1]) i++; return i; };
  // anclas: aleros (arista inferior) y limahoya entre cubiertas
  // alero trasero: su arista inferior cae justo en la cara trasera de los postes
  // (ambos aleros se ubican para que hastiales y postes contra el techo midan múltiplos exactos de TS)
  // limahoya: las caras inferiores de ambos techos se cortan sobre la losa, un espesor E antes de su borde,
  // así el alero y su triángulo apoyan de verdad en la losa (no solo en la arista)
  const VALLEY = { z: Z_MOD[1] - E, y: Y_LOS[1] };
  const EAVE_F = { z: 2 * H_T + VALLEY.z + Y_LOS[1] - 1.627, y: 1.627 };
  const EAVE_T = { z: Z_MOD[0], y: Y_LOS[1] + (VALLEY.z - Z_MOD[0]) - 2 * (L_SL + H_T) };
  // planos de cubierta: n·(z, y) = d, con n = (±sen A, cos A); todos separados exactamente un espesor E
  const PL = (() => {
    const cuTb = -SA * EAVE_T.z + CA * EAVE_T.y, cuFb = SA * VALLEY.z + CA * VALLEY.y;
    const alTb = -SA * VALLEY.z + CA * VALLEY.y, alFb = SA * EAVE_F.z + CA * EAVE_F.y;
    return {
      cuF: { top: cuFb + E, bot: cuFb }, cuT: { top: cuTb + E, bot: cuTb },      // cubierta mayor
      alF: { top: alFb + E, bot: alFb }, alT: { top: alTb + E, bot: alTb }       // alero frontal
    };
  })();

  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const AX = { X: V3(1, 0, 0), Y: V3(0, 1, 0), Z: V3(0, 0, 1), nX: V3(-1, 0, 0), nZ: V3(0, 0, -1) };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };

  /* Base ortonormal (U, V en el plano de la pieza; W = U×V = espesor) */
  function basis(U, V, O) {
    const W = new T.Vector3().crossVectors(U, V);
    return new T.Matrix4().makeBasis(U, V, W).setPosition(O);
  }
  const mXY = (x, y, z) => basis(AX.X, AX.Y, V3(x, y, z));   // tablero frontal (espesor +z)
  const mZY = (x, y, z) => basis(AX.nZ, AX.Y, V3(x, y, z));  // tablero lateral (u hacia −z, espesor +x)
  const mH = (x, y, z) => basis(AX.X, AX.nZ, V3(x, y, z));   // placa horizontal (v hacia −z, espesor +y)
  const R = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
  const rect = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

  /* ---------- contorno con dientes ----------
     verts: polígono CCW. specs[i] describe el borde verts[i] → verts[i+1]:
       { n: segmentos, ph: paridad desplazada, d: profundidad (+ hacia adentro = muesca,
         − hacia afuera = diente), into: pieza que recibe los dientes (mortajas) } */
  function outline(verts, specs) {
    const n = verts.length, pts = [];
    const Ed = verts.map((a, i) => {
      const b = verts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      const s = specs && specs[i];
      const fin = !!s && !s.cuts;
      return {
        a, L, ux: dx / L, uy: dy / L, nx: -dy / L, ny: dx / L, s,
        startN: fin && s.ph === 0, endN: fin && ((s.n - 1) % 2) === s.ph
      };
    });
    for (let i = 0; i < n; i++) {
      const e = Ed[i], p = Ed[(i - 1 + n) % n];
      const c = e.a, col = Math.abs(p.ux * e.uy - p.uy * e.ux) < 1e-9;
      if (col) {
        // bordes colineales: el escalón de la muesca se cierra con un tramo perpendicular
        if (p.endN) pts.push([c[0] + p.nx * p.s.d, c[1] + p.ny * p.s.d]);
        pts.push([c[0], c[1]]);
        if (e.startN) pts.push([c[0] + e.nx * e.s.d, c[1] + e.ny * e.s.d]);
      } else {
        let cx = c[0], cy = c[1];
        if (p.endN) { cx += p.nx * p.s.d; cy += p.ny * p.s.d; }
        if (e.startN) { cx += e.nx * e.s.d; cy += e.ny * e.s.d; }
        pts.push([cx, cy]);
      }
      if (!e.s) continue;
      if (e.s.cuts) {
        // muescas abiertas en el canto: [inicio, fin, profundidad]
        [...e.s.cuts].sort((x, y) => x[0] - y[0]).forEach(([t0, t1, d]) => {
          const P = t => [c[0] + e.ux * t, c[1] + e.uy * t];
          const A = P(t0), B = P(t1);
          pts.push(A, [A[0] + e.nx * d, A[1] + e.ny * d], [B[0] + e.nx * d, B[1] + e.ny * d], B);
        });
        continue;
      }
      for (let j = 1; j < e.s.n; j++) {
        const t = e.s.B ? e.s.B[j] : e.L * j / e.s.n, px = c[0] + e.ux * t, py = c[1] + e.uy * t;
        const ox = e.nx * e.s.d, oy = e.ny * e.s.d;
        if (((j - 1) % 2) === e.s.ph) { pts.push([px + ox, py + oy], [px, py]); }
        else { pts.push([px, py], [px + ox, py + oy]); }
      }
    }
    return pts;
  }

  /* Mortajas que tocan o cruzan un canto: se convierten en muescas abiertas del contorno
     (así la pieza que llega puede entrar; no queda ninguna «tapa» delante del hueco). */
  function edgeCuts(verts, specs, holes) {
    const n = verts.length, sp = (specs || []).slice(); while (sp.length < n) sp.push(null);
    const keep = [], eps = 1e-4;
    holes.forEach(h => {
      if (h.length !== 4) { keep.push(h); return; }
      const u0 = h[0][0], v0 = h[0][1], u1 = h[2][0], v1 = h[2][1];
      for (let i = 0; i < n; i++) {
        const a = verts[i], b = verts[(i + 1) % n];
        if (sp[i] && !sp[i].cuts) continue;
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
        const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
        let cut = null;
        if (Math.abs(dy) < 1e-9) {                     // canto horizontal
          const e = a[1];
          if (v0 > e + eps || v1 < e - eps) continue;
          if (u0 < Math.min(a[0], b[0]) - eps || u1 > Math.max(a[0], b[0]) + eps) continue;
          const d = ny > 0 ? v1 - e : e - v0;
          const t0 = ux > 0 ? u0 - a[0] : a[0] - u1, t1 = ux > 0 ? u1 - a[0] : a[0] - u0;
          cut = [t0, t1, d];
        } else if (Math.abs(dx) < 1e-9) {              // canto vertical
          const e = a[0];
          if (u0 > e + eps || u1 < e - eps) continue;
          if (v0 < Math.min(a[1], b[1]) - eps || v1 > Math.max(a[1], b[1]) + eps) continue;
          const d = nx > 0 ? u1 - e : e - u0;
          const t0 = uy > 0 ? v0 - a[1] : a[1] - v1, t1 = uy > 0 ? v1 - a[1] : a[1] - v0;
          cut = [t0, t1, d];
        } else continue;
        if (cut[2] <= eps) continue;
        cut[0] = Math.max(cut[0], 0.0005); cut[1] = Math.min(cut[1], L - 0.0005);
        (sp[i] = sp[i] || { cuts: [] }).cuts.push(cut);
        return;
      }
      keep.push(h);
    });
    return { specs: sp, holes: keep };
  }

  /* Registro de dientes: cada diente deja su huella (mortaja) en la pieza que lo recibe */
  const REG = {};
  function recordTabs(verts, specs, M, depth) {
    if (!specs) return;
    const n = verts.length;
    specs.forEach((s, i) => {
      if (!s || !s.into || s.d >= 0) return;
      const a = verts[i], b = verts[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
      for (let j = 0; j < s.n; j++) {
        if (j % 2 !== s.ph) continue;
        const pts = [];
        for (const t of s.B ? [s.B[j], s.B[j + 1]] : [L * j / s.n, L * (j + 1) / s.n])
          for (const o of [0, s.d])
            for (const w of [0, depth])
              pts.push(V3(a[0] + ux * t + nx * o, a[1] + uy * t + ny * o, w).applyMatrix4(M));
        (REG[s.into] = REG[s.into] || []).push(pts);
      }
    });
  }
  function holesFrom(key, M, pad = 0) {
    const inv = M.clone().invert();
    return (REG[key] || []).map(pts => {
      let u0 = 1e9, v0 = 1e9, u1 = -1e9, v1 = -1e9;
      pts.forEach(p => {
        const q = p.clone().applyMatrix4(inv);
        u0 = Math.min(u0, q.x); u1 = Math.max(u1, q.x); v0 = Math.min(v0, q.y); v1 = Math.max(v1, q.y);
      });
      return rect(u0 - pad, v0 - pad, u1 + pad, v1 + pad);
    });
  }

  /* ---------------- escena ---------------- */
  const scene = new T.Scene();
  const stand = new T.Group(); stand.scale.setScalar(K); scene.add(stand);
  const extras = new T.Group(); scene.add(extras);

  const MAT = new T.MeshStandardMaterial({ color: 0xf4f0ea, roughness: 0.78, metalness: 0 });
  const LINE = new T.LineBasicMaterial({ color: 0x231a14, transparent: true, opacity: 0.88 });
  const PIECES = [], BY = {};

  /* Copia sin triángulos degenerados (área ~0): la triangulación los deja en puntos colineales
     y EdgesGeometry los dibujaría como líneas falsas atravesando las caras. */
  function solidTris(geo) {
    const g = geo.index ? geo.toNonIndexed() : geo, a = g.attributes.position.array, out = [];
    const A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), ab = new T.Vector3(), ac = new T.Vector3();
    for (let i = 0; i < a.length; i += 9) {
      A.fromArray(a, i); B.fromArray(a, i + 3); C.fromArray(a, i + 6);
      if (ab.subVectors(B, A).cross(ac.subVectors(C, A)).length() > 1e-9) for (let k = 0; k < 9; k++) out.push(a[i + k]);
    }
    const r = new T.BufferGeometry(); r.setAttribute('position', new T.Float32BufferAttribute(out, 3)); return r;
  }

  function addPiece(id, geo, M, meta, edgeGeo) {
    geo.computeBoundingBox();
    const c = geo.boundingBox.getCenter(new T.Vector3());
    geo.translate(-c.x, -c.y, -c.z);
    if (edgeGeo) edgeGeo.translate(-c.x, -c.y, -c.z);
    geo.computeBoundingBox();
    const pos = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3();
    M.decompose(pos, q, s);
    const center = c.clone().applyMatrix4(M);
    const mat = MAT.clone();
    const mesh = new T.Mesh(geo, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    const lm = LINE.clone();
    const lines = new T.LineSegments(edgeGeo || new T.EdgesGeometry(solidTris(geo), 24), lm);
    mesh.add(lines);
    mesh.position.copy(center); mesh.quaternion.copy(q);
    const p = {
      id, mesh, lines, mat, lm, meta: meta || {},
      size: geo.boundingBox.getSize(new T.Vector3()),
      final: { p: center.clone(), q: q.clone() }, flat: null, dir: null
    };
    stand.add(mesh); PIECES.push(p); BY[id] = p;
    paintable(p);
    return p;
  }

  /* ---------------- color: paleta Villa Lucía ----------------
     Sale del boceto de color, de la casa real y de la marca: muros blanco crema, zócalo vino tinto
     (el uniforme), postes en barro rojo (la tetera de cerámica), cubiertas y losas café tostado. */
  const PAL = {
    cal: 0xefe4cf, zocalo: 0x7a2330, barro: 0xb4472f, cubierta: 0x3d281d, losa: 0x4f3426,
    blanco: 0xf4f0ea, linea: 0x231a14
  };
  const ZOC_H = 0.15;                                                  // altura del zócalo (≈ 16 cm)
  const SCHEME = id => {
    if (/^(cubierta|alero|labio)/.test(id)) return { base: PAL.cubierta };
    if (/^(losa|meson)/.test(id)) return { base: PAL.losa };
    if (/^pil-t/.test(id)) return { base: PAL.barro };
    if (/^hastial/.test(id)) return { base: PAL.cal };
    if (id === 'bod-lado' || id === 'bod-frente') return { base: PAL.cal, zoc: true, top: Y_MES[0] };   // postes en barro
    return { base: PAL.cal, zoc: true };                              // muro, fondo de bodega, pilar en L
  };
  let COLOR_ON = false, BRAND_ON = false, LINE_OP = 0.88;
  function paintable(p) {
    const u = {
      uRest: { value: new T.Matrix4().compose(p.final.p, p.final.q, V3(1, 1, 1)) },
      uZoc: { value: -1 }, uTop: { value: 99 }, cZoc: { value: new T.Color(PAL.zocalo) }, cTop: { value: new T.Color(PAL.barro) },
      // planos (nz, ny, d) del techo que la pieza atraviesa: lo que queda dentro del techo toma su color
      uPA: { value: new T.Vector3(0, 0, 1e9) }, uPB: { value: new T.Vector3(0, 0, 1e9) }, cCut: { value: new T.Color(PAL.cubierta) },
      // cajas (en coordenadas del stand montado) para testas de dientes que entran en otra pieza
      uB1a: { value: new T.Vector3(1e9, 1e9, 1e9) }, uB1b: { value: new T.Vector3(-1e9, -1e9, -1e9) }, cB1: { value: new T.Color() },
      uB2a: { value: new T.Vector3(1e9, 1e9, 1e9) }, uB2b: { value: new T.Vector3(-1e9, -1e9, -1e9) }, cB2: { value: new T.Color() }
    };
    p.cutKeys = { cut: 'cubierta', b1: 'cal', b2: 'cal' };
    p.paint = u;
    p.mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = 'uniform mat4 uRest;\nvarying vec3 vRest;\n' + sh.vertexShader
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vRest = (uRest * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform float uZoc;\nuniform float uTop;\nuniform vec3 cZoc;\nuniform vec3 cTop;\nuniform vec3 uPA;\nuniform vec3 uPB;\nuniform vec3 cCut;\n' +
        'uniform vec3 uB1a;\nuniform vec3 uB1b;\nuniform vec3 cB1;\nuniform vec3 uB2a;\nuniform vec3 uB2b;\nuniform vec3 cB2;\nvarying vec3 vRest;\n' + sh.fragmentShader
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec3 paintC = vRest.y < uZoc ? cZoc : (vRest.y > uTop ? cTop : diffuse);\n' +
          '  if (uPA.x * vRest.z + uPA.y * vRest.y > uPA.z - 1e-4 || uPB.x * vRest.z + uPB.y * vRest.y > uPB.z - 1e-4) paintC = cCut;\n' +
          '  if (all(greaterThan(vRest, uB1a - 1e-4)) && all(lessThan(vRest, uB1b + 1e-4))) paintC = cB1;\n' +
          '  if (all(greaterThan(vRest, uB2a - 1e-4)) && all(lessThan(vRest, uB2b + 1e-4))) paintC = cB2;\n' +
          '  vec4 diffuseColor = vec4( paintC, opacity );');
    };
    p.mat.customProgramCacheKey = () => 'vl-paint';
  }
  // dientes que atraviesan un techo: su testa se pinta del color del techo
  function roofCuts() {
    const set = (id, a, b) => { const u = BY[id].paint; u.uPA.value.set(a.n.z, a.n.y, a.d); if (b) u.uPB.value.set(b.n.z, b.n.y, b.d); };
    const nF = { z: SA, y: CA }, nB = { z: -SA, y: CA };
    const cuT = { n: nB, d: PL.cuT.bot }, cuF = { n: nF, d: PL.cuF.bot }, alT = { n: nB, d: PL.alT.bot }, alF = { n: nF, d: PL.alF.bot };
    ['hastial-cu-i', 'hastial-cu-d'].forEach(id => set(id, cuT, cuF));
    ['hastial-al-i', 'hastial-al-d'].forEach(id => set(id, alT, alF));
    ['pil-l-z', 'muro'].forEach(id => set(id, cuT));
    // alma de la T: lo que entra en el labio (más allá de su cara inferior)
    const Qy = EAVE_F.y - E * SA, Qz = EAVE_F.z + E * CA;
    set('pil-t-alma', { n: { z: -CA, y: SA }, d: SA * Qy - CA * Qz });

    // regla: un diente toma el color de la pieza que lo recibe (la testa queda pareja con su cara)
    const BIG = 1e3, box = (id, k, a, b, key) => {
      const u = BY[id].paint; u['uB' + k + 'a'].value.set(...a); u['uB' + k + 'b'].value.set(...b); BY[id].cutKeys['b' + k] = key;
    };
    const [ZM0, ZM1] = Z_MOD, HB = Y_MES[0], HL = Y_LOS[0];
    const XP = X_BOD[1] - 3 * TW, ZP = ZM0 + 3 * TW, LEG = E + 3 * TW, ZT = ZM0 + E + TW;
    // postes de la bodega que entran en la losa → café de losa
    ['bod-lado', 'bod-frente'].forEach(id => { set(id, { n: { z: 0, y: 1 }, d: HL }); BY[id].cutKeys.cut = 'losa'; });
    // muros de la bodega que entran en el mesón → café de losa (solo los dientes, no los postes)
    box('bod-frente', 1, [-BIG, HB, -BIG], [XP, Y_MES[1], BIG], 'losa');
    box('bod-lado', 1, [-BIG, HB, ZP], [BIG, Y_MES[1], BIG], 'losa');
    box('bod-fondo', 1, [-BIG, HB, -BIG], [BIG, Y_MES[1], BIG], 'losa');
    // mesón y losas que entran en los muros → crema de cal
    box('meson', 1, [-BIG, -BIG, -BIG], [X_MURO[1], BIG, BIG], 'cal');
    box('losa', 1, [X_CUB[0], -BIG, ZM0], [X_CUB[0] + E, BIG, ZM0 + LEG], 'cal');
    box('losa', 2, [X_CUB[0], -BIG, ZM0], [X_CUB[0] + LEG, BIG, ZM0 + E], 'cal');
    box('muro', 1, [-BIG, HL, ZT], [BIG, Y_LOS[1], BIG], 'losa');
  }
  let COLOR_T = 0, BRAND_T = 0;
  const _ca = new T.Color(), _cb = new T.Color();
  const mix = (out, hex, t) => out.copy(_ca.setHex(PAL.blanco)).lerp(_cb.setHex(hex), t);
  function applyColor(t) {
    t = +t; COLOR_T = t; COLOR_ON = t > 0.5; LINE_OP = 0.88 - 0.26 * t;
    PIECES.forEach(p => {
      const sc = SCHEME(p.id);
      mix(p.mat.color, sc.base, t);
      mix(p.paint.cCut.value, PAL[p.cutKeys.cut], t);
      mix(p.paint.cB1.value, PAL[p.cutKeys.b1], t);
      mix(p.paint.cB2.value, PAL[p.cutKeys.b2], t);
      mix(p.paint.cZoc.value, PAL.zocalo, t);
      mix(p.paint.cTop.value, PAL.barro, t);
      p.paint.uZoc.value = sc.zoc ? ZOC_H : -1;
      p.paint.uTop.value = sc.top ? sc.top : 99;
      p.mat.roughness = 0.78 + 0.08 * t;
      if (!FX.highlight && !FX.draw) p.lm.opacity = LINE_OP;
    });
    if (PROD) PROD.traverse(o => { if (o.isMesh && o.userData.tint !== undefined) o.material.color.setHex(0xe6dfd4).lerp(_cb.setHex(o.userData.tint), t); });
  }
  // transiciones suaves de color y marca
  const TW8 = { color: null, brand: null };
  function tweenTo(key, to, dur) {
    const from = key === 'color' ? COLOR_T : BRAND_T;
    if (!dur) { TW8[key] = null; key === 'color' ? applyColor(to) : applyBrand(to); return; }
    TW8[key] = { from, to, t: 0, dur };
  }

  /* ---------------- marca: logo como calcomanía sobre la bodega ---------------- */
  const LOGO_TEX = {};
  function logoTexture(hex) {
    if (LOGO_TEX[hex]) return LOGO_TEX[hex];
    const c = document.createElement('canvas'); c.width = 1400; c.height = 1022;
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    if (window.LOGO_VL) {
      const img = new Image();
      img.onload = () => {
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        g.globalCompositeOperation = 'source-in'; g.fillStyle = '#' + hex.toString(16).padStart(6, '0'); g.fillRect(0, 0, c.width, c.height);
        tex.needsUpdate = true;
      };
      img.src = window.LOGO_VL;
    }
    return (LOGO_TEX[hex] = tex);
  }
  const DECALS = [];
  // pos y normal en coordenadas del stand (montado); w = ancho del logo
  function decal(id, pos, nrm, w, hex) {
    const p = BY[id];
    const m = new T.MeshStandardMaterial({ map: logoTexture(hex), transparent: true, depthWrite: false, roughness: 0.7,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const d = new T.Mesh(new T.PlaneGeometry(w, w * 1022 / 1400), m);
    const qW = new T.Quaternion().setFromUnitVectors(AX.Z, nrm.clone().normalize());
    const qi = p.final.q.clone().invert();
    d.position.copy(pos.clone().addScaledVector(nrm, 0.0015).sub(p.final.p).applyQuaternion(qi));
    d.quaternion.copy(qi.multiply(qW));
    d.renderOrder = 2; d.visible = false;
    p.mesh.add(d); DECALS.push({ d, p });
  }
  function addBrand() {
    const [ZM0, ZM1] = Z_MOD, yc = (ZOC_H + Y_MES[0]) / 2 + 0.01;
    // frente de la bodega, de cara al público, en vino tinto
    decal('bod-frente', V3((X_BOD[0] + X_BOD[1] - E) / 2, yc, ZM1), V3(0, 0, 1), 0.66, PAL.zocalo);
    // faldón delantero del techo grande, en crema: la parte alta que se ve por encima del alero
    const Ft = PL.cuF.top, Tt = PL.cuT.top;
    const ridge = { z: (Ft - Tt) / (2 * SA), y: (Ft + Tt) / (2 * CA) }, s = 0.30;
    decal('cubierta-f', V3((X_CUB[0] + X_CUB[1]) / 2, ridge.y - s * SA, ridge.z + s * CA), V3(0, CA, SA), 0.62, PAL.cal);
  }
  function applyBrand(t) { t = +t; BRAND_T = t; BRAND_ON = t > 0.5; DECALS.forEach(o => { o.d.visible = t > 0.001; }); }

  function build(id, verts, specs, holes, depth, M, meta) {
    // dientes estándar: el nº de tramos sale del largo del canto (mismo ancho de diente en todo el stand)
    if (specs) specs = specs.map((sp, i) => {
      if (!sp || sp.cuts || !sp.n || sp.B) return sp;              // B explícito: se respeta
      const a = verts[i], b = verts[(i + 1) % verts.length];
      const B = segB(Math.hypot(b[0] - a[0], b[1] - a[1]), sp.tw || TW);
      return Object.assign({}, sp, { n: B.length - 1, B });
    });
    recordTabs(verts, specs, M, depth);
    const ec = edgeCuts(verts, specs, holes || []);
    const pts = outline(verts, ec.specs);
    const shape = new T.Shape(pts.map(p => new T.Vector2(p[0], p[1])));
    ec.holes.forEach(h => shape.holes.push(new T.Path(h.map(p => new T.Vector2(p[0], p[1])))));
    const geo = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
    return addPiece(id, geo, M, meta, contourEdges([pts, ...ec.holes], depth));
  }

  /* Aristas exactas a partir del contorno (no de la malla): sin líneas falsas por triangulación */
  function contourEdges(loops, depth) {
    const L = [];
    loops.forEach(loop => {
      const n = loop.length;
      for (let i = 0; i < n; i++) {
        const p = loop[i], q = loop[(i + 1) % n], o = loop[(i - 1 + n) % n];
        if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-9) continue;
        L.push(p[0], p[1], 0, q[0], q[1], 0, p[0], p[1], depth, q[0], q[1], depth);
        const cr = (p[0] - o[0]) * (q[1] - p[1]) - (p[1] - o[1]) * (q[0] - p[0]);
        if (Math.abs(cr) > 1e-12) L.push(p[0], p[1], 0, p[0], p[1], depth);   // arista del canto solo donde el contorno quiebra
      }
    });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(L, 3)); return g;
  }

  function mergeGeos(list) {
    list = list.map(g => g.index ? g.toNonIndexed() : g);
    const out = new T.BufferGeometry();
    ['position', 'normal', 'uv'].forEach(name => {
      const arrs = list.map(g => g.attributes[name].array);
      const arr = new Float32Array(arrs.reduce((a, b) => a + b.length, 0));
      let o = 0; arrs.forEach(a => { arr.set(a, o); o += a.length; });
      out.setAttribute(name, new T.BufferAttribute(arr, list[0].attributes[name].itemSize));
    });
    return out;
  }

  const fing = (ph, n = 7) => ({ n, ph, d: E });
  const tabs = (n, into, tw = TW) => ({ n, ph: 1, d: -E, into, tw });

  /* geometría de cubierta en el corte (z, y) */
  const nF = { z: SA, y: CA }, nB = { z: -SA, y: CA };              // normales hacia afuera
  const upF = { z: -CA, y: SA }, upB = { z: CA, y: SA };             // dirección hacia la cumbrera
  const hit = (P, d, n, dval) => (dval - (n.z * P.z + n.y * P.y)) / (n.z * d.z + n.y * d.y);
  const add = (P, d, s) => ({ z: P.z + d.z * s, y: P.y + d.y * s });

  /* Faldón: se arma como prismas a lo largo de x. En la cumbrera los dientes terminan
     exactamente en la cara exterior del faldón opuesto y las muescas en su cara interior,
     ambos cortados al ángulo real del techo: el encaje cierra sin huecos ni traslapes. */
  const PERM = new T.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);   // (v, t, u) → (u, v, t)
  function faldon(id, P, up, n, front, other, ph, lowTabs, meta, key, XR = X_CUB, start = null) {
    const w = XR[1] - XR[0];
    const M = basis(front ? AX.X : AX.nX, V3(0, up.y, up.z), V3(front ? XR[0] : XR[1], P.y, P.z));
    // cumbrera en cremallera, sin huecos ni traslapes (dientes y muescas alternos)
    const meet = (n1, d1, n2, d2) => {                                // intersección de dos planos en el corte (z, y)
      const det = n1.z * n2.y - n1.y * n2.z;
      return { z: (d1 * n2.y - n1.y * d2) / det, y: (n1.z * d2 - d1 * n2.z) / det };
    };
    const own = { top: n.z * P.z + n.y * P.y + E, bot: n.z * P.z + n.y * P.y };
    const Rt = meet(n, own.top, other.n, other.top), Rb = meet(n, own.bot, other.n, other.bot);
        const loc = Q => [(Q.z - P.z) * up.z + (Q.y - P.y) * up.y, (Q.z - P.z) * n.z + (Q.y - P.y) * n.y];
    // cremallera igual que en las paredes: en el diente el tablero llega hasta la cara exterior del otro
    // faldón (y su testa queda a ras, visible); en la muesca se detiene en la cara interior del otro.
    const tB = loc(meet(n, own.bot, other.n, other.top))[0], tT = loc(Rt)[0];
    const nB0 = loc(Rb)[0], nT0 = loc(meet(n, own.top, other.n, other.bot))[0];
    // arranque en cremallera contra otro faldón (limahoya a 90°): el diente llega a la cara inferior del otro
    // faldón (su testa queda a ras por debajo) y la muesca se detiene en su cara superior
    const S = start && start.other;
    const sTab = S && [loc(meet(n, own.bot, S.n, S.bot))[0], loc(meet(n, own.top, S.n, S.bot))[0]];
    const sNot = S && [loc(meet(n, own.bot, S.n, S.top))[0], loc(meet(n, own.top, S.n, S.top))[0]];
    const B = segB(w, TR), NR = B.length - 1;
    const lowN = lowTabs ? NR : 0;
    const holes = key ? holesFrom(key, M) : [];
    const cl = u => Math.min(w, Math.max(0, u));
    const us = new Set([0, w]);
    B.forEach(b => us.add(b));
    holes.forEach(h => { us.add(cl(h[0][0])); us.add(cl(h[2][0])); });
    const U = [...us].sort((a, b) => a - b), geos = [], segs = [];
    for (let k = 0; k < U.length - 1; k++) {
      const ua = U[k], ub = U[k + 1]; if (ub - ua < 1e-6) continue;
      const um = (ua + ub) / 2;
      const si = segIdx(B, um), isTab = si % 2 === ph;
      const low = lowN && si % 2 === 1 ? -E : 0;
      const hv = holes.filter(h => h[0][0] < um && h[2][0] > um).map(h => [h[0][1], h[2][1]]).sort((x, y) => x[0] - y[0]);
      let st = low; const parts = [];
      hv.forEach(([a0, a1]) => { parts.push([st, a0]); st = a1; });
      parts.push([st, null]);
      const polys = [];
      segs.push({ ua, ub, polys });
      parts.forEach(([va, vz]) => {
        const poly = vz !== null ? [[va, 0], [vz, 0], [vz, E], [va, E]]
          : isTab ? [[va, 0], [tB, 0], [tT, E], [va, E]]
          : [[va, 0], [nB0, 0], [nT0, E], [va, E]];
        if (S && va === low) {
          const [b0, t0] = si % 2 === start.ph ? sTab : sNot;
          poly[0][0] = b0; poly[poly.length - 1][0] = t0;
        }
        polys.push(poly);
        const g = new T.ExtrudeGeometry(new T.Shape(poly.map(q => new T.Vector2(q[0], q[1]))), { depth: ub - ua, bevelEnabled: false });
        g.translate(0, 0, ua); g.applyMatrix4(PERM); geos.push(g);
      });
    }
    if (lowN && lowTabs.into) for (let j = 1; j < lowN; j += 2) {
      const pts = [];
      for (const u of [B[j], B[j + 1]]) for (const v of [-E, 0]) for (const t of [0, E]) pts.push(V3(u, v, t).applyMatrix4(M));
      (REG[lowTabs.into] = REG[lowTabs.into] || []).push(pts);
    }
    return addPiece(id, mergeGeos(geos), M, meta, prismEdges(segs));
  }

  /* Pieza barrida a lo largo de x: tramos [ua, ub] con perfiles en (y, z). Sirve para tableros
     cuyo canto superior se bisela contra la cara inferior del faldón (apoyo exacto, sin cuñas). */
  const MX = basis(AX.X, AX.Y, V3(0, 0, 0));
  function sweepX(id, segs, meta) {
    const geos = [];
    segs.forEach(sg => sg.polys.forEach(poly => {
      const g = new T.ExtrudeGeometry(new T.Shape(poly.map(q => new T.Vector2(q[0], q[1]))), { depth: sg.ub - sg.ua, bevelEnabled: false });
      g.translate(0, 0, sg.ua); g.applyMatrix4(PERM); geos.push(g);
    }));
    return addPiece(id, mergeGeos(geos), MX, meta, prismEdges(segs));
  }

  /* Tablero vertical paralelo a x (z0..z1) cuyo canto superior sigue la cara inferior de un faldón (top(z)).
     holes: mortajas (x, y) que lo atraviesan; corner: [x0, x1, B] tramos de cremallera que le pertenecen (impares). */
  function sweepColumn(id, xr, z0, z1, top, holes, corner, meta) {
    const box = (ya, yb) => [[ya, z0], [ya, z1], [yb, z1], [yb, z0]];
    const colTop = ya => [[ya, z0], [ya, z1], [top(z1), z1], [top(z0), z0]];
    const us = new Set([xr[0], xr[1]]);
    if (corner) { us.add(corner[0]); us.add(corner[1]); }
    holes.forEach(h => { us.add(Math.max(xr[0], h[0][0])); us.add(Math.min(xr[1], h[2][0])); });
    const U = [...us].sort((a, b) => a - b), segs = [];
    for (let k = 0; k < U.length - 1; k++) {
      const ua = U[k], ub = U[k + 1], um = (ua + ub) / 2;
      if (ub - ua < 1e-6) continue;
      const polys = [];
      if (corner && um > corner[0] && um < corner[1]) {
        const CB = corner[2]; for (let j = 1; j < CB.length - 1; j += 2) polys.push(box(CB[j], CB[j + 1]));
      } else {
        let st = 0;
        holes.filter(h => h[0][0] < um && h[2][0] > um).map(h => [h[0][1], h[2][1]]).sort((a, b) => a[0] - b[0])
          .forEach(([a, b]) => { polys.push(box(st, a)); st = b; });
        polys.push(colTop(st));
      }
      segs.push({ ua, ub, polys });
    }
    return sweepX(id, segs, meta);
  }

  /* Aristas de un prisma por tramos: aristas longitudinales + solo las partes de las tapas
     que no comparte el tramo vecino (así se ven los dientes y no las juntas internas). */
  function prismEdges(segs) {
    const L = [];
    const edgesOf = polys => polys.flatMap(p => p.map((a, i) => [a, p[(i + 1) % p.length]]));
    const minus = (e, others) => {
      const [a, b] = e, dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
      if (len2 < 1e-14) return [];
      let parts = [[0, 1]];
      others.forEach(([c, d]) => {
        const cr = (q) => Math.abs((q[0] - a[0]) * dy - (q[1] - a[1]) * dx) / Math.sqrt(len2);
        if (cr(c) > 1e-6 || cr(d) > 1e-6) return;
        let s0 = ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / len2, s1 = ((d[0] - a[0]) * dx + (d[1] - a[1]) * dy) / len2;
        if (s0 > s1) [s0, s1] = [s1, s0];
        parts = parts.flatMap(([p0, p1]) => {
          if (s1 <= p0 + 1e-9 || s0 >= p1 - 1e-9) return [[p0, p1]];
          const r = []; if (s0 > p0 + 1e-9) r.push([p0, s0]); if (s1 < p1 - 1e-9) r.push([s1, p1]); return r;
        });
      });
      return parts.map(([p0, p1]) => [[a[0] + dx * p0, a[1] + dy * p0], [a[0] + dx * p1, a[1] + dy * p1]]);
    };
    const cap = (u, A, B) => {
      const eA = edgesOf(A), eB = edgesOf(B);
      [...eA.flatMap(e => minus(e, eB)), ...eB.flatMap(e => minus(e, eA))]
        .forEach(([p, q]) => L.push(u, p[0], p[1], u, q[0], q[1]));
    };
    segs.forEach((sg, i) => {
      sg.polys.forEach(p => p.forEach(([v, t]) => L.push(sg.ua, v, t, sg.ub, v, t)));
      cap(sg.ua, i > 0 && Math.abs(segs[i - 1].ub - sg.ua) < 1e-9 ? segs[i - 1].polys : [], sg.polys);
    });
    const last = segs[segs.length - 1]; cap(last.ub, last.polys, []);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(L, 3));
    return g;
  }

  /* =============== EL STAND =============== */
  function buildStand() {
    const [ZM0, ZM1] = Z_MOD, HB = Y_MES[0], HL = Y_LOS[0];
    let TT = null;                                                    // diente del pilar en T (lo recibe el labio)
    const ZW0 = Z_MOD[0], ZS0 = Z_MOD[0];                             // respaldo parejo: todo al ras de la bodega (z = 0,025)
    // cara inferior del faldón trasero y base común de los hastiales (triángulos idénticos)
    const yR = z => (PL.cuT.bot + SA * z) / CA;
    // altura común de los hastiales: el del alero baja hasta la limahoya (arista inferior donde chocan los techos)
    // y protege el encaje; el de la cubierta mayor es idéntico (mismo triángulo en los cuatro)
    const H_TRI = (PL.alF.bot + PL.alT.bot) / (2 * CA) - VALLEY.y;
    const BASE = { cu: (PL.cuF.bot + PL.cuT.bot) / (2 * CA) - H_TRI, al: VALLEY.y };
    const ZB = (CA * BASE.cu - PL.cuT.bot) / SA;                      // esquina trasera de la base del hastial mayor
    const ZT = ZM0 + E + TW;                                          // poste del muro: E + TW (losas unidas en 9·TW)
    // el poste del muro (detrás de la ventana) sube hasta el techo y termina justo en la esquina del hastial
    const WIN = [ZT, ZT + 7 * TW], BW = segB(WIN[1] - WIN[0]);
    const TABM = []; for (let j = 1; j < BW.length - 1; j += 2) TABM.push([WIN[0] + BW[j], WIN[0] + BW[j + 1]]);
    const LEG = E + 3 * TW;                                           // las dos alas de la L miden igual
    const LZ = [ZM0, ZM0 + LEG], LX = [X_CUB[0], X_CUB[0] + LEG];

    // ---- 0 · Bodega en cremallera. Frente y costado suben de una pieza hasta la losa (postes gemelos)
    const XP = X_BOD[1] - 3 * TW, ZP = ZM0 + 3 * TW;                  // postes gemelos de 3·TW
    // espejo del frente: el fondo cubre solo la mitad del módulo y encaja únicamente con el muro de la casa
    const X_MID = X_MURO[0] + 7 * TW;                                 // ≈ la mitad del módulo
    build('bod-fondo', R(X_MID - X_MURO[0], HB), [null, null, tabs(9, 'meson'), fing(0)], null, E,
      mXY(X_MURO[0], 0, ZM0), { g: 'muro', s: 0, name: 'Fondo de bodega' });
    {
      // los dientes hacia el mesón arrancan detrás del frente (tramos iguales a los del frente)
      const L = ZM1 - ZM0, uP = ZM1 - ZP;
      build('bod-lado', [[0, 0], [L, 0], [L, HB], [L, HL], [uP, HL], [uP, HB], [E, HB], [0, HB]],
        [null, null, null, tabs(3, 'losa'), null, tabs(7, 'meson'), null, fing(1)], null, E,
        mZY(X_BOD[1] - E, 0, ZM1), { g: ['muro', 'ventana'], s: 0, name: 'Costado de bodega y poste', loop: 'side' });
    }
    {
      const w = X_BOD[1] - X_BOD[0], uP = XP - X_BOD[0];
      build('bod-frente', [[0, 0], [w, 0], [w, HB], [w, HL], [uP, HL], [uP, HB], [0, HB]],
        [null, fing(0), null, tabs(5, 'losa'), null, tabs(5, 'meson'), null], null, E,
        mXY(X_BOD[0], 0, ZM1 - E), { g: ['muro', 'ventana'], s: 0, name: 'Frente de bodega y poste' });
    }


    // ---- 1 · Muro de la casa: puerta abajo, ventana arriba y poste trasero de una pieza hasta el techo
    {
      const L = ZM1 - ZW0, uz = z => ZM1 - z, uW = uz(ZT), uB = uz(ZB);
      const zc = (ZW0 + ZM1) / 2, d0 = uz(zc + 0.17), d1 = uz(zc - 0.17);     // puerta centrada en el muro
      // ventana: el alféizar coincide con la cara superior del mesón y lleva las muescas de sus dientes
      const yb = Y_MES[1], yn = Y_MES[0];
      const win = [[uz(WIN[1]), 1.54], [uz(WIN[1]), yb]];
      [...TABM].map(([a, b]) => [uz(b), uz(a)]).sort((x, y) => x[0] - y[0])
        .forEach(([u0, u1]) => win.push([u0, yb], [u0, yn], [u1, yn], [u1, yb]));
      win.push([uz(WIN[0]), yb], [uz(WIN[0]), 1.54]);
      const M = mZY(X_MURO[0], 0, ZM1);
      build('muro', [[0, 0], [d0, 0], [d0, 0.555], [d1, 0.555], [d1, 0], [L, 0], [L, HB], [L, yR(ZW0)], [uB, BASE.cu], [uW, BASE.cu], [uW, HL], [0, HL]],
        [null, null, null, null, null, fing(1), null, tabs(3, 'cu-t', TS), null, null, { n: 5, ph: 1, d: -E, into: 'losa', B: [0, 2 * TW, 3 * TW, 6 * TW, 7 * TW, 9 * TW] }, null],
        [win, ...holesFrom('muro', M)],
        E, M, { g: ['vano', 'ventana'], s: 1, name: 'Muro con puerta, ventana y poste' });
    }

    // ---- 4 · Losa de una sola placa (≈ 1,97 × 0,76 m: sale de un tablero de 1,22 × 2,44). Pasa continua sobre
    //      el muro, se recorta alrededor de su poste y del pilar en L, y recibe los dientes de postes y muro.
    {
      const M = mH(LX[0], HL, ZM1), hd = ZM1 - ZS0, vt = ZM1 - ZT;
      const w = X_MURO[0] - LX[0], wt = X_BOD[1] - LX[0], uX = LX[1] - LX[0];
      const vb = ZM1 - (LZ[0] + E), vL = ZM1 - LZ[1];
      build('losa', [[0, 0], [wt, 0], [wt, hd], [w + E, hd], [w + E, vt], [w, vt], [w, hd], [uX, hd], [uX, vb], [E, vb], [E, vL], [0, vL]],
        [null, null, null, null, null, null, null, null, tabs(3, 'pil-l-x'), tabs(3, 'pil-l-z'), null, null],
        holesFrom('losa', M), E, M, { g: ['ventana', 'losa'], s: 4, name: 'Losa' });
    }

    // ---- 2 · Mesón: se recorta alrededor de los postes y recibe los dientes de la bodega
    {
      const vz = z => ZM1 - z, ux = x => x - X_MURO[1];
      const M = mH(X_MURO[1], HB, ZM1);
      const verts = [[0, 0], [ux(XP), 0], [ux(XP), vz(ZM1 - E)], [ux(X_BOD[1]), vz(ZM1 - E)],
        [ux(X_BOD[1]), vz(ZP)], [ux(X_BOD[1] - E), vz(ZP)], [ux(X_BOD[1] - E), vz(ZM0)], [0, vz(ZM0)]];
      const specs = verts.map(() => null);
      // canto contra el muro: dientes que entran al alféizar
      specs[verts.length - 1] = { cuts: TABM.map(([a, b]) => [a - ZM0, b - ZM0, -E]) };
      build('meson', verts, specs, holesFrom('meson', M), E, M, { g: 'muro', s: 2, name: 'Mesón', loop: 'up' });
    }

    // ---- 3 · Pilares del corredor: L trasero de una pieza hasta el techo y T frontal (alma dentada)
    {
      // ala en z (plano del hastial): sube hasta el faldón con dientes que lo atraviesan, y arriba recibe el hastial
      const L = LZ[1] - LZ[0], uB = LZ[1] - ZB, M = mZY(LX[0], 0, LZ[1]);
      build('pil-l-z', [[0, 0], [L, 0], [L, yR(LZ[0])], [uB, BASE.cu], [0, BASE.cu]],
        [null, fing(1), tabs(3, 'cu-t', TS), null, null], holesFrom('pil-l-z', M), E, M,
        { g: 'pilares', s: 3, name: 'Pilar en L', sep: [-0.12, 0, 0.18] });
      // ala en x: canto superior biselado contra la cara inferior del faldón; cremallera en la esquina
      const z0 = LZ[0], H0 = yR(z0);
      sweepColumn('pil-l-x', LX, z0, z0 + E, yR, holesFrom('pil-l-x', MX), [LX[0], LX[0] + E, segB(H0)],
        { g: 'pilares', s: 3, name: 'Pilar en L', sep: [0.18, 0, -0.12] });
    }
    {
      // T al frente, bajo el labio (la diagonal que sube): el ala, atrás, arranca justo en la arista inferior
      // del labio; el alma va hacia adelante y termina en su arista superior. Las dos se biselan contra la
      // cara inferior del labio, y la punta del alma es un diente rectangular (TS) que se aloja en una muesca
      // abierta en el borde superior del labio y queda a ras. Como el fondo de la muesca mira hacia arriba y
      // adelante, la T entra deslizando desde el frente: primero el alma y luego el ala, como antes.
      const Qy = EAVE_F.y - E * SA, Qz = EAVE_F.z + E * CA;          // arista inferior de la cara frontal del labio
      const yFace = z => Qy + (z - Qz) * (CA / SA);                   // cara inferior (frontal) del labio
      const TWD = 0.227, xc = (X_ALE[0] + X_ALE[1]) / 2;
      const zs = Qz + E, zF = zs + L_SL;                               // ala de Qz a zs; alma de zs a zF
      // diente: rectángulo del labio entre v = Lv − TS y su borde (v a lo largo del labio, w a lo ancho)
      const Lv = (E + L_SL) / SA, uz = z => zF - z;
      const lp = (v, w) => ({ y: EAVE_F.y + CA * v - SA * w, z: EAVE_F.z + SA * v + CA * w });
      const a = lp(Lv - TS, E), b = lp(Lv - TS, 0), c = lp(Lv, 0);
      TT = { x0: xc - E / 2, x1: xc + E / 2, v1: Lv - TS };
      build('pil-t-alma', [[0, 0], [L_SL, 0], [L_SL, yFace(zs)], [uz(a.z), a.y], [uz(b.z), b.y], [uz(c.z), c.y], [0, yFace(zF)]],
        [null, tabs(3, 'ala'), null, null, null, null, null], null, E,
        mZY(xc - E / 2, 0, zF), { g: 'pilares', s: 3, name: 'Pilar en T', sep: [0, -0.12, 0.42] });
      sweepColumn('pil-t-ala', [xc - TWD / 2, xc + TWD / 2], Qz, zs, yFace, holesFrom('ala', MX), null,
        { g: 'pilares', s: 3, name: 'Pilar en T', sep: [0, -0.2, -0.12] });
    }

    // ---- 5 · Cubierta mayor: hastiales triangulares exactos y faldones con cumbrera dentada
    const tri = (yb, back, front) => {                              // triángulo bajo las caras inferiores
      const zb = (CA * yb - back.bot) / SA, zf = (front.bot - CA * yb) / SA;
      const ry = (front.bot + back.bot) / (2 * CA), rz = (front.bot - back.bot) / (2 * SA);
      return { zb, zf, apex: [zf - rz, ry - yb], span: zf - zb };
    };
    const cuF = { n: nF, top: PL.cuF.top, bot: PL.cuF.bot }, cuB = { n: nB, top: PL.cuT.top, bot: PL.cuT.bot };
    const alF = { n: nF, top: PL.alF.top, bot: PL.alF.bot }, alB = { n: nB, top: PL.alT.top, bot: PL.alT.bot };
    const hastial = (id, x, yb, back, front, kB, kF, g, s) => {
      const t = tri(yb, back, front);
      build(id, [[0, 0], [t.span, 0], t.apex], [null, { n: 3, ph: 1, d: -E, into: kB, tw: TS }, { n: 3, ph: 1, d: -E, into: kF, tw: TS }],
        null, E, mZY(x, yb, t.zf), { g, s, name: 'Hastial' });
    };
    hastial('hastial-cu-i', X_CUB[0], BASE.cu, cuB, cuF, 'cu-t', 'cu-f', 'cubierta', 5);
    hastial('hastial-cu-d', X_CUB[1] - E, BASE.cu, cuB, cuF, 'cu-t', 'cu-f', 'cubierta', 5);
    faldon('cubierta-t', EAVE_T, upB, nB, false, cuF, 0, null, { g: 'cubierta', s: 5, name: 'Faldón trasero' }, 'cu-t');
    // limahoya a 90° en cremallera con el alero; su arista inferior se apoya sobre la losa
    faldon('cubierta-f', VALLEY, upF, nF, true, cuB, 1, null, { g: 'cubierta', s: 5, name: 'Faldón delantero' }, 'cu-f',
      X_CUB, { other: alB, ph: 1 });

    // ---- 6 · Alero frontal: hastiales, faldones y labio perpendicular
    hastial('hastial-al-i', X_ALE[0], BASE.al, alB, alF, 'al-t', 'al-f', 'alero', 6);
    hastial('hastial-al-d', X_ALE[1] - E, BASE.al, alB, alF, 'al-t', 'al-f', 'alero', 6);
    faldon('alero-t', VALLEY, upB, nB, false, alF, 0, null, { g: 'alero', s: 6, name: 'Faldón trasero del alero' }, 'al-t', X_ALE,
      { other: cuF, ph: 0 });
    faldon('alero-f', EAVE_F, upF, nF, true, alB, 1, { n: 9, into: 'labio' },
      { g: 'alero', s: 6, name: 'Faldón del alero' }, 'al-f', X_ALE);
    {
      // sección del labio en (y, z): rectángulo girado 45°; espesor W hacia adelante y abajo, alto V hacia arriba y adelante
      const Lv = (E + L_SL) / SA, P = { y: EAVE_F.y, z: EAVE_F.z };
      const Wv = { y: -SA, z: CA }, Vv = { y: CA, z: SA };
      const pt = (v, w) => [P.y + Vv.y * v + Wv.y * w, P.z + Vv.z * v + Wv.z * w];
      const rectV = (v0, v1 = Lv) => [pt(v0, 0), pt(v0, E), pt(v1, E), pt(v1, 0)];
      const w = X_ALE[1] - X_ALE[0], B = segB(w, TR);                  // mismos tramos que los dientes del faldón
      const us = new Set([X_ALE[0], X_ALE[1], TT.x0, TT.x1]); B.forEach(b => us.add(X_ALE[0] + b));
      const U = [...us].sort((a, b) => a - b), segs = [];
      for (let k = 0; k < U.length - 1; k++) {
        const ua = U[k], ub = U[k + 1], um = (ua + ub) / 2; if (ub - ua < 1e-6) continue;
        const v0 = segIdx(B, um - X_ALE[0]) % 2 === 1 ? E : 0;           // muesca del diente del faldón
        const polys = [rectV(v0, um > TT.x0 && um < TT.x1 ? TT.v1 : Lv)];  // muesca abierta para la T
        segs.push({ ua, ub, polys });
      }
      sweepX('labio', segs, { g: 'alero', s: 6, name: 'Labio del alero' });
    }
  }

  /* ---------------- pasos de montaje ---------------- */
  /* Orden real de montaje: cada pieza entra en línea recta por la única dirección en que sus dientes
     pueden encajar sin atravesar a las que ya están puestas. */
  const STEPS = [
    'La bodega · sus paredes encajan en la esquina',
    'El muro · se engancha al fondo de la bodega',
    'El mesón · se apoya en los dientes de la bodega',
    'La losa · una sola tabla encima de todo',
    'El pilar en L · entra en la esquina de la losa',
    'El techo grande · dos tablas y los triángulos que las traban',
    'El alero · sus tablas, el borde y los triángulos',
    'El pilar en T · entra de frente bajo el alero'
  ];
  const ORDER = [
    'bod-fondo', 'bod-lado', 'bod-frente',
    'muro',
    'meson',
    'losa',
    'pil-l-x', 'pil-l-z',
    'cubierta-t', 'cubierta-f', 'hastial-cu-i', 'hastial-cu-d',
    'alero-t', 'alero-f', 'labio', 'hastial-al-i', 'hastial-al-d',
    'pil-t-ala', 'pil-t-alma'
  ];
  const STEP_OF = { 'bod-fondo': 0, 'bod-lado': 0, 'bod-frente': 0, muro: 1, meson: 2, losa: 3, 'pil-l-x': 4, 'pil-l-z': 4,
    'cubierta-t': 5, 'cubierta-f': 5, 'hastial-cu-i': 5, 'hastial-cu-d': 5, 'alero-t': 6, 'alero-f': 6, labio: 6, 'hastial-al-i': 6, 'hastial-al-d': 6,
    'pil-t-ala': 7, 'pil-t-alma': 7 };
  // dirección en que viaja la pieza en su último tramo (coordenadas del stand); por defecto, cae vertical
  const APPROACH = {
    'bod-frente': [0, 0, -1], muro: [0, 0, -1],                         // cremallera vertical: entran de frente
    'pil-l-x': [0, 0, 1], 'pil-l-z': [1, 0, 0],                        // sobre los dientes horizontales de la losa
    'cubierta-t': [0, -CA, SA], 'cubierta-f': [0, -CA, -SA],            // perpendiculares a su plano
    'alero-t': [0, CA, -SA], 'alero-f': [0, -CA, -SA],
    labio: [0, SA, -CA],                                               // sobre los dientes del faldón
    'hastial-cu-i': [1, 0, 0], 'hastial-cu-d': [-1, 0, 0], 'hastial-al-i': [1, 0, 0], 'hastial-al-d': [-1, 0, 0],   // de lado
    'pil-t-ala': [0, 0, -1], 'pil-t-alma': [0, 0, -1]                  // desde el frente, bajo el labio
  };

  /* ---------------- complementos: producto, personas, cotas, piso ---------------- */
  const LAYER = { cotas: 1, producto: 2, personas: 3 };
  function onLayer(obj, l) { obj.traverse(o => o.layers.set(l)); return obj; }
  const W = (x, y, z) => V3(x * K, y * K, z * K);                      // medida → mundo real

  let PROD = null;
  function addProducts() {
    // tamaños reales (metros); posiciones ancladas al stand con W()
    const g = new T.Group();
    const m = new T.MeshStandardMaterial({ color: 0xe6dfd4, roughness: 0.9 });
    const lm = LINE.clone(); lm.opacity = 0.55;
    const withEdges = mesh => { mesh.add(new T.LineSegments(new T.EdgesGeometry(mesh.geometry, 30), lm)); mesh.castShadow = mesh.receiveShadow = true; return mesh; };
    const bagGeo = new T.BoxGeometry(0.12, 0.20, 0.065);
    const BAGS = [0x1f1b19, 0x23366b, 0xc49a45, 0x7a2330, 0xb08a5c];  // empaques reales
    const bagMat = () => { const bm = m.clone(); bm.userData = {}; return bm; };
    const yM = Y_MES[1] * K, yL = Y_LOS[1] * K, x0 = X_MURO[1] * K;
    BAGS.forEach((c, i) => {                                          // vitrina: empaques sobre el mesón
      const b = withEdges(new T.Mesh(bagGeo, bagMat())); b.userData.tint = c;
      b.position.set(x0 + 0.12 + i * 0.16, yM + 0.10, Z_MOD[0] * K + 0.16 + (i % 2) * 0.04); g.add(b);
    });
    const cup = new T.CylinderGeometry(0.036, 0.029, 0.07, 22);
    for (let i = 0; i < 4; i++) {                                     // degustación sobre el mostrador
      const c = withEdges(new T.Mesh(cup, m)); c.position.set(x0 + 0.15 + i * 0.11, yL + 0.035, Z_MOD[1] * K - 0.12); g.add(c);
    }
    const pts = [];
    for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; pts.push(new T.Vector2(0.03 + 0.10 * Math.sin(a), 0.04 * (1 - Math.cos(a)))); }
    const bowl = new T.LatheGeometry(pts, 28);
    [0.75, 0.98].forEach(dx => { const b = new T.Mesh(bowl, bagMat()); b.userData.tint = PAL.barro; b.castShadow = true; b.position.set(x0 + dx, yL, Z_MOD[1] * K - 0.16); g.add(b); });
    extras.add(onLayer(g, LAYER.producto));
    PROD = g;
  }

  function addPeople() {
    // figuras de escala de 1,70 m (mundo real)
    const m = new T.MeshStandardMaterial({ color: 0x7d7064, roughness: 0.95 });
    const person = (p, ry, s = 1) => {
      const g = new T.Group();
      const cap = (r, l, px, py, pz, rz = 0) => {
        const c = new T.Mesh(new T.CapsuleGeometry(r, l, 6, 14), m);
        c.position.set(px, py, pz); c.rotation.z = rz; c.castShadow = true; g.add(c); return c;
      };
      cap(0.058, 0.74, -0.075, 0.43, 0); cap(0.058, 0.74, 0.075, 0.43, 0);
      const torso = cap(0.135, 0.36, 0, 1.13, 0); torso.scale.set(1, 1, 0.58);
      cap(0.038, 0.56, -0.19, 1.07, 0, 0.06); cap(0.038, 0.56, 0.19, 1.07, 0, -0.06);
      cap(0.04, 0.05, 0, 1.43, 0);
      const head = new T.Mesh(new T.SphereGeometry(0.092, 28, 18), m);
      head.position.y = 1.58; head.scale.set(0.92, 1.08, 1); head.castShadow = true; g.add(head);
      g.position.copy(p); g.rotation.y = ry; g.scale.setScalar(s);
      return g;
    };
    const g = new T.Group();
    g.add(person(W(0.9, 0, 3.6), Math.PI + 0.3));            // visitante llegando al alero
    g.add(person(W(2.6, 0, 2.3), Math.PI + 0.15, 0.97));     // visitante frente al mostrador
    g.add(person(W(4.1, 0, 0.8), -Math.PI / 2 + 0.2));       // expositor al costado de la bodega
    extras.add(onLayer(g, LAYER.personas));
  }

  const COTAS = [];
  function addCotas(box) {
    const m = new T.LineBasicMaterial({ color: 0xd39a5c });
    const g = new T.Group();
    const dim = (a, b, tick, label) => {
      const t = tick.clone().multiplyScalar(0.06);
      const pts = [a, b, a.clone().add(t), a.clone().sub(t), b.clone().add(t), b.clone().sub(t)];
      g.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), m));
      COTAS.push({ pos: a.clone().add(b).multiplyScalar(0.5), text: label });
    };
    const f = v => v.toFixed(2).replace('.', ',') + ' m';
    const { min, max } = box, zF = max.z + 0.35, xL = min.x - 0.45;
    dim(V3(min.x, 0.004, zF), V3(max.x, 0.004, zF), V3(0, 0, 1), f(max.x - min.x) + ' · frente');
    dim(V3(xL, 0.004, min.z), V3(xL, 0.004, max.z), V3(1, 0, 0), f(max.z - min.z) + ' · fondo');
    dim(V3(xL, 0, min.z - 0.25), V3(xL, max.y, min.z - 0.25), V3(0, 0, 1), f(max.y) + ' · cumbrera');
    dim(V3(xL, 0, max.z - 0.1), V3(xL, Y_LOS[1] * K, max.z - 0.1), V3(0, 0, 1), f(Y_LOS[1] * K) + ' · losa');
    dim(V3(max.x + 0.3, 0, Z_MOD[1] * K), V3(max.x + 0.3, Y_MES[1] * K, Z_MOD[1] * K), V3(1, 0, 0), f(Y_MES[1] * K) + ' · mesón');
    extras.add(onLayer(g, LAYER.cotas));
  }

  function addFloor(box) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 10, 128, 128, 128);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, '#bbb'); gr.addColorStop(0.62, '#000'); gr.addColorStop(1, '#000');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    const floor = new T.Mesh(new T.PlaneGeometry(17, 17),
      new T.MeshStandardMaterial({ color: 0x241c16, roughness: 1, transparent: true, alphaMap: new T.CanvasTexture(c), depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.set((box.min.x + box.max.x) / 2 - 0.4, 0, (box.min.z + box.max.z) / 2); floor.receiveShadow = true;
    scene.add(floor);
    // huella ferial (línea discontinua)
    const a = box.min, b = box.max, y = 0.003;
    const pts = [V3(a.x, y, a.z), V3(b.x, y, a.z), V3(b.x, y, b.z), V3(a.x, y, b.z), V3(a.x, y, a.z)];
    const ln = new T.Line(new T.BufferGeometry().setFromPoints(pts),
      new T.LineDashedMaterial({ color: 0x9c8a76, dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.55 }));
    ln.computeLineDistances(); scene.add(ln); FOOT = ln;
  }
  let FOOT = null;

  function addLights() {
    scene.add(new T.HemisphereLight(0xfff4e6, 0x2a1f17, 1.25));
    const key = new T.DirectionalLight(0xfff1e0, 2.6);
    key.position.set(-3.5, 8, 7.5); key.target.position.set(1.6, 0.8, 1.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -5.5, right: 5.5, top: 5.5, bottom: -5.5, near: 1, far: 22 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.015; key.shadow.radius = 4;
    scene.add(key, key.target);
    const fill = new T.DirectionalLight(0xffe2c2, 0.7); fill.position.set(7, 3, 4); scene.add(fill);
    const rim = new T.DirectionalLight(0xffffff, 0.55); rim.position.set(1, 4, -6); scene.add(rim);
  }

  /* ---------------- estados: empaque plano, montaje, despiece ---------------- */
  function prepareStates() {
    PIECES.forEach(p => { p.meta.s = STEP_OF[p.id]; p.ap = V3(...(APPROACH[p.id] || [0, -1, 0])).normalize(); });
    const big = new Set(['cubierta-f', 'cubierta-t', 'alero-f', 'alero-t', 'losa', 'meson', 'muro', 'bod-lado', 'bod-frente']);
    const piles = { A: { x: -1.55, z: 0.55, y: 0 }, B: { x: -1.55, z: 2.05, y: 0 } };
    const rx = new T.Quaternion().setFromAxisAngle(AX.X, -Math.PI / 2);
    [...ORDER].reverse().forEach((id, k) => {
      const p = BY[id]; const pile = big.has(id) ? piles.A : piles.B;
      const q = rx.clone();
      if (p.size.y > p.size.x) q.premultiply(new T.Quaternion().setFromAxisAngle(AX.Y, Math.PI / 2));
      const th = p.size.z, jit = ((k * 37) % 11 - 5) * 0.004;
      p.flat = { p: V3(pile.x + jit, pile.y + th / 2, pile.z - jit), q };
      pile.y += th + 0.006;
    });
    const C = V3(1.7, 1.0, 1.2);
    PIECES.forEach(p => {
      const d = p.final.p.clone().sub(C); d.y *= 0.4; d.normalize().multiplyScalar(0.55);
      d.y += p.final.p.y > 1.9 ? 0.85 : p.final.p.y > 1.6 ? 0.5 : p.final.p.y > 0.8 ? 0.25 : 0.05;
      if (p.meta.sep) d.add(V3(...p.meta.sep));                      // sale en la dirección de su encaje
      p.dir = d;
    });
    let t = 0; const DUR = 1.35, STAG = 0.34;
    ORDER.forEach((id, i) => {
      const p = BY[id];
      if (i > 0 && BY[ORDER[i - 1]].meta.s !== p.meta.s) t += 0.55;
      p.start = t; p.dur = DUR; t += STAG;
    });
    ASM.total = t + DUR;
    ASM.stepStart = STEPS.map((_, s) => Math.min(...PIECES.filter(p => p.meta.s === s).map(p => p.start)));
  }

  const ASM = { state: 'done', t: 0, total: 1, speed: 1, stepStart: [], cb: {} };
  const FX = { explode: 0, wedge: false, wedgeT: 0, draw: null, highlight: null, tease: null };
  const _p = new T.Vector3(), _q = new T.Quaternion();

  function bez(a, b, c, d, t, out) {
    const u = 1 - t;
    return out.set(0, 0, 0)
      .addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t)
      .addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t);
  }
  const _b = V3(), _c = V3(), _s = V3();
  function pose() {
    if (PROD) { const k = (FX.wedgeT % 6) / 6; PROD.position.y = FX.wedge ? smooth(0.05, 0.2, k) * (1 - smooth(0.8, 0.95, k)) * 0.28 * K : 0; }
    for (const p of PIECES) {
      const pr = ASM.state === 'done' ? 1 : ASM.state === 'flat' ? 0 : clamp((ASM.t - p.start) / p.dur);
      if (pr >= 1) { _p.copy(p.final.p); _q.copy(p.final.q); }
      else if (pr <= 0) { _p.copy(p.flat.p); _q.copy(p.flat.q); }
      else {
        // vuelo alto desde el empaque hasta el arranque de su entrada, y entrada recta por su dirección
        const P1 = 0.66;
        _s.copy(p.final.p).addScaledVector(p.ap, -0.42);
        if (pr < P1) {
          const u = ease(pr / P1), top = 3.2;
          _b.copy(p.flat.p); _b.y = top;
          _c.copy(_s); _c.y = Math.max(top, _s.y + 0.6);
          bez(p.flat.p, _b, _c, _s, u, _p);
          _q.copy(p.flat.q).slerp(p.final.q, smooth(0.08, 0.8, pr / P1));
        } else {
          _p.lerpVectors(_s, p.final.p, smooth(0, 1, (pr - P1) / (1 - P1))); _q.copy(p.final.q);
        }
      }
      if (FX.explode > 0 && pr >= 1) _p.addScaledVector(p.dir, FX.explode);
      if (p.meta.loop && FX.wedge && pr >= 1) {
        // desarme y rearme: sube el mesón, se separa el costado, vuelve todo a su sitio
        const k = (FX.wedgeT % 6) / 6;
        const up = smooth(0.05, 0.2, k) * (1 - smooth(0.8, 0.95, k));
        const side = smooth(0.22, 0.38, k) * (1 - smooth(0.62, 0.78, k));
        if (p.meta.loop === 'up') _p.y += up * 0.28;
        if (p.meta.loop === 'side') { /* el costado queda trabado por la losa: no se mueve */ }
      }
      if (FX.tease && pr >= 1) {
        const v = FX.tease.map[p.id];
        if (v !== undefined) {
          const [dist, delay] = Array.isArray(v) ? v : [v, 0];
          const k = smooth(0, 1, (FX.tease.k - delay) / Math.max(0.05, 1 - delay));
          _p.addScaledVector(p.ap, -dist * k);
        }
      }
      p.mesh.position.copy(_p); p.mesh.quaternion.copy(_q);
    }
  }

  function setTransp(m, on) { if (m.transparent !== on) { m.transparent = on; m.needsUpdate = true; } }
  function setOpaque(p) {
    setTransp(p.mat, false); p.mat.opacity = 1; p.mat.depthWrite = true;
    p.mat.emissive.setHex(0x000000); p.mat.emissiveIntensity = 1;
    p.lm.opacity = LINE_OP; p.mesh.castShadow = true;
    p.lines.geometry.setDrawRange(0, Infinity);
  }

  function updateFX(dt) {
    if (ASM.state === 'playing') {
      ASM.t += dt * ASM.speed;
      const s = ASM.stepStart.filter(v => v <= ASM.t).length - 1;
      if (s !== ASM.step) { ASM.step = s; ASM.cb.onStep && ASM.cb.onStep(s, STEPS[s]); }
      const placed = PIECES.filter(p => ASM.t >= p.start + p.dur).length;
      ASM.cb.onProgress && ASM.cb.onProgress(clamp(ASM.t / ASM.total), placed);
      if (ASM.t >= ASM.total) { ASM.state = 'done'; ASM.cb.onDone && ASM.cb.onDone(); }
    }
    if (FX.wedge) FX.wedgeT += dt;
    if (FX.draw) {
      const D = FX.draw; D.t += dt;
      let done = true;
      D.list.forEach((p, i) => {
        const t0 = i * D.gap;
        const lp = clamp((D.t - t0) / 0.9), fp = clamp((D.t - t0 - 0.55) / 0.85);
        const n = p.lines.geometry.attributes.position.count;
        p.lines.geometry.setDrawRange(0, Math.floor(n * ease(lp) / 2) * 2);
        p.mat.opacity = ease(fp); p.mesh.castShadow = fp > 0.6;
        if (fp < 1) done = false;
      });
      if (done) { D.list.forEach(setOpaque); FX.draw = null; D.cb && D.cb(); }
    }
    for (const k of ['color', 'brand']) {
      const w = TW8[k]; if (!w) continue;
      w.t += dt; const e = ease(clamp(w.t / w.dur)), v = w.from + (w.to - w.from) * e;
      k === 'color' ? applyColor(v) : applyBrand(v);
      if (w.t >= w.dur) TW8[k] = null;
    }
    DECALS.forEach(o => { o.d.material.opacity = (o.p.mat.transparent ? o.p.mat.opacity : 1) * BRAND_T; });
  }

  /* ---------------- render y vistas ---------------- */
  let renderer = null, labelsLayer = null;
  const VIEWS = [], LABELS = [];
  const PRESETS = {
    // cámara del render madre, resuelta por correspondencia de puntos (PnP, error medio 10 px de 2000)
    render: { pos: [12.33, 2.84, 17.07], target: [1.85, 1.218, 1.298], fov: 9.9 },
    hero: { pos: [12.33, 2.84, 17.07], target: [1.85, 1.218, 1.298], fov: 15.0 },
    iso: { pos: [6.4, 4.4, 8.6], target: [1.8, 1.1, 1.3], fov: 30 },
    despiece: { pos: [10.6, 7.0, 13.8], target: [1.75, 1.5, 1.2], fov: 27.5 },
    // vistas para el mockup, en metros reales (real: true no se reescala): cámara a la altura de los ojos (1,60 m)
    // frontal: encuadrada como el render de la feria (stand al centro, en la mitad baja), para que el paso al render calce
    frontal: { real: true, pos: [0.99, 1.6, 6.3], target: [0.99, 1.05, 0.62], fov: 30 },
    lateral: { real: true, pos: [-3.3, 1.6, 2.6], target: [0.95, 0.74, 0.66], fov: 30 },
    detalle: { pos: [4.55, 1.62, 2.75], target: [3.38, 0.78, 1.36], fov: 32 },
    planta: { pos: [1.85, 10.5, 1.33], target: [1.85, 0, 1.3], fov: 30 },
    morfo: { pos: [12.33, 2.84, 17.07], target: [1.7, 1.25, 1.298], fov: 21.5 },
    armado: { pos: [9.0, 5.6, 11.6], target: [1.75, 1.2, 1.25], fov: 25 },
    montaje: { pos: [4.6, 6.4, 12.4], target: [0.55, 0.85, 1.3], fov: 30 },
    posterior: { real: true, pos: [4.0, 1.7, -2.7], target: [1.0, 0.74, 0.6], fov: 30 },
    // vistas 1–4 de las diapositivas 5 y 6: cámaras calibradas sobre los renders de la IA (assets/vistas/vista_N)
    // para que el paso del modelo al render calce (puntos de la bodega, la T, el muro y el pilar en L)
    'v-1': { real: true, pos: [3.06, 2.009, 2.974], target: [0.577, 0.795, 0.23], fov: 56.5 },
    'v-2': { real: true, pos: [0.97, 1.6, 6.1], target: [0.97, 1.0, 0.62], fov: 30 },
    'v-3': { real: true, pos: [-2.309, 1.874, 4.659], target: [0.975, 1.082, 0.314], fov: 30.9 },
    'v-4': { real: true, pos: [2.298, 2.887, -2.116], target: [0.95, 0.8, 0.42], fov: 56 },
    // planos cercanos para mostrar los encajes
    grande: { pos: [12.33, 2.84, 17.07], target: [1.8, 1.25, 1.298], fov: 13.5 },
    'c-alero': { pos: [-2.7, 2.1, 6.2], target: [0.85, 1.65, 2.0], fov: 32 },
    'c-meson': { real: true, pos: [3.9, 1.7, 3.3], target: [1.55, 0.55, 0.5], fov: 30 },
    'c-cumbrera': { real: true, pos: [-2.5, 2.6, 2.9], target: [0.6, 1.1, 0.4], fov: 30 },
    'c-L': { pos: [-4.0, 2.4, -3.9], target: [0.4, 1.3, 0.4], fov: 32 },
    'c-T': { pos: [-2.0, 1.4, 6.0], target: [0.95, 1.4, 2.25], fov: 30 },
    'c-limahoya': { pos: [-3.7, 3.1, 3.2], target: [0.8, 1.85, 1.4], fov: 30 },
    'c-losa': { pos: [4.6, 4.6, -2.7], target: [1.75, 1.6, 0.6], fov: 32 }
  };


  Object.values(PRESETS).forEach(p => { if (p.real) return; p.pos = p.pos.map(v => v * K / K0); p.target = p.target.map(v => v * K / K0); });

  function toSph(pos, target) {
    const d = V3(...pos).sub(V3(...target)), r = d.length();
    return { r, theta: Math.atan2(d.x, d.z), phi: Math.acos(clamp(d.y / r, -1, 1)) };
  }

  class View {
    constructor(el, o = {}) {
      this.el = el; this.o = o;
      this.cam = new T.PerspectiveCamera(30, 1, 0.03, 120);
      this.setLayers(o.layers || [0]);
      this.active = false; this.auto = o.autoRotate || 0; this.idle = 0;
      this.cur = { r: 6, theta: 0, phi: 1.1, t: V3() }; this.goal = { r: 6, theta: 0, phi: 1.1, t: V3() };
      this.preset(o.preset || 'iso', true);
      if (o.interactive !== false) this.bind();
      VIEWS.push(this);
    }
    setLayers(ls) { this.layers = ls; this.cam.layers.disableAll(); ls.forEach(l => this.cam.layers.enable(l)); }
    toggleLayer(l, on) { const s = new Set(this.layers); on ? s.add(l) : s.delete(l); this.setLayers([...s]); }
    preset(name, instant) {
      const P = typeof name === 'string' ? PRESETS[name] : name; if (!P) return;
      if (typeof name === 'string') this.presetName = name;
      this.fly = null;
      const s = toSph(P.pos, P.target);
      Object.assign(this.goal, s); this.goal.t.set(...P.target);
      this.fovGoal = P.fov;
      if (instant) { Object.assign(this.cur, s); this.cur.t.set(...P.target); this.cam.fov = P.fov; }
      else {
        // giro por el camino corto
        while (this.goal.theta - this.cur.theta > Math.PI) this.goal.theta -= 2 * Math.PI;
        while (this.goal.theta - this.cur.theta < -Math.PI) this.goal.theta += 2 * Math.PI;
      }
    }
    intro(k = 1.35) { this.cur.r = this.goal.r * k; this.cur.theta = this.goal.theta + 0.35; }
    /* vuelo con duración fija desde un desfase (giro dth, alejamiento k, altura dphi) hasta el preset */
    flyIn(name, dur = 3, dth = 1.4, k = 1.5, dphi = -0.25) {
      this.preset(name, true);
      const g = this.goal;
      this.fly = { t: 0, dur, from: { r: g.r * k, theta: g.theta + dth, phi: clamp(g.phi + dphi, 0.08, 1.5), fov: this.fovGoal * 1.15 },
        to: { r: g.r, theta: g.theta, phi: g.phi, fov: this.fovGoal } };
      this.update(0);
    }
    /* viaje suave entre planos (cámara de la secuencia de montaje) */
    travel(name, dur = 2.2) {
      const P = PRESETS[name]; if (!P) return;
      const c = this.cur, s = toSph(P.pos, P.target);
      while (s.theta - c.theta > Math.PI) s.theta -= 2 * Math.PI;
      while (s.theta - c.theta < -Math.PI) s.theta += 2 * Math.PI;
      this.fly = { t: 0, dur, from: { r: c.r, theta: c.theta, phi: c.phi, fov: this.cam.fov, tg: c.t.clone() },
        to: { r: s.r, theta: s.theta, phi: s.phi, fov: P.fov, tg: V3(...P.target) } };
      Object.assign(this.goal, s); this.goal.t.set(...P.target); this.fovGoal = P.fov; this.presetName = name;
    }
    bind() {
      const el = this.el; let drag = null;
      el.addEventListener('pointerdown', e => {
        drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey };
        el.setPointerCapture(e.pointerId); this.idle = 4; el.classList.add('dragging');
        if (this.fly) { this.fly = null; Object.assign(this.goal, { r: this.cur.r, theta: this.cur.theta, phi: this.cur.phi }); this.goal.t.copy(this.cur.t); }
        this.el.dispatchEvent(new CustomEvent('userdrag'));
      });
      el.addEventListener('pointermove', e => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
        const k = 1 / (window.__stageScale || 1);
        if (drag.pan) {
          const right = V3().setFromMatrixColumn(this.cam.matrixWorld, 0), up = V3().setFromMatrixColumn(this.cam.matrixWorld, 1);
          const s = this.goal.r * 0.0011 * k;
          this.goal.t.addScaledVector(right, -dx * s).addScaledVector(up, dy * s);
        } else {
          this.goal.theta -= dx * 0.0062 * k;
          this.goal.phi = clamp(this.goal.phi - dy * 0.0052 * k, 0.05, 1.53);
        }
        this.idle = 4;
      });
      const end = () => { drag = null; el.classList.remove('dragging'); };
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
      el.addEventListener('contextmenu', e => e.preventDefault());
      el.addEventListener('wheel', e => {
        e.preventDefault();
        this.goal.r = clamp(this.goal.r * (1 + Math.sign(e.deltaY) * 0.09), 0.35, 30); this.idle = 4;
      }, { passive: false });
      el.addEventListener('dblclick', () => this.preset(this.presetName));
    }
    update(dt) {
      const c = this.cur, g = this.goal;
      if (this.fly) {
        const F = this.fly; F.t += dt; const e = ease(clamp(F.t / F.dur));
        c.r = F.from.r + (F.to.r - F.from.r) * e; c.theta = F.from.theta + (F.to.theta - F.from.theta) * e;
        c.phi = F.from.phi + (F.to.phi - F.from.phi) * e; this.cam.fov = F.from.fov + (F.to.fov - F.from.fov) * e;
        if (F.from.tg) c.t.lerpVectors(F.from.tg, F.to.tg, e);
        if (F.t >= F.dur) { this.fly = null; Object.assign(g, { r: c.r, theta: c.theta, phi: c.phi }); g.t.copy(c.t); }
      } else {
        if (this.idle > 0) this.idle -= dt;
        else if (this.auto) g.theta += this.auto * dt;
        const k = 1 - Math.exp(-dt * 4.2);
        c.r += (g.r - c.r) * k; c.theta += (g.theta - c.theta) * k; c.phi += (g.phi - c.phi) * k;
        c.t.lerp(g.t, k);
        this.cam.fov += (this.fovGoal - this.cam.fov) * k;
      }
      const sp = Math.sin(c.phi);
      this.cam.position.set(c.t.x + c.r * sp * Math.sin(c.theta), c.t.y + c.r * Math.cos(c.phi), c.t.z + c.r * sp * Math.cos(c.theta));
      this.cam.lookAt(c.t);
    }
  }

  function label(view, pos, text, cls = '', layer = 0) {
    const el = document.createElement('div');
    el.className = 'gl-label ' + cls; el.innerHTML = text; el.style.opacity = 0;
    labelsLayer.appendChild(el);
    const L = { el, view, pos, layer, show: true };
    LABELS.push(L); return L;
  }
  const _v = V3();
  function updateLabels() {
    for (const L of LABELS) {
      const v = L.view, ok = L.show && v.active && (!L.layer || v.layers.includes(L.layer));
      if (!ok) { L.el.style.opacity = 0; continue; }
      const r = v.rect; if (!r) { L.el.style.opacity = 0; continue; }
      _v.copy(typeof L.pos === 'function' ? L.pos() : L.pos).project(v.cam);
      if (_v.z > 1) { L.el.style.opacity = 0; continue; }
      const x = r.left + (_v.x + 1) / 2 * r.width, y = r.top + (1 - _v.y) / 2 * r.height;
      const inside = x > r.left && x < r.right && y > r.top && y < r.bottom;
      L.el.style.opacity = inside ? 1 : 0;
      L.el.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    updateFX(dt); pose();
    const W = window.innerWidth, H = window.innerHeight;
    renderer.setScissorTest(false); renderer.clear();
    renderer.setScissorTest(true);
    for (const v of VIEWS) {
      if (!v.active) { v.rect = null; continue; }
      const r = v.el.getBoundingClientRect(); v.rect = r;
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;
      v.update(dt);
      v.cam.aspect = r.width / r.height; v.cam.updateProjectionMatrix();
      const y = H - r.bottom;
      renderer.setViewport(r.left, y, r.width, r.height);
      renderer.setScissor(r.left, y, r.width, r.height);
      renderer.render(scene, v.cam);
    }
    updateLabels();
    requestAnimationFrame(loop);
  }

  function resize() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /* ---------------- API pública ---------------- */
  const API = {
    STEPS, LAYER,
    init(canvas, labels) {
      renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.useLegacyLights = false;
      renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.setClearColor(0x000000, 0);
      labelsLayer = labels;
      buildStand(); addLights();
      stand.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(stand);
      API.stats = { piezas: PIECES.length, H: box.max.y, W: box.max.x - box.min.x, D: box.max.z - box.min.z, meson: Y_MES[1] * K, losa: Y_LOS[1] * K, K, espesor: E * K };
      addFloor(box); addProducts(); addPeople(); addCotas(box); addBrand(); roofCuts();
      applyColor(1); applyBrand(1);
      prepareStates();
      resize(); window.addEventListener('resize', resize);
      requestAnimationFrame(loop);
      return API;
    },
    view(el, o) { return new View(el, o); },
    label,
    cotaLabels(view) { return COTAS.map(c => label(view, c.pos, '<span>' + c.text + '</span>', 'cota', LAYER.cotas)); },
    anchor(g) {
      const b = new T.Box3();
      PIECES.filter(p => [].concat(p.meta.g).includes(g)).forEach(p => b.expandByObject(p.mesh));
      return b.getCenter(V3());
    },
    local: (x, y, z) => W(x, y, z),
    // tableros planos: contorno real (aristas proyectadas en su plano, en metros) para el plano de corte
    cutlist() {
      const N = [V3(1, 0, 0), V3(0, 1, 0), V3(0, 0, 1), V3(0, CA, SA), V3(0, CA, -SA)];
      return PIECES.map(p => {
        const pos = p.mesh.geometry.attributes.position, v = V3();
        const ext = n => { let a = 1e9, b = -1e9; for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const d = v.dot(n); a = Math.min(a, d); b = Math.max(b, d); } return b - a; };
        const nrm = N.reduce((best, n) => ext(n) < ext(best) ? n : best);
        let [a1, a2] = N.filter(n => Math.abs(n.dot(nrm)) < 1e-6);
        if (ext(a2) > ext(a1)) [a1, a2] = [a2, a1];                    // el lado largo, horizontal
        const lp = p.lines.geometry.attributes.position, segs = [], seen = new Set();
        let u0 = 1e9, w0 = 1e9, u1 = -1e9, w1 = -1e9;
        for (let i = 0; i < lp.count; i += 2) {
          v.fromBufferAttribute(lp, i); const A = [v.dot(a1) * K, v.dot(a2) * K];
          v.fromBufferAttribute(lp, i + 1); const B = [v.dot(a1) * K, v.dot(a2) * K];
          if (Math.hypot(A[0] - B[0], A[1] - B[1]) < 1e-5) continue;    // aristas del espesor
          const key = [A, B].map(q => q.map(x => x.toFixed(4)).join(',')).sort().join('|');
          if (seen.has(key)) continue; seen.add(key);                   // cara delantera y trasera coinciden
          segs.push([A[0], A[1], B[0], B[1]]);
          u0 = Math.min(u0, A[0], B[0]); u1 = Math.max(u1, A[0], B[0]); w0 = Math.min(w0, A[1], B[1]); w1 = Math.max(w1, A[1], B[1]);
        }
        return { id: p.id, name: p.meta.name, L: u1 - u0, A: w1 - w0, segs: segs.map(s => [s[0] - u0, s[1] - w0, s[2] - u0, s[3] - w0]) };
      });
    },
    parts() {
      const N = [V3(1, 0, 0), V3(0, 1, 0), V3(0, 0, 1), V3(0, CA, SA), V3(0, CA, -SA)];
      return PIECES.map(p => {
        const g = p.mesh.geometry, pos = g.attributes.position, v = V3();
        const ext = n => { let a = 1e9, b = -1e9; for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const d = v.dot(n); a = Math.min(a, d); b = Math.max(b, d); } return b - a; };
        const nrm = N.reduce((best, n) => ext(n) < ext(best) ? n : best);
        const ax = N.filter(n => Math.abs(n.dot(nrm)) < 1e-6);
        const dims = ax.map(ext).sort((x, y) => y - x).slice(0, 2).map(d => d * K);
        return { id: p.id, name: p.meta.name, L: dims[0], A: dims[1], e: ext(nrm) * K };
      });
    },
    scene,
    world(p) { return p.mesh.getWorldPosition(V3()); },
    piece: id => BY[id],
    /* dibujo: las aristas se trazan y luego aparece el material */
    draw(cb, gap = 0.06) {
      ASM.state = 'done';
      const list = [...PIECES].sort((a, b) => (a.final.p.y - b.final.p.y) || (a.final.p.x - b.final.p.x));
      list.forEach(p => { setTransp(p.mat, true); p.mat.opacity = 0; p.mat.depthWrite = true; p.lines.geometry.setDrawRange(0, 0); p.lm.opacity = LINE_OP; p.mat.emissive.setHex(0); });
      FX.draw = { t: 0, list, gap, cb };
    },
    stopDraw() { if (FX.draw) { FX.draw.list.forEach(setOpaque); FX.draw = null; } },
    flat() { API.stopDraw(); ASM.state = 'flat'; ASM.t = 0; ASM.step = -1; FX.explode = 0; },
    assembled() { ASM.state = 'done'; ASM.t = ASM.total; },
    assemble(cb = {}, speed = 1) {
      API.stopDraw(); API.highlight(null);
      FX.explode = 0; ASM.cb = cb; ASM.speed = speed; ASM.t = 0; ASM.step = -1; ASM.state = 'playing';
    },
    get assembling() { return ASM.state === 'playing'; },
    get state() { return ASM.state; },
    explode(v) { FX.explode = v; },
    color(on, dur = 0) { if (on === undefined) return COLOR_ON; tweenTo('color', +on, dur); },
    brand(on, dur = 0) { if (on === undefined) return BRAND_ON; tweenTo('brand', +on, dur); },
    /* encajes: desplaza piezas sueltas (id → [dx, dy, dz]) por un factor 0..1, para mostrar cómo entran */
    tease(map, k = 0) { FX.tease = map ? { map, k } : null; },
    wedge(on) { FX.wedge = on; FX.wedgeT = 0; },
    highlight(g) {
      FX.highlight = g;
      PIECES.forEach(p => {
        if (!g) { setOpaque(p); return; }
        const on = [].concat(p.meta.g).includes(g);
        setTransp(p.mat, !on); p.mat.opacity = on ? 1 : 0.13; p.mat.depthWrite = on;
        p.mat.emissive.setHex(on ? 0xc4874a : 0x000000); p.mat.emissiveIntensity = on ? 0.32 : 1;
        p.lm.opacity = on ? 0.95 : 0.14; p.mesh.castShadow = on;
      });
    },
    // toma exacta de una vista; aspect fuerza la proporción (las vistas 1–4 son 4:3, igual que su recuadro)
    capture(view, width = 2400, bg = 0x16110d, aspect = null) {
      const r = view.el.getBoundingClientRect();
      const h = Math.round(width / (aspect || r.width / r.height));
      renderer.setPixelRatio(1); renderer.setSize(width, h, false);
      renderer.setScissorTest(false); renderer.setViewport(0, 0, width, h);
      renderer.setClearColor(bg, 1); renderer.clear();
      view.cam.aspect = width / h; view.cam.updateProjectionMatrix();
      if (FOOT) FOOT.visible = false;                                    // sin la línea de huella: la toma va a la IA
      renderer.render(scene, view.cam);
      if (FOOT) FOOT.visible = true;
      const url = renderer.domElement.toDataURL('image/png');
      renderer.setClearColor(0x000000, 0); resize();
      return url;
    }
  };
  window.Stand3D = API;
})();
