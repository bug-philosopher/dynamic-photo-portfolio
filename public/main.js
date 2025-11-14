const albumListEl = document.getElementById("album-list");
const albumTitleEl = document.getElementById("album-title");
const albumCountEl = document.getElementById("album-count");
const photoGridEl = document.getElementById("photo-grid");

const lightboxEl = document.getElementById("lightbox");
const lightboxImgEl = document.getElementById("lightbox-image");
const lightboxMetaEl = document.getElementById("lightbox-meta");
const lightboxCloseEl = document.getElementById("lightbox-close");

let currentAlbumId = null;

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return await res.json();
}

async function loadAlbums() {
  try {
    const data = await fetchJSON("/api/albums");
    renderAlbumList(data.albums);
    if (data.albums.length > 0) {
      // load first album by default
      selectAlbum(data.albums[0].albumId);
    } else {
      albumTitleEl.textContent = "No albums yet";
      albumCountEl.textContent = "Drop folders into the photos directory.";
      photoGridEl.innerHTML = "";
    }
  } catch (err) {
    console.error(err);
    albumTitleEl.textContent = "Error loading albums";
  }
}

function renderAlbumList(albums) {
  albumListEl.innerHTML = "";
  albums.forEach(album => {
    const item = document.createElement("button");
    item.className = "album-item";
    item.dataset.albumId = album.albumId;

    const title = document.createElement("div");
    title.className = "album-item-title";
    title.textContent = album.name;

    const count = document.createElement("div");
    count.className = "album-item-count";
    count.textContent = album.photoCount === 1
      ? "1 photo"
      : `${album.photoCount} photos`;

    item.appendChild(title);
    item.appendChild(count);

    item.addEventListener("click", () => selectAlbum(album.albumId));
    albumListEl.appendChild(item);
  });
}

async function selectAlbum(albumId) {
  if (albumId === currentAlbumId) return;
  currentAlbumId = albumId;

  [...albumListEl.querySelectorAll(".album-item")].forEach(el => {
    el.classList.toggle("active", el.dataset.albumId === albumId);
  });

  albumTitleEl.textContent = "Loading...";
  albumCountEl.textContent = "";
  photoGridEl.innerHTML = "";

  try {
    const data = await fetchJSON(`/api/albums/${encodeURIComponent(albumId)}`);
    albumTitleEl.textContent = data.album.name;
    const count = data.photos.length;
    albumCountEl.textContent = count === 1 ? "1 photo" : `${count} photos`;
    renderPhotos(data.photos);
  } catch (err) {
    console.error(err);
    albumTitleEl.textContent = "Failed to load album";
  }
}

function renderPhotos(photos) {
  photoGridEl.innerHTML = "";

  photos.forEach(photo => {
    const card = document.createElement("article");
    card.className = "photo-card";

    const wrapper = document.createElement("div");
    wrapper.className = "photo-card-image-wrapper";

    const img = document.createElement("img");
    img.src = photo.url;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("click", () => openLightbox(photo));

    wrapper.appendChild(img);
    card.appendChild(wrapper);

    const metaBar = document.createElement("div");
    metaBar.className = "photo-meta";

    const bits = [];
    const m = photo.meta || {};
    if (m.camera) bits.push(m.camera);
    if (m.lens) bits.push(m.lens);
    if (m.focalLength) bits.push(m.focalLength);
    if (m.aperture) bits.push(m.aperture);
    if (m.shutter) bits.push(m.shutter);
    if (m.iso) bits.push(m.iso);

    bits.forEach(text => {
      const pill = document.createElement("span");
      pill.className = "meta-pill";
      pill.textContent = text;
      metaBar.appendChild(pill);
    });

    card.appendChild(metaBar);

    photoGridEl.appendChild(card);
  });
}

/* lightbox */

function openLightbox(photo) {
  lightboxImgEl.src = photo.url;
  const m = photo.meta || {};
  const parts = [];
  if (m.camera) parts.push(m.camera);
  if (m.lens) parts.push(m.lens);
  if (m.focalLength) parts.push(m.focalLength);
  if (m.aperture) parts.push(m.aperture);
  if (m.shutter) parts.push(m.shutter);
  if (m.iso) parts.push(m.iso);

  lightboxMetaEl.textContent = parts.join(" · ");
  lightboxEl.classList.remove("hidden");
}

function closeLightbox() {
  lightboxEl.classList.add("hidden");
  lightboxImgEl.src = "";
  lightboxMetaEl.textContent = "";
}

lightboxCloseEl.addEventListener("click", closeLightbox);
lightboxEl.addEventListener("click", event => {
  if (event.target === lightboxEl) closeLightbox();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeLightbox();
});

/* init */

loadAlbums();
