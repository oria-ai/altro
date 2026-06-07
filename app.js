// Stones gallery — manifest-driven.
// stones/manifest.json is produced by pipeline/run.mjs; each entry carries an
// original photo + 4 generated variants (blur / outdoor / indoor / creative).
// Tiles show the "sophisticated blur" variant; clicking opens a lightbox that
// browses the other options.

const VARIANT_ORDER = ["blur", "outdoor", "indoor", "creative"];
const VARIANT_LABELS = {
  blur: "Sophisticated Blur",
  outdoor: "Outdoor",
  indoor: "Indoor",
  creative: "Creative",
  original: "Original",
};

let STONES = [];

// ---- Gallery ---------------------------------------------------------------

function slidesFor(stone) {
  const slides = VARIANT_ORDER.map((v) => ({
    kind: v,
    src: stone.variants[v].src,
    caption: stone.variants[v].caption,
  }));
  slides.push({ kind: "original", src: stone.original, caption: "the stone as it came" });
  return slides;
}

function makeStoneCard(stone) {
  const card = document.createElement("button");
  card.className = "stone-card";
  card.type = "button";
  card.setAttribute("aria-label", `Open ${stone.name}`);
  card.innerHTML = `
    <img class="card-img" src="${stone.variants.blur.src}" alt="${stone.name}" loading="lazy" />
    <div class="label">${stone.name}</div>
  `;
  card.addEventListener("click", () => openLightbox(stone));
  return card;
}

function renderGallery() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";
  if (!STONES.length) {
    gallery.innerHTML = `
      <div class="empty-state">
        <p>No stones yet.</p>
        <p class="hint">Drop stone photos in <code>input/</code> and run<br/>
        <code>doppler run -p oria -c dev -- node pipeline/run.mjs</code></p>
      </div>`;
    return;
  }
  for (const stone of STONES) gallery.appendChild(makeStoneCard(stone));
}

// ---- Lightbox / slider -------------------------------------------------------

const lightbox = document.getElementById("lightbox");
const track = document.getElementById("sliderTrack");
const dotsEl = document.getElementById("sliderDots");
const titleEl = document.getElementById("lightboxTitle");

let activeSlides = [];
let currentIndex = 0;

function renderSlides(stone) {
  activeSlides = slidesFor(stone);
  titleEl.textContent = stone.name;

  track.innerHTML = activeSlides
    .map(
      (s, i) => `
        <div class="slide" data-i="${i}">
          <img class="slide-img" src="${s.src}" alt="${stone.name} — ${VARIANT_LABELS[s.kind]}" />
          <div class="caption"><span class="variant-tag">${VARIANT_LABELS[s.kind]}</span> ${s.caption}</div>
        </div>
      `,
    )
    .join("");

  dotsEl.innerHTML = activeSlides
    .map((s, i) => `<button class="dot" data-i="${i}" aria-label="${VARIANT_LABELS[s.kind]}" title="${VARIANT_LABELS[s.kind]}"></button>`)
    .join("");

  dotsEl.querySelectorAll(".dot").forEach((d) => {
    d.addEventListener("click", () => goTo(Number(d.dataset.i)));
  });

  goTo(currentIndex, false);
}

function goTo(i, animate = true) {
  const max = activeSlides.length;
  currentIndex = (i + max) % max;
  track.style.transition = animate ? "" : "none";
  track.style.transform = `translateX(-${currentIndex * 100}%)`;
  if (!animate) {
    void track.offsetWidth; // force reflow then restore transition
    track.style.transition = "";
  }
  dotsEl.querySelectorAll(".dot").forEach((d, idx) => {
    d.classList.toggle("active", idx === currentIndex);
  });
}

function openLightbox(stone) {
  currentIndex = 0;
  renderSlides(stone);
  lightbox.hidden = false;
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.hidden = true;
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  activeSlides = [];
}

document.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
document.querySelector(".slider-nav.prev").addEventListener("click", () => goTo(currentIndex - 1));
document.querySelector(".slider-nav.next").addEventListener("click", () => goTo(currentIndex + 1));

lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  else if (e.key === "ArrowLeft") goTo(currentIndex - 1);
  else if (e.key === "ArrowRight") goTo(currentIndex + 1);
});

// Touch swipe
let touchStartX = null;
track.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
track.addEventListener("touchend", (e) => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 40) goTo(currentIndex + (dx < 0 ? 1 : -1));
  touchStartX = null;
});

// ---- Boot --------------------------------------------------------------------

fetch("stones/manifest.json")
  .then((r) => (r.ok ? r.json() : []))
  .catch(() => [])
  .then((data) => {
    STONES = data;
    renderGallery();
  });
