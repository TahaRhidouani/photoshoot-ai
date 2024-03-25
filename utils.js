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
        .extend({ top: Math.ceil(addHeight), bottom: Math.floor(addHeight), left: Math.ceil(addWidth), right: Math.floor(addWidth), background: "#000000" })
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

async function generateModel(id, gender, imgNum) {
  let classData = {};

  if (gender == "man") {
    classData["data"] = process.env.MODEL_URL + "/regularization-images-man.zip";
    classData["amount"] = 4820;
  } else if (gender == "woman") {
    classData["data"] = process.env.MODEL_URL + "/regularization-images-woman.zip";
    classData["amount"] = 4420;
  } else {
    classData["data"] = process.env.MODEL_URL + "/regularization-images-other.zip";
    classData["amount"] = 2115;
  }

  const body = {
    input: {
      instance_prompt: "photo of a cjw " + gender,
      class_prompt: "photo of a " + gender,
      instance_data: process.env.URL + "/user-pictures/" + id,
      class_data: classData["data"],
      max_train_steps: 150 * imgNum,
      num_class_images: Math.min(classData["amount"], 150 * imgNum),
      ckpt_base: process.env.MODEL_URL + "/base-model.ckpt",
    },
    model: "tahainc/dreambooth-models",
    trainer_version: "a8ba568da0313951a6b311b43b1ea3bf9f2ef7b9fd97ed94cebd7ffd2da66654",
    template_version: "e9639aebcd8c92810d487efe5df25078b350583d83228867b35ae4aee6557a2c",
    webhook_completed: process.env.URL + "/model-completed/" + id,
  };

  const response = await fetch("https://dreambooth-api-experimental.replicate.com/v1/trainings", {
    method: "POST",
    headers: {
      Authorization: "Token " + process.env.REPLICATE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    sendError(await response.text());
  }
}

async function generateImage(id, model, settings) {
  let ObjectID = mongoose.Types.ObjectId;
  settings.imgId = new ObjectID();

  const response = await replicate.predictions.create({ version: model, input: settings, webhook: process.env.URL + "/picture-completed/" + id });

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
