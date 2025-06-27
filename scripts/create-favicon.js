const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function createFavicon() {
  const pngBuffer = fs.readFileSync(
    path.join(__dirname, "../public/favicon.png")
  );

  // Convert PNG to ICO format
  await sharp(pngBuffer)
    .resize(32, 32)
    .toFile(path.join(__dirname, "../public/favicon.ico"));

  // // // // console.log("Favicon created successfully!");
}

createFavicon().catch(console.error);
