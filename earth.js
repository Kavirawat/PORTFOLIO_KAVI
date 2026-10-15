
(function () {
  'use strict';

  function initEarth() {
    const container = document.getElementById('earth-container');
    if (!container) return;

    if (typeof THREE === 'undefined') {
      console.warn('Three.js not loaded.');
      return;
    }

    const CONFIG = {
      autoRotateSpeed: 0.038, 
      pointSize: 0.015,       
      fillSize: 0.011,        
      backOpacity: 0.08,      
      waveAmplitude: 0.008,
      waveFrequency: 10.0,
      waveSpeed: 1.5,
      pointColor: 0x8ef550,   
      fillColor: 0x48c71f,    
      pinDotColor: 0xebffdb,  
      pinHaloColor: 0x7cf03d, 
      forceColor: 0xafff70,   
      pinSize: 0.016,
      haloScale: 12,
      cameraZ: 2.9,
      forceGain: 0.08,      
      forceRadius: 0.65,    
      springK: 2.0,         
      springC: 6.5,         
      tintDispScale: 18.0,
      tintVelScale: 4.0,
      pins: [
        { lat: 28.6139, lon: 77.2090 } 
      ]
    };

    container.innerHTML = '';

    const width = container.clientWidth || 580;
    const height = container.clientHeight || 580;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, CONFIG.cameraZ);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.22;
    globeGroup.rotation.y = 3.32; 
    globeGroup.rotation.z = -0.06;
    scene.add(globeGroup);
    window.__globeGroup = globeGroup;

    function createDotTexture() {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 26.24, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(32, 32, 31.5, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 1;
      tex.generateMipmaps = false;
      return tex;
    }

    function createHaloTexture() {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
      grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    }

    const dotTex = createDotTexture();
    const haloTex = createHaloTexture();
    const shaderUniformsList = [];

    function createGlobePointsMaterial(color, size, opacity, backOpacity, killBack) {
      const mat = new THREE.PointsMaterial({
        color: new THREE.Color(color),
        size: size,
        sizeAttenuation: true,
        depthWrite: false,
        transparent: true,
        map: dotTex,
        alphaTest: 0,
        opacity: opacity || 1.0
      });

      mat.toneMapped = false;
      mat.onBeforeCompile = function (shader) {
        shader.uniforms.uBackOpacity = { value: backOpacity };
        shader.uniforms.uForceColor = { value: new THREE.Color(CONFIG.forceColor) };
        shader.uniforms.uWaveAmp = { value: CONFIG.waveAmplitude };
        shader.uniforms.uWaveFreq = { value: CONFIG.waveFrequency };
        shader.uniforms.uWaveSpeed = { value: CONFIG.waveSpeed };
        shader.uniforms.uWaveTime = { value: 0 };
        shaderUniformsList.push(shader.uniforms);

        if (killBack) {
          shader.defines = shader.defines || {};
          shader.defines.KILL_BACK = 1;
        }

        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWorldPos;
          varying float vForce;
          attribute float aForce;
          attribute vec3 aOrig;
          uniform float uWaveAmp;
          uniform float uWaveFreq;
          uniform float uWaveSpeed;
          uniform float uWaveTime;
          `
        ).replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          transformed += aOrig * (uWaveAmp * sin(aOrig.y * uWaveFreq + uWaveTime * uWaveSpeed));
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vForce = aForce;
          `
        ).replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          float ndv = dot(normalize(cameraPosition - vWorldPos), normalize(vWorldPos));
          gl_PointSize *= mix(0.6, 1.0, smoothstep(0.0, 0.25, ndv));
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWorldPos;
          varying float vForce;
          uniform float uBackOpacity;
          uniform vec3 uForceColor;
          `
        ).replace(
          '#include <opaque_fragment>',
          `{
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            vec3 normalDir = normalize(vWorldPos);
            float nd = dot(viewDir, normalDir);
            #ifdef KILL_BACK
              if (nd <= 0.0) discard;
            #else
              diffuseColor.a *= mix(uBackOpacity, 1.0, smoothstep(0.0, 0.25, nd));
            #endif
            outgoingLight = mix(diffuseColor.rgb, uForceColor, clamp(vForce, 0.0, 1.0));
          }
          #include <opaque_fragment>
          `
        );
      };

      return mat;
    }

    let profileMesh = null;
    function setupProfilePlane() {
      const img = new Image();
      img.onload = function () {
        const nw = img.naturalWidth || 1230;
        const nh = img.naturalHeight || 1278;

        const c = document.createElement('canvas');
        c.width = nw;
        c.height = nh;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, nw, nh);

        const imgData = ctx.getImageData(0, 0, nw, nh);
        const data = imgData.data;
        const halfW = nw * 0.5;
        const halfH = nh * 0.5;
        const safeW = halfW * 0.96;
        const safeH = halfH * 0.96;

        for (let y = 0; y < nh; y++) {
          const dy = Math.abs((y - halfH) / safeH);
          const dy3 = dy * dy * dy; 
          const yOffset = y * nw * 4;

          for (let x = 0; x < nw; x++) {
            const dx = Math.abs((x - halfW) / safeW);
            const dx3 = dx * dx * dx;
            const dist = Math.pow(dx3 + dy3, 1 / 3);

            let alpha = 1.0;
            if (dist > 1.0) {
              alpha = 0.0;
            } else if (dist > 0.82) {
              const t = (dist - 0.82) / 0.18;
              alpha = 1.0 - t * t * (3 - 2 * t);
            }

            const idx = yOffset + x * 4 + 3;
            data[idx] = Math.round(data[idx] * alpha);
          }
        }
        ctx.putImageData(imgData, 0, 0);

        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;

        const aspect = nw / nh;
        const planeHeight = 1.82;
        const planeWidth = planeHeight * aspect;

        const planeGeo = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const planeMat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: true,
          depthTest: true,
          toneMapped: false,
          alphaTest: 0.10
        });

        profileMesh = new THREE.Mesh(planeGeo, planeMat);
        
        profileMesh.position.set(0, 0.0, 0.0);
        profileMesh.renderOrder = 1;
        scene.add(profileMesh);

        const htmlImgBox = document.querySelector('.home-img .img-box');
        if (htmlImgBox) htmlImgBox.style.display = 'none';
      };

      img.src = window.KAVIR_JPEG_DATA || 'photos/kavir.jpeg';
    }

    setupProfilePlane();

    let edgeMesh, fillMesh;
    let origEdge, dispEdge, velEdge, posEdge, aForceEdge;
    let origFill, dispFill, velFill, posFill, aForceFill;

    if (window.GLOBE_DATA) {
      const rawEdge = window.GLOBE_DATA.getEdgePoints();
      const rawFill = window.GLOBE_DATA.getFillPoints();

      origEdge = new Float32Array(rawEdge);
      dispEdge = new Float32Array(rawEdge.length);
      velEdge = new Float32Array(rawEdge.length);
      aForceEdge = new Float32Array(rawEdge.length / 3);

      const edgeGeo = new THREE.BufferGeometry();
      edgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rawEdge), 3));
      edgeGeo.setAttribute('aOrig', new THREE.BufferAttribute(origEdge, 3));
      edgeGeo.setAttribute('aForce', new THREE.BufferAttribute(aForceEdge, 1));
      posEdge = edgeGeo.attributes.position.array;

      const edgeMat = createGlobePointsMaterial(CONFIG.pointColor, CONFIG.pointSize, 1.0, CONFIG.backOpacity, false);
      edgeMesh = new THREE.Points(edgeGeo, edgeMat);
      edgeMesh.renderOrder = 2; 
      globeGroup.add(edgeMesh);

      origFill = new Float32Array(rawFill);
      dispFill = new Float32Array(rawFill.length);
      velFill = new Float32Array(rawFill.length);
      aForceFill = new Float32Array(rawFill.length / 3);

      const fillGeo = new THREE.BufferGeometry();
      fillGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rawFill), 3));
      fillGeo.setAttribute('aOrig', new THREE.BufferAttribute(origFill, 3));
      fillGeo.setAttribute('aForce', new THREE.BufferAttribute(aForceFill, 1));
      posFill = fillGeo.attributes.position.array;

      const fillMat = createGlobePointsMaterial(CONFIG.fillColor, CONFIG.fillSize, 0.9, CONFIG.backOpacity, true);
      fillMesh = new THREE.Points(fillGeo, fillMat);
      fillMesh.renderOrder = 2; 
      globeGroup.add(fillMesh);
    }

    function lonLatToVec3(lon, lat, radius) {
      radius = radius || 1.0;
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon + 180);
      return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    }

    const pinGroups = [];
    CONFIG.pins.forEach((pin) => {
      const pos = lonLatToVec3(pin.lon, pin.lat, 1.002);
      const group = new THREE.Group();
      group.position.copy(pos);
      group.renderOrder = 3;

      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(CONFIG.pinSize, 16, 16),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(CONFIG.pinDotColor) })
      );
      bead.renderOrder = 3;
      group.add(bead);

      const spriteMat = new THREE.SpriteMaterial({
        map: haloTex,
        color: new THREE.Color(CONFIG.pinHaloColor || CONFIG.pinDotColor),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(spriteMat);
      const hScale = CONFIG.pinSize * CONFIG.haloScale;
      sprite.scale.set(hScale, hScale, hScale);
      sprite.renderOrder = 3;
      group.add(sprite);

      pinGroups.push({ group, sprite, baseScale: hScale, phase: Math.random() * Math.PI * 2 });
      globeGroup.add(group);
    });

    function applyForce(hitPos, strength, radius, origArr, dispArr, velArr) {
      const r2 = radius * radius;
      const hx = hitPos.x, hy = hitPos.y, hz = hitPos.z;

      for (let i = 0; i < origArr.length; i += 3) {
        const px = origArr[i] + dispArr[i];
        const py = origArr[i + 1] + dispArr[i + 1];
        const pz = origArr[i + 2] + dispArr[i + 2];
        const dx = px - hx;
        const dy = py - hy;
        const dz = pz - hz;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq > r2) continue;

        const d = Math.sqrt(distSq);
        if (d < 1e-5) continue;

        const v = 1.0 - d / radius;
        const S = v * v * strength;
        const E = 1.0 / d;

        velArr[i]     += dx * E * S;
        velArr[i + 1] += dy * E * S;
        velArr[i + 2] += dz * E * S;
      }
    }

    function integrateSprings(origArr, dispArr, velArr, posArr, forceAttrArr, dt) {
      const k = CONFIG.springK;
      const c = CONFIG.springC;
      const dispScale = CONFIG.tintDispScale;
      const velScale = CONFIG.tintVelScale;

      for (let i = 0, u = 0; i < dispArr.length; i += 3, u++) {
        const dx = dispArr[i], dy = dispArr[i + 1], dz = dispArr[i + 2];
        const vx = velArr[i], vy = velArr[i + 1], vz = velArr[i + 2];

        if (dx * dx + dy * dy + dz * dz < 1e-9 && vx * vx + vy * vy + vz * vz < 1e-9) {
          posArr[i] = origArr[i];
          posArr[i + 1] = origArr[i + 1];
          posArr[i + 2] = origArr[i + 2];
          forceAttrArr[u] = 0;
          continue;
        }

        const nvx = vx + (-k * dx - c * vx) * dt;
        const nvy = vy + (-k * dy - c * vy) * dt;
        const nvz = vz + (-k * dz - c * vz) * dt;

        const ndx = dx + nvx * dt;
        const ndy = dy + nvy * dt;
        const ndz = dz + nvz * dt;

        dispArr[i] = ndx;
        dispArr[i + 1] = ndy;
        dispArr[i + 2] = ndz;

        velArr[i] = nvx;
        velArr[i + 1] = nvy;
        velArr[i + 2] = nvz;

        posArr[i] = origArr[i] + ndx;
        posArr[i + 1] = origArr[i + 1] + ndy;
        posArr[i + 2] = origArr[i + 2] + ndz;

        const dispMag = Math.sqrt(ndx * ndx + ndy * ndy + ndz * ndz) * dispScale;
        const velMag = Math.sqrt(nvx * nvx + nvy * nvy + nvz * nvz) * velScale;
        forceAttrArr[u] = Math.min(1.0, Math.max(dispMag, velMag));
      }
    }

    const raycaster = new THREE.Raycaster();
    const sphereTarget = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1.0);
    const transformedSphere = new THREE.Sphere();
    const hitPointWorld = new THREE.Vector3();
    const hitPointLocal = new THREE.Vector3();
    let prevHitLocal = null;
    let prevHitTime = performance.now();

    function getEventCoords(e) {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      if (e.changedTouches && e.changedTouches.length > 0) {
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      }
      if (typeof e.clientX === 'number') {
        return { x: e.clientX, y: e.clientY };
      }
      return { x: 0, y: 0 };
    }

    function getLocalHitFromCoords(clientX, clientY) {
      if (!renderer || !renderer.domElement) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return null;

      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        return null;
      }

      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      transformedSphere.copy(sphereTarget).applyMatrix4(globeGroup.matrixWorld);

      const ray = raycaster.ray;
      const diff = new THREE.Vector3().subVectors(ray.origin, transformedSphere.center);
      const b = ray.direction.dot(diff);
      const c = diff.dot(diff) - transformedSphere.radius * transformedSphere.radius;
      const disc = b * b - c;

      if (disc < 0) return null;

      const t = -b - Math.sqrt(disc);
      hitPointWorld.copy(ray.origin).addScaledVector(ray.direction, t);
      hitPointLocal.copy(hitPointWorld);
      globeGroup.worldToLocal(hitPointLocal);
      return hitPointLocal;
    }

    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let dragVelocity = { x: 0, y: 0 };
    let activePointer = {
      active: false,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      isTouch: false
    };

    let touchStartedOnEarth = false;
    let mouseStartedOnEarth = false;

    function onPointerDown(e) {
      const homeSec = container.closest('section');
      if (homeSec && !homeSec.classList.contains('active')) {
        return;
      }

      const isTouch = !!(e.touches && e.touches.length > 0);
      const coords = getEventCoords(e);
      activePointer.active = true;
      activePointer.x = coords.x;
      activePointer.y = coords.y;
      activePointer.startX = coords.x;
      activePointer.startY = coords.y;
      activePointer.isTouch = isTouch;

      if (isTouch) {
        touchStartedOnEarth = true;
      } else {
        mouseStartedOnEarth = true;
      }

      prevMousePos = { x: coords.x, y: coords.y };
      dragVelocity = { x: 0, y: 0 };

      isDragging = !isTouch;

      globeGroup.updateMatrixWorld(true);
      const hit = getLocalHitFromCoords(coords.x, coords.y);
      if (hit && origEdge && origFill) {
        
        const blastStrength = isTouch ? 0.85 : 0.55;
        const blastRadius = isTouch ? CONFIG.forceRadius * 1.25 : CONFIG.forceRadius;
        applyForce(hit, blastStrength, blastRadius, origEdge, dispEdge, velEdge);
        applyForce(hit, blastStrength, blastRadius, origFill, dispFill, velFill);
        prevHitLocal = prevHitLocal || new THREE.Vector3();
        prevHitLocal.copy(hit);
        prevHitTime = performance.now();
      }
    }

    function onPointerMove(e) {
      const isTouch = !!(e.touches && e.touches.length > 0);
      // Critical: If touch did NOT start on earth container, do not track or drag!
      if (isTouch && !touchStartedOnEarth) {
        return;
      }

      const coords = getEventCoords(e);
      const clientX = coords.x;
      const clientY = coords.y;

      if (isTouch) {
        const moveDist = Math.hypot(clientX - activePointer.startX, clientY - activePointer.startY);
        if (moveDist > 6) {
          isDragging = true;
        }
        activePointer.active = true;
        activePointer.x = clientX;
        activePointer.y = clientY;
        activePointer.isTouch = true;
      }

      if (isDragging) {
        const deltaX = clientX - prevMousePos.x;
        const deltaY = clientY - prevMousePos.y;

        const rotFactor = isTouch ? 0.004 : 0.007;
        globeGroup.rotation.y += deltaX * rotFactor;
        globeGroup.rotation.x += deltaY * rotFactor;
        globeGroup.rotation.x = Math.max(-0.85, Math.min(0.85, globeGroup.rotation.x));

        dragVelocity = { x: deltaX * rotFactor, y: deltaY * rotFactor };
        prevMousePos = { x: clientX, y: clientY };
      }

      globeGroup.updateMatrixWorld(true);
      const hit = getLocalHitFromCoords(clientX, clientY);
      const now = performance.now();

      if (hit && origEdge && origFill) {
        if (isTouch) {
          
          const touchSpeed = 0.65;
          const touchRadius = CONFIG.forceRadius * 1.25;
          applyForce(hit, touchSpeed, touchRadius, origEdge, dispEdge, velEdge);
          applyForce(hit, touchSpeed, touchRadius, origFill, dispFill, velFill);
        } else if (prevHitLocal) {
          const dt = (now - prevHitTime) / 1000;
          if (dt > 0 && dt < 0.25) {
            const dx = hit.x - prevHitLocal.x;
            const dy = hit.y - prevHitLocal.y;
            const dz = hit.z - prevHitLocal.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const speed = Math.min(Math.max(dist / dt, 0.2), 6.0) * CONFIG.forceGain;

            if (speed > 0.001) {
              applyForce(hit, speed, CONFIG.forceRadius, origEdge, dispEdge, velEdge);
              applyForce(hit, speed, CONFIG.forceRadius, origFill, dispFill, velFill);
            }
          }
        } else {
          
          applyForce(hit, 0.35, CONFIG.forceRadius, origEdge, dispEdge, velEdge);
          applyForce(hit, 0.35, CONFIG.forceRadius, origFill, dispFill, velFill);
        }
      }

      if (hit) {
        prevHitLocal = prevHitLocal || new THREE.Vector3();
        prevHitLocal.copy(hit);
        prevHitTime = now;
      } else {
        prevHitLocal = null;
      }
    }

    function onPointerUp() {
      isDragging = false;
      touchStartedOnEarth = false;
      mouseStartedOnEarth = false;
      activePointer.active = false;
      prevHitLocal = null;
    }

    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    container.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (!touchStartedOnEarth) return;
      onPointerMove(e);
      if (isDragging && e.cancelable) {
        
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('touchend', onPointerUp, { passive: true });
    window.addEventListener('touchcancel', onPointerUp, { passive: true });

    function handleResize() {
      if (!container) return;
      const w = container.clientWidth || 580;
      const h = container.clientHeight || 580;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }

    window.addEventListener('resize', handleResize);
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(handleResize);
      ro.observe(container);
    }

    let animId = null;
    let lastTime = 0;

    function renderLoop(time) {
      animId = requestAnimationFrame(renderLoop);

      if (!lastTime) {
        lastTime = time;
      }
      const dt = Math.max(0.001, Math.min((time - lastTime) / 1000, 0.08));
      lastTime = time;

      shaderUniformsList.forEach((u) => {
        if (u.uWaveTime) u.uWaveTime.value = time * 0.001;
      });

      if (activePointer.active && activePointer.isTouch && origEdge && origFill) {
        globeGroup.updateMatrixWorld(true);
        const currentHit = getLocalHitFromCoords(activePointer.x, activePointer.y);
        if (currentHit) {
          const sustainForce = 0.40;
          const touchRadius = CONFIG.forceRadius * 1.2;
          applyForce(currentHit, sustainForce, touchRadius, origEdge, dispEdge, velEdge);
          applyForce(currentHit, sustainForce, touchRadius, origFill, dispFill, velFill);
        }
      }

      if (origEdge && origFill) {
        integrateSprings(origEdge, dispEdge, velEdge, posEdge, aForceEdge, dt);
        integrateSprings(origFill, dispFill, velFill, posFill, aForceFill, dt);

        edgeMesh.geometry.attributes.position.needsUpdate = true;
        fillMesh.geometry.attributes.position.needsUpdate = true;
        edgeMesh.geometry.attributes.aForce.needsUpdate = true;
        fillMesh.geometry.attributes.aForce.needsUpdate = true;
      }

      if (!isDragging) {
        globeGroup.rotation.y += dragVelocity.x;
        globeGroup.rotation.x += dragVelocity.y;
        dragVelocity.x *= 0.93;
        dragVelocity.y *= 0.93;

        globeGroup.rotation.y += CONFIG.autoRotateSpeed * dt;

        if (Math.abs(dragVelocity.y) < 0.0001) {
          globeGroup.rotation.x += (0.22 - globeGroup.rotation.x) * 0.02;
        }
      }

      const pulseTime = time * 0.003;
      pinGroups.forEach((pin) => {
        const s = pin.baseScale * (1.0 + 0.3 * Math.sin(pulseTime + pin.phase));
        pin.sprite.scale.set(s, s, s);
        pin.sprite.material.opacity = 0.5 + 0.35 * Math.cos(pulseTime + pin.phase);
      });

      renderer.render(scene, camera);
    }

    animId = requestAnimationFrame(renderLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEarth);
  } else {
    initEarth();
  }
})();
