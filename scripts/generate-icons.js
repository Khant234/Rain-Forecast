const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function generateIcons() {
  const svgBuffer = fs.readFileSync(
    path.join(__dirname, "../public/weather-icon.svg")
  );

  // Generate PNG icons
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(__dirname, "../public/logo192.png"));

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, "../public/logo512.png"));

  // Generate smaller PNG for favicon
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(__dirname, "../public/favicon.png"));

  // // // // // console.log("Icons generated successfully!");
}

generateIcons().catch(console.error);
