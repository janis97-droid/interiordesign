import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

class InteriorAO extends GTAOPass {
  render(...args) {
    // Window panes transmit daylight and must not occlude the room in the
    // normal/depth pass. The main colour pass still renders their reflections.
    const glass = [];
    this.scene.traverse((object) => {
      if (object.isMesh && object.visible && object.material.transparent) {
        glass.push(object);
        object.visible = false;
      }
    });
    try {
      super.render(...args);
    } finally {
      for (const pane of glass) pane.visible = true;
    }
  }
}

export function createEnvironment(renderer, night = false) {
  // A neutral sky, not a fabricated photograph of the surroundings.
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const sky = ctx.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, night ? "#070f23" : "#6e9fc7");
  sky.addColorStop(0.43, night ? "#18263c" : "#bfd6e6");
  sky.addColorStop(0.51, night ? "#243148" : "#e2e6df");
  sky.addColorStop(1, night ? "#101622" : "#a4ada2");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(texture).texture;
  pmrem.dispose();
  return { sky: texture, environment };
}

export function createRendering(renderer, scene, camera) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new InteriorAO(
    scene,
    camera,
    1,
    1,
    undefined,
    { radius: 0.22, thickness: 0.12, distanceFallOff: 1, samples: 8 },
    { samples: 8, radius: 4 },
  );
  ao.blendIntensity = 0.7;
  composer.addPass(ao);
  composer.addPass(new OutputPass());
  renderer.info.autoReset = false;
  return {
    resize(width, height) {
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      composer.setSize(width, height);
      // Contact shadows at half resolution keep the mobile view responsive.
      ao.setSize(
        Math.max(1, Math.round(width * 0.6)),
        Math.max(1, Math.round(height * 0.6)),
      );
    },
    render() {
      renderer.info.reset();
      composer.render();
    },
  };
}
