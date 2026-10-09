// Comparación de siluetas GLB vs modelo paramétrico (solo para verificación)
window.diffSetup = () => {
  const r = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  const S = 800; r.setSize(S, S); r.setPixelRatio(1);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const mine = [], all = [];
  Stand3D.scene.traverse(o => { all.push(o); if (o.isMesh && o !== window.glb && o.geometry.type !== 'PlaneGeometry' && o.layers.mask === 1) mine.push(o); });
  function render(which, view, sliceAxis, slice) {
    const keep = new Set(which === 'glb' ? [glb] : mine);
    const vis = all.map(o => o.visible);
    all.forEach(o => { if (o.isMesh || o.isLine || o.isLineSegments || o.isPoints) o.visible = false; });
    keep.forEach(o => { o.visible = true; let p = o.parent; while (p) { p.visible = true; p = p.parent; } });
    const sc = Stand3D.scene; const om = sc.overrideMaterial; sc.overrideMaterial = white;
    const cam = new THREE.OrthographicCamera(-2.0, 2.0, 2.0, -2.0, 0.01, 50);
    const c = { x: 1.85, y: 1.35, z: 1.32 };
    if (view === 'front') { cam.position.set(c.x, c.y, 20); cam.lookAt(c.x, c.y, 0); }
    if (view === 'left') { cam.position.set(-20, c.y, c.z); cam.lookAt(0, c.y, c.z); }
    if (view === 'right') { cam.position.set(20, c.y, c.z); cam.lookAt(0, c.y, c.z); }
    if (view === 'back') { cam.position.set(c.x, c.y, -20); cam.lookAt(c.x, c.y, 0); }
    if (view === 'top') { cam.position.set(c.x, 20, c.z); cam.up.set(0, 0, -1); cam.lookAt(c.x, 0, c.z); }
    r.setClearColor(0x000000, 1); r.clear(); r.render(sc, cam);
    sc.overrideMaterial = om; all.forEach((o, i) => o.visible = vis[i]);
    const px = new Uint8Array(S * S * 4); r.getContext().readPixels(0, 0, S, S, r.getContext().RGBA, r.getContext().UNSIGNED_BYTE, px);
    const m = new Uint8Array(S * S); for (let i = 0; i < S * S; i++) m[i] = px[i * 4] > 127 ? 1 : 0; return m;
  }
  window.diff = (view) => {
    const a = render('glb', view), b = render('mine', view);
    let inter = 0, uni = 0, onlyA = 0, onlyB = 0;
    const cv = document.createElement('canvas'); cv.width = cv.height = S; const ctx = cv.getContext('2d'); const im = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (S - 1 - y) * S + x, j = (y * S + x) * 4, A = a[i], B = b[i];
      if (A && B) inter++; if (A || B) uni++; if (A && !B) onlyA++; if (B && !A) onlyB++;
      im.data[j] = A && !B ? 255 : (A && B ? 200 : 0); im.data[j + 1] = B && !A ? 255 : (A && B ? 200 : 0); im.data[j + 2] = A && B ? 200 : 0; im.data[j + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    let host = document.getElementById('diffimg'); if (!host) { host = document.createElement('img'); host.id = 'diffimg'; host.style.cssText = 'position:fixed;left:0;top:0;width:min(100vw,100vh);z-index:9;image-rendering:pixelated'; document.body.appendChild(host); }
    host.src = cv.toDataURL();
    return { view, IoU: +(inter / uni).toFixed(4), soloGLB: onlyA, soloModelo: onlyB, total: uni };
  };
  return 'ok';
};
