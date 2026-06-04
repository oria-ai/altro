// Build a Skybox prompt from the room the client picked (world + archetype + material),
// so the generated panorama matches its on-screen name (e.g. "amber and gold").
const NEG = 'plain, austere, empty, modern furniture, minimal, fisheye distortion, warped lines, blurry, watermark, signage, text, people';

export function buildPrompt(world, archetype, material){
  const a = (archetype || '').slice(0, 160);
  const m = (material || '').slice(0, 40);
  if (world === 'fuori'){
    return {
      // Anchor every view to the SAME grounds: constant palette + constant light, with the
      // room's material as a minor accent. Continuity language makes the rooms read as one place.
      prompt: `another part of the grounds of ONE single grand Roman palazzo on the Aventine Hill — ${a}. Constant palette throughout the estate: warm travertine and honey stone, cypress and citrus, terracotta, with subtle ${m} accents. The SAME bright late-afternoon Roman sunlight, the same clear blue sky, and the rooftops and domes of Rome in the same distance as every other view — so it clearly reads as one continuous place, not a different location. Photoreal architectural photography, equirectangular 360 panorama, consistent architectural style, no people, no text`,
      negative_text: NEG,
    };
  }
  return {
    prompt: `another room inside ONE single continuous palace — the most opulent imaginable, a sumptuous fusion of Roman palazzo and Arabian-Nights palace. This room is ${a}, with subtle ${m} accents over the palace's constant scheme of warm honey marble and polished gold. The SAME architecture throughout every room: gilded arches, intricate Moorish mosaics and tilework, polychrome marble floors, carved muqarnas honeycomb ceilings, crystal lamps, silk drapery. The same warm golden interior light and the same palette as every other room, so it unmistakably reads as the same building, not a different palace. Photoreal architectural photography, equirectangular 360 panorama, consistent architectural style, no people, no text`,
    negative_text: NEG,
  };
}
