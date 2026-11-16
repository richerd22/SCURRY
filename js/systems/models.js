// SCURRY - sourced-model plumbing. CC0/CC-BY GLBs live in assets/models/
// (originals + license ledger in ~/workspace/gamewell/assets-library/).
// Every load is best-effort: if a model fails, the procedural build stays.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = new Map();
let pending = 0;
const settleWaiters = [];

// -> Promise<{scene, animations} | null>
export function loadModel(url) {
  if (!cache.has(url)) {
    pending++;
    const p = loader.loadAsync(url).then((g) => ({ scene: g.scene, animations: g.animations }))
      .catch((e) => { console.warn('[scurry] model failed to load:', url, e); return null; });
    p.then(() => {
      pending--;
      if (pending === 0) settleWaiters.splice(0).forEach((r) => r());
    });
    cache.set(url, p);
  }
  return cache.get(url);
}

// Resolves once every load started so far has finished (used by shot mode).
export function whenModelsSettled() {
  if (pending === 0) return Promise.resolve();
  return new Promise((r) => settleWaiters.push(r));
}

export function cloneModel(tpl) {
  return skeletonClone(tpl.scene);
}

// Find an animation clip by its short name ('Walk'), tolerating the
// 'Armature|Armature|Walk' prefixes Blender exports produce.
export function findClip(anims, short) {
  if (!anims || !anims.length) return null;
  return anims.find((a) => a.name === short)
    || anims.find((a) => a.name.endsWith('|' + short))
    || anims.find((a) => a.name.toLowerCase().includes(short.toLowerCase()))
    || null;
}

// Scale an object so its bounding-box height equals target metres, with its
// feet on y=0 and its footprint centered on x/z = 0.
export function fitHeight(obj, target) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y > 0.0001 && isFinite(size.y)) {
    obj.scale.multiplyScalar(target / size.y);
    obj.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(obj);
    obj.position.x -= (b2.min.x + b2.max.x) / 2;
    obj.position.z -= (b2.min.z + b2.max.z) / 2;
    obj.position.y -= b2.min.y;
  }
  return obj;
}

export function shadowify(obj) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
}
