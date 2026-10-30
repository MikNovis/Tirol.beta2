"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Header as on lafamille.group: white over the hero, light background after 100px,
// hides while scrolling down and comes back when scrolling up
const header = $(".header");
const hero = $(".hero-projects");
let lastY = window.scrollY;
function onScroll() {
  const y = window.scrollY;
  const scrolled = y > 100;
  const open = header.classList.contains("active");
  header.classList.toggle("border", scrolled);
  header.classList.toggle("bg", scrolled);
  header.classList.toggle("white", Boolean(hero) && !scrolled);
  header.classList.toggle("hidden", !open && scrolled && y > lastY);
  lastY = y;
  document.body.classList.toggle("past-hero", y > (hero ? hero.offsetHeight : 600));
}
let scrollTimer = 0;
window.addEventListener(
  "scroll",
  () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(onScroll, 10);
  },
  { passive: true },
);
onScroll();

// "Проекты" and the mobile burger open the projects panel
const panelButtons = $$(".projects-button, .header-burger");
function setPanel(open) {
  header.classList.toggle("active", open);
  document.body.classList.toggle("unscroll", open);
  panelButtons.forEach((button) => button.setAttribute("aria-expanded", String(open)));
}
panelButtons.forEach((button) =>
  button.addEventListener("click", () => setPanel(!header.classList.contains("active"))),
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && header.classList.contains("active")) setPanel(false);
});

// Underline on hover in the header menu
$$(".text-hover-line").forEach((item) => {
  item.addEventListener("mouseenter", () => {
    if (item.classList.contains("text-hover-line-out")) {
      item.classList.add("text-hover-line-leave");
      item.classList.remove("text-hover-line-out");
      setTimeout(() => {
        item.classList.remove("text-hover-line-leave");
        item.classList.add("text-hover-line-in");
      }, 50);
    } else {
      item.classList.add("text-hover-line-in");
    }
  });
  item.addEventListener("mouseleave", () => {
    item.classList.remove("text-hover-line-in");
    item.classList.add("text-hover-line-out");
  });
});

// Hero title appears letter by letter; letters stay grouped in words so a word never breaks
$$(".split-text").forEach((title) => {
  const text = title.textContent.trim();
  let i = 0;
  title.setAttribute("aria-label", text);
  title.innerHTML = text
    .split(/\s+/)
    .map(
      (word) =>
        `<span class="word" aria-hidden="true">${[...word]
          .map((ch) => `<span class="char" style="--i:${i++}">${ch}</span>`)
          .join("")}</span>`,
    )
    .join(" ");
});

// Dialogs: close button and click outside
$$("[data-close]").forEach((button) =>
  button.addEventListener("click", () => button.closest("dialog").close()),
);
$$("dialog").forEach((dialog) =>
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  }),
);

// Gallery lightbox
const photoDialog = $("#photo-dialog");
let photos = [];
let photoIndex = 0;
function showPhoto(index) {
  if (!photos.length) return;
  photoIndex = (index + photos.length) % photos.length;
  const button = photos[photoIndex];
  const image = $("#lightbox-image");
  image.src = button.dataset.image;
  image.alt = $("img", button)?.alt || "";
  $("#photo-caption").textContent = button.dataset.caption || image.alt;
  $("#photo-count").textContent = `${photoIndex + 1} / ${photos.length}`;
}
$$("[data-image]").forEach((button) =>
  button.addEventListener("click", () => {
    photos = $$("[data-image]").filter((item) => !item.hidden);
    showPhoto(photos.indexOf(button));
    photoDialog?.showModal();
  }),
);
$(".lightbox-prev")?.addEventListener("click", () => showPhoto(photoIndex - 1));
$(".lightbox-next")?.addEventListener("click", () => showPhoto(photoIndex + 1));
photoDialog?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showPhoto(photoIndex - 1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    showPhoto(photoIndex + 1);
  }
});

// "Пять поводов": event format panels
function setFormat(panel) {
  $$(".event-panel").forEach((item) => {
    const selected = item === panel;
    item.classList.toggle("selected", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
}
$$(".event-panel").forEach((panel) => {
  panel.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") setFormat(panel);
  });
  panel.addEventListener("focus", () => setFormat(panel));
  panel.addEventListener("click", () => setFormat(panel));
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const panels = $$(".event-panel");
    const next =
      panels[(panels.indexOf(panel) + (event.key === "ArrowRight" ? 1 : -1) + panels.length) % panels.length];
    next.focus();
    setFormat(next);
  });
});

// External links open in a new tab (the shared header links stay in the same tab, as on lafamille.group)
$$('a[href^="http"]')
  .filter((link) => !link.closest(".header"))
  .forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener";
  });

// Reviews carousel: endless loop with arrows on the sides.
// Copies of the cards are added on both sides (hidden from screen readers);
// when scrolling settles inside the copies, the track jumps back to the same card among the originals.
document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const track = carousel.querySelector("[data-track]");
  const originals = [...track.children];
  const count = originals.length;
  const copy = (card) => {
    const el = card.cloneNode(true);
    el.setAttribute("aria-hidden", "true");
    el.removeAttribute("aria-label");
    el.querySelectorAll("a,button").forEach((x) => x.setAttribute("tabindex", "-1"));
    return el;
  };
  [...originals].reverse().forEach((card) => track.prepend(copy(card)));
  originals.forEach((card) => track.append(copy(card)));

  const step = () => originals[1].offsetLeft - originals[0].offsetLeft;
  const base = () => originals[0].offsetLeft;
  const jump = (left) => {
    track.style.scrollSnapType = "none";
    track.scrollLeft = left;
    track.offsetWidth; // apply before restoring snapping
    track.style.scrollSnapType = "";
  };
  function wrap() {
    const width = step() * count;
    if (track.scrollLeft < base() - step() / 2) jump(track.scrollLeft + width);
    else if (track.scrollLeft > base() + width - step() / 2) jump(track.scrollLeft - width);
  }
  const move = (dir) => {
    wrap();
    track.scrollBy({ left: dir * step(), behavior: "smooth" });
  };
  carousel.querySelector("[data-prev]").addEventListener("click", () => move(-1));
  carousel.querySelector("[data-next]").addEventListener("click", () => move(1));

  let settle = 0;
  track.addEventListener(
    "scroll",
    () => {
      clearTimeout(settle);
      settle = setTimeout(wrap, 140);
    },
    { passive: true },
  );

  let index = 0;
  track.addEventListener(
    "scroll",
    () => {
      index = Math.round((track.scrollLeft - base()) / step());
    },
    { passive: true },
  );
  window.addEventListener("resize", () => jump(base() + (((index % count) + count) % count) * step()));
  jump(base());
});
