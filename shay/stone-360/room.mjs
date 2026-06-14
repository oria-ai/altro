// Shared: prompt -> equirectangular 360 room (light, fast, GPU-friendly).
// flux-360 native 2:1. No upscale — 4K was too heavy for the integrated GPU.
import { run, download } from './lib.mjs';

const FLUX360 = 'd26037255a2b298408505e2fbd0bf7703521daca8f07e8c8f335ba874b4aa11a';

// Room panorama height (2:1 equirect => width = 2*height). Keep light.
export const ROOM_H = 720;          // 1440 x 720 — flux-360 native max, ~1MP (light)

export async function generateRoom(userPrompt, outPath) {
  const prompt = `equirectangular 360 panorama, ${userPrompt}, seamless, photorealistic interior`;
  const out = await run(FLUX360, {
    prompt,
    aspect_ratio: 'custom', width: ROOM_H * 2, height: ROOM_H,
    num_inference_steps: 28, guidance_scale: 3,
    go_fast: true, output_format: 'jpg', output_quality: 90,
  }, { label: 'room' });
  const url = Array.isArray(out) ? out[0] : out;
  await download(url, outPath);
  console.log('  room ready:', outPath, `(${ROOM_H*2}x${ROOM_H})`);
  return outPath;
}
