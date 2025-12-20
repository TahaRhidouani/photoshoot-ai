const fs = require("fs");
const archiver = require("archiver");
const sharp = require("sharp");
const mongoose = require("mongoose");
const replicate = new (require("replicate"))({ auth: process.env.REPLICATE_KEY });
const { Client, GatewayIntentBits } = require("discord.js");

async function processImages(images, id) {
  const output = fs.createWriteStream("uploads/" + id + ".zip");
  const archive = archiver("zip");
  archive.pipe(output);

  for (const image of images) {
    try {
      const img = sharp(image.data);
      const { width, height } = await img.metadata();
      const side = Math.max(width, height);
      const addWidth = (side - width) / 2;
      const addHeight = (side - height) / 2;

      const result = await img
        .extend({
          top: Math.ceil(addHeight),
          bottom: Math.floor(addHeight),
          left: Math.ceil(addWidth),
          right: Math.floor(addWidth),
          background: "#000000",
        })
        .withMetadata()
        .toBuffer();
      const filename = image.filename;

      archive.append(result, { name: filename });
    } catch (err) {
      sendError(err);
    }
  }

  await archive.finalize();

  archive.on("error", (err) => {
    reject(err);
  });
}

async function generateModel(id) {
  const response = await replicate.trainings.create(
    "replicate",
    "fast-flux-trainer",
    "8b10794665aed907bb98a1a5324cd1d3a8bea0e9b31e65210967fb9c9e2e08ed",
    {
      destination: "taharhidouani/dreambooth-models",
      input: {
        input_images: process.env.URL + "/user-pictures/" + id,
        trigger_word: "cjw",
        lora_type: "subject",
      },
      webhook: process.env.URL + "/model-completed/" + id,
    }
  );

  if (response.status === "failed") {
    sendError(await response.text());
  }
}

async function generateImage(id, model, settings) {
  let ObjectID = mongoose.Types.ObjectId;
  settings.imgId = new ObjectID();

  const response = await replicate.predictions.create({
    version: model,
    input: settings,
    webhook: process.env.URL + "/picture-completed/" + id,
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const bootResponse = await replicate.predictions.get(response.id);

  if (bootResponse.status === "starting") {
    return { id: response.id, imgId: settings.imgId, coldBoot: true };
  } else {
    return { id: response.id, imgId: settings.imgId, coldBoot: false };
  }
}

async function getPredictionStatus(id) {
  try {
    return await replicate.predictions.get(id);
  } catch (err) {
    sendError(err);
  }
}

async function bufferToBase64(imgBuffer) {
  const img = sharp(imgBuffer);

  let imgRes = await img.toBuffer();
  let imgBase64 = imgRes.toString("base64");

  return imgBase64;
}

function sendError(err) {
  if (process.env.DISCORD_BOT_TOKEN) {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
    client.login(process.env.DISCORD_BOT_TOKEN);

    client.on("ready", () => {
      const channel = client.channels.cache.find((channel) => channel.name === "error-logs");
      channel.send("Error: " + err);
    });
  }

  console.error(err);
}

module.exports = { processImages, generateModel, generateImage, getPredictionStatus, bufferToBase64, sendError };
