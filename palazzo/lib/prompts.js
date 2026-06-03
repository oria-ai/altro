// Build a Skybox prompt from the room the client picked (world + archetype + material),
// so the generated panorama matches its on-screen name (e.g. "amber and gold").
const NEG = 'plain, austere, empty, modern furniture, minimal, fisheye distortion, warped lines, blurry, watermark, signage, text, people';

export function buildPrompt(world, archetype, material){
  const a = (archetype || '').slice(0, 160);
  const m = (material || '').slice(0, 40);
  if (world === 'fuori'){
    return {
      prompt: `a sunlit Mediterranean exterior of a grand Roman palazzo on the Aventine Hill — ${a}, accented with ${m}, warm travertine and honey stone, cypress and citrus, terracotta, an open blue Roman sky, the rooftops and domes of Rome beyond, photoreal architectural photography, no people, no text`,
      negative_text: NEG,
    };
  }
  return {
    prompt: `interior of the most opulent palace imaginable, a sumptuous fusion of Roman palazzo and Arabian-Nights palace — ${a}, richly appointed in ${m} and gold, gilded arches, intricate Moorish mosaics and tilework, polychrome marble floor, carved muqarnas honeycomb ceiling, crystal lamps, silk drapery, a marble fountain, lavish maximalist grandeur, warm golden light, photoreal, no people, no text`,
    negative_text: NEG,
  };
}
