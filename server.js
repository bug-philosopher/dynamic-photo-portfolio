// server.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const exifr = require("exifr");

const app = express();

// folder that holds albums
const PHOTO_ROOT = path.join(__dirname, "photos");

// serve the frontend
app.use(express.static(path.join(__dirname, "public")));
// Serve raw image files
app.use("/photos", express.static(PHOTO_ROOT));

// list only subfolders
async function listAlbumFolders() {
  const entries = await fs.promises.readdir(PHOTO_ROOT, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

// list images inside a folder
async function listImagesInAlbum(albumName) {
  const albumPath = path.join(PHOTO_ROOT, albumName);
  const entries = await fs.promises.readdir(albumPath, { withFileTypes: true });

  const imageFiles = entries
    .filter(e => e.isFile())
    .map(e => e.name)
    .filter(name => {
      const ext = path.extname(name).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
    });

  // gather file stats + EXIF
  const photoPromises = imageFiles.map(async filename => {
    const fullPath = path.join(albumPath, filename);
    const stats = await fs.promises.stat(fullPath);

    let exif = {};
    try {
      exif = await exifr.parse(fullPath, [
        "Model", "Make", "LensModel", "FNumber",
        "ExposureTime", "ISO", "FocalLength"
      ]) || {};
    } catch (err) {
      console.warn("EXIF read error:", err.message);
    }

    // building metadata stuff
    const camera = exif.Model || exif.Make || null;
    const lens = exif.LensModel || null;
    const aperture = exif.FNumber ? `f/${exif.FNumber}` : null;
    const shutter = exif.ExposureTime ? `${exif.ExposureTime}s` : null;
    const iso = exif.ISO ? `ISO ${exif.ISO}` : null;
    const focalLength = exif.FocalLength ? `${exif.FocalLength}mm` : null;

    return {
      filename,
      url: `/photos/${encodeURIComponent(albumName)}/${encodeURIComponent(filename)}`,
      createdAt: stats.birthtimeMs || stats.mtimeMs,
      meta: { camera, lens, aperture, shutter, iso, focalLength }
    };
  });

  const photos = await Promise.all(photoPromises);

  // Sort by creation time, oldest first
  photos.sort((a, b) => a.createdAt - b.createdAt);

  return photos;
}

// list albums
app.get("/api/albums", async (req, res) => {
  try {
    const folders = await listAlbumFolders();

    const albums = await Promise.all(
      folders.map(async name => {
        const photos = await listImagesInAlbum(name);
        const cover = photos[0] ? photos[0].url : null;
        return {
          name,
          albumId: name, // use the real folder name as id
          cover,
          photoCount: photos.length
        };
      })
    );

    // Sort albums by name, can change to sort by date
    albums.sort((a, b) => a.name.localeCompare(b.name));

    res.json({ albums });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load albums" });
  }
});

// single album photos
app.get("/api/albums/:albumId", async (req, res) => {
  const albumId = req.params.albumId;

  try {
    const albumPath = path.join(PHOTO_ROOT, albumId);
    if (!fs.existsSync(albumPath)) {
      return res.status(404).json({ error: "Album not found" });
    }

    const photos = await listImagesInAlbum(albumId);
    res.json({ album: { name: albumId, albumId }, photos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load album" });
  }
});

// Fallback route to serve the SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
