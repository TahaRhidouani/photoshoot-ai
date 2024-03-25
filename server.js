require("dotenv").config();

const PORT = process.env.PORT || 1120;

const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const formidable = require("formidable");
const fs = require("fs");
const app = express();
const path = require("path");
const cron = require("node-cron");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const normalizeEmail = require("normalize-email");
const sgMail = require("@sendgrid/mail");
const mongoose = require("mongoose");
const MongoDBStore = require("connect-mongodb-session")(session);
const passport = require("passport");
const stripe = require("stripe")(process.env.STRIPE_KEY);
const legal = require("./legal.json");
const generationOptions = require("./generation-options.json");
const user = require("./user");
const utils = require("./utils");
require("./auth");

const mongoStore = new MongoDBStore({
  uri: process.env.MONGO_URL,
  databaseName: "photoshoot-ai",
  collection: "users-sessions",
});

let gfs;
let client = new S3Client({ region: process.env.AWS_REGION });

app.set("view engine", "ejs");
app.use((req, res, next) => {
  if (req.originalUrl === "/payment-completed") {
    next();
  } else {
    express.json({ limit: "50mb" })(req, res, next);
  }
});
app.use(cors());
app.use(express.urlencoded({ extended: true, limit: "900mb" }));
app.use(express.static(path.join(__dirname, "views")));
app.use(
  session({
    secret: "photoshootai",
    resave: true,
    saveUninitialized: true,
    store: mongoStore,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.enable("trust proxy");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.get("/", (req, res) => {
  res.render("home.ejs", {
    mainPrice: legal["main-price"],
    mainPriceCompare: legal["main-price-compare"],
    mainPictureAmount: legal["main-picture-amount"],
    topUpPrice: legal["topup-price"],
    topUpPictureAmount: legal["topup-picture-amount"],
  });
});

app.get("/terms-and-conditions", (req, res) => {
  res.render("text.ejs", { title: "Terms & conditions", text: legal["terms-and-conditions"] });
});

app.get("/privacy-policy", (req, res) => {
  res.render("text.ejs", { title: "Privacy policy", text: legal["privacy-policy"] });
});

app.get("/data-deletion", (req, res) => {
  res.render("text.ejs", { title: "Data deletion", text: legal["data-deletion"] });
});

app.post("/forgot-password", async (req, res) => {
  const usr = await user.userModel.findOne({ email: normalizeEmail(req.body.email) }).catch((err) => {
    utils.sendError(err);
    return res.status(500).send();
  });

  if (!usr) {
    return res.status(404).send();
  } else if (!usr?.password) {
    return res.status(405).send();
  }

  const token = jwt.sign({ email: usr?.email }, usr.password, { expiresIn: "15min" });
  const link = process.env.URL + "/reset-password?id=" + usr._id + "&token=" + token;

  sgMail.send({
    from: "photoshootai@photoshootai.app",
    template_id: process.env.SENDGRID_FORGOT_PASSWORD_TEMPLATE,
    personalizations: [
      {
        to: { email: usr.email },
        dynamic_template_data: {
          link: link,
        },
      },
    ],
  });

  res.status(200).send();
});

app.get("/reset-password", async (req, res) => {
  const { id, token } = req.query;
  const usr = await user.userModel.findOne({ _id: id }).catch((err) => {
    utils.sendError(err);
  });

  if (!usr) {
    return res.status(404).send("User does not exist");
  } else if (!usr?.password) {
    return res.status(404).send("User can sign in using socials");
  }

  try {
    const { email } = jwt.verify(token, usr?.password);

    if (usr?.email !== email) {
      return res.status(404).send("This does not match database email");
    }
  } catch {
    return res.status(404).send("This link has expired");
  }

  res.render("reset-password.ejs", { email: usr?.email });
});

app.post("/reset-password", async (req, res) => {
  const { id, token, password } = req.body;

  let usr = await user.userModel.findOne({ _id: id }).catch((err) => {
    utils.sendError(err);
  });

  if (!usr) {
    return res.status(404).send({ error: "User does not exist" });
  } else if (!usr?.password) {
    return res.status(404).send({ error: "User can sign in using socials" });
  }

  try {
    const { email } = jwt.verify(token, usr?.password);

    if (usr?.email !== email) {
      return res.status(404).send({ error: "This does not match database email" });
    }
  } catch {
    return res.status(404).send({ error: "This link has expired" });
  }

  usr = await user.userModel.findOneAndUpdate({ _id: id }, { password: await bcrypt.hash(password, 10) }).catch((err) => {
    utils.sendError(err);
  });

  req.login(usr, () => {
    res.status(200).send();
  });
});

app.get("/signin", async (req, res) => {
  if (req.isAuthenticated() && (await doneSetup(req?.user))) {
    res.redirect("./dashboard");
  } else {
    req.logout((err) => {
      if (err) {
        res.redirect("./");
      }
      res.render("signin.ejs");
    });
  }
});

app.post("/signin", passport.authenticate("local"), (req, res) => {
  res.status(200).send();
});

app.post("/register", async (req, res) => {
  const emailRegex =
    /([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|"([]!#-[^-~ \t]|(\\[\t -~]))+")@([0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?(\.[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?)*|\[((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|IPv6:((((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){6}|::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){5}|[0-9A-Fa-f]{0,4}::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){4}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):)?(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){3}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,2}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){2}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,3}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,4}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::)((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3})|(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3})|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,5}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3})|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,6}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::)|(?!IPv6:)[0-9A-Za-z-]*[0-9A-Za-z]:[!-Z^-~]+)])/;

  const email = req.body.email;
  const password = await bcrypt.hash(req.body.password, 10);

  if (!(await emailExists(email)) && emailRegex.test(email)) {
    const usr = await user.userModel.findOneAndUpdate({ email: normalizeEmail(email) }, { password }).catch((err) => {
      utils.sendError(err);
    });

    if (usr) {
      req.login(usr, () => {
        res.status(200).send();
      });
    } else {
      const newUser = new user.userModel({
        email,
        password,
      });

      newUser.save();

      req.login(newUser, () => {
        res.status(200).send();
      });
    }
  } else {
    res.status(403).send();
  }
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/close",
    failureRedirect: "/close",
  })
);

app.get("/auth/microsoft", passport.authenticate("microsoft"));

app.get(
  "/auth/microsoft/callback",
  passport.authenticate("microsoft", {
    successRedirect: "/close",
    failureRedirect: "/close",
  })
);

app.get("/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect: "/close",
    failureRedirect: "/close",
  })
);

app.get("/close", (req, res) => {
  res.send("<script>window.close();</script > ");
});

app.get("/authenticated", async (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).send({ doneSetup: await doneSetup(req?.user) });
  } else {
    res.status(401).send();
  }
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send({ message: "Internal Server Error" });
    }
    res.redirect("./");
  });
});

app.post("/valid-email", async (req, res) => {
  if (await emailExists(req.body.email)) {
    res.status(409).send();
  } else {
    res.status(200).send();
  }
});

app.get("/setup", async (req, res) => {
  if (req.isAuthenticated() && (await doneSetup(req?.user))) {
    res.redirect("./dashboard");
  } else {
    req.logout((err) => {
      if (err) {
        res.redirect("./");
      }
      res.render("setup.ejs");
    });
  }
});

app.post("/setup", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(403).send({ message: "Failed authentication" });
  }

  if (await doneSetup(req?.user)) {
    return res.status(409).send();
  }

  const form = formidable({ multiples: true, keepExtensions: true, maxFiles: 100, maxFileSize: 3000 * 1024 * 1024 });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      utils.sendError(err);
      return res.status(500).send({ message: "Internal Server Error" });
    }

    for (const file of Object.values(files)) {
      if (file.size > 30 * 1024 * 1024) {
        return res.status(413).send({ message: "One or more images are too big" });
      }
    }

    let gender;
    if (!fields.gender || fields.gender === "other") {
      gender = "person";
    } else if (fields.gender === "male") {
      gender = "man";
    } else if (fields.gender === "female") {
      gender = "woman";
    }

    await deleteUserImages(req.user._id);

    try {
      const userImages = [];
      for (const file of Object.values(files)) {
        const readStream = fs.createReadStream(file.filepath);
        const writeStream = gfs.openUploadStream({
          filename: file.newFilename,
          metadata: {
            userId: req.user._id,
          },
        });

        userImages.push(writeStream.id);
        readStream.pipe(writeStream);
      }

      await user.userModel.findOneAndUpdate({ _id: req.user._id }, { gender, userImages }).catch((err) => {
        utils.sendError(err);
      });
    } catch (err) {
      utils.sendError(err);
      return res.status(500).send({ message: "Internal Server Error" });
    }

    return res.status(200).send({ email: req.user.email });
  });
});

app.get("/dashboard", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.redirect("./signin");
  } else if (await doneSetup(req?.user)) {
    await user.userModel.findOneAndUpdate({ _id: req.user._id }, { lastVisited: new Date() });
    res.render("dashboard.ejs", {
      profilPicture: req.user?.profilPicture,
      credits: req.user?.credits ?? legal["main-picture-amount"],
      ready: Boolean(req.user?.model),
      topUpPrice: legal["topup-price"],
      topUpPictureAmount: legal["topup-picture-amount"],
    });
  } else {
    res.redirect("./setup");
  }
});

app.post("/pictures", async (req, res) => {
  if (req.isAuthenticated() && (await doneSetup(req?.user)) && req.user.credits > 0) {
    let settings = {};
    let usr = await user.userModel.findOneAndUpdate({ _id: req.user.id }, { $inc: { credits: -1 } }).catch((err) => {
      utils.sendError(err);
    });

    if (req.body.source == "quick") {
      if (!req.body["aspect-ratio"]) return res.status(401).send();

      settings = {
        width: generationOptions["easy"]["settings"][req.body["aspect-ratio"]]["width"],
        height: generationOptions["easy"]["settings"][req.body["aspect-ratio"]]["height"],
      };

      options = [];

      for (const value of Object.values(req.body["photo-content"])) {
        options.push("(" + value + ")");
      }

      Object.assign(settings, generationOptions["easy"]["base"]);

      settings.prompt = settings.prompt.replace("OPTIONS", options.join(", "));
      settings.prompt = settings.prompt.replace("INSTANCE", "cjw " + usr.gender);
      settings.face_enhance_prompt = settings.face_enhance_prompt.replace("INSTANCE", "cjw " + usr.gender);
    } else if (req.body.source == "customize") {
      if (!req.body["aspect-ratio"]) return res.status(401).send();

      settings = {
        width: generationOptions["customize"]["settings"][req.body["aspect-ratio"]]["width"],
        height: generationOptions["customize"]["settings"][req.body["aspect-ratio"]]["height"],
      };

      Object.assign(settings, generationOptions["customize"]["base"]);

      settings.prompt = settings.prompt.replace("OPTIONS", "(" + req.body["prompt"] + ")");
      settings.prompt = settings.prompt.replace("INSTANCE", "cjw " + usr.gender);
      settings.face_enhance_prompt = settings.face_enhance_prompt.replace("INSTANCE", "cjw " + usr.gender);
      settings.negative_prompt = settings.negative_prompt.replace("OPTIONS", req.body["negative-prompt"]);
    } else if (req.body.source == "copycat") {
      if (!req.body["image"] || !req.body["strength"] || req.body["isCustomImage"] === null) return res.status(401).send();

      let imgBuffer;
      if (req.body["isCustomImage"]) {
        const imgBase64 = req.body["image"].split(";base64,").pop();
        imgBuffer = Buffer.from(imgBase64, "base64");
      } else {
        const imgResponse = await fetch(req.body["image"]);
        imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
      }

      let img = await utils.bufferToBase64(imgBuffer);

      settings = {
        image: img,
      };

      if (req.body["strength"] === "faint") {
        settings.prompt_strength = 0.6;
      } else if (req.body["strength"] === "medium") {
        settings.prompt_strength = 0.5;
      } else if (req.body["strength"] === "strong") {
        settings.prompt_strength = 0.4;
      }

      Object.assign(settings, generationOptions["copycat"]["base"]);
      settings.prompt = settings.prompt.replace("INSTANCE", "cjw " + usr.gender);
      settings.face_enhance_prompt = settings.face_enhance_prompt.replace("INSTANCE", "cjw " + usr.gender);
    }

    let response = await utils.generateImage(req.user._id, req.user.model, settings);

    res.status(200).send({ id: response.id, imgId: response.imgId, coldBoot: response.coldBoot, credits: req.user.credits - 1 });
  } else {
    res.status(401).send();
  }
});

app.all("/picture-completed/:id", async (req, res) => {
  if (req.body.status == "succeeded") {
    const img = req.body.output;
    const imgId = req.body.input.imgId;
    const response = await fetch(img);
    const imageBuffer = await response.arrayBuffer();

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: imgId.toString(),
      Body: imageBuffer,
    });

    try {
      await client.send(command);
    } catch (err) {
      utils.sendError(err);
    }

    const usr = await user.userModel.findOne({ _id: req.params.id }).catch((err) => {
      utils.sendError(err);
    });

    if (usr && req.body.input?.email) {
      const img = usr.generatedImages.find((img) => img._id.toString() === req.params.id);

      if (!img) {
        await user.userModel.findOneAndUpdate({ _id: req.params.id }, { $push: { generatedImages: { _id: imgId, liked: false } } }).catch((err) => {
          utils.sendError(err);
        });
      }

      sgMail.send({
        from: "photoshootai@photoshootai.app",
        template_id: process.env.SENDGRID_MODEL_COMPLETE_TEMPLATE,
        personalizations: [
          {
            to: { email: usr.email },
            dynamic_template_data: {
              userImage: process.env.URL + "/pictures/" + req.params.id + "/" + imgId,
            },
          },
        ],
      });
    } else if (usr && req.body.input?.profile_picture) {
      await user.userModel.findOneAndUpdate({ _id: req.params.id }, { profilPicture: imgId }).catch((err) => {
        utils.sendError(err);
      });
    } else {
      await user.userModel.findOneAndUpdate({ _id: req.params.id }, { $push: { generatedImages: { _id: imgId, liked: false } } }).catch((err) => {
        utils.sendError(err);
      });
    }
  } else if (req.body.status == "failed") {
    utils.sendError(req.body);

    await user.userModel.findOneAndUpdate({ _id: req.params.id }, { $inc: { credits: 1 } }).catch((err) => {
      utils.sendError(err);
    });
  }

  res.status(200).send();
});

app.get("/pictures/:id", async (req, res) => {
  if (req.isAuthenticated()) {
    const img = req.user.generatedImages.find((img) => img._id.toString() === req.params.id) ?? req.user.profilPicture == req.params.id;

    if (img) {
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: req.params.id,
      });

      res.set({
        "Cache-Control": "public, max-age=86400",
        Expires: new Date(Date.now() + 86400000).toUTCString(),
      });

      try {
        const item = await client.send(command);
        item.Body.pipe(res);
      } catch (err) {
        utils.sendError(err);
        return res.status(500).send({ message: "Internal Server Error" });
      }
    } else {
      let starting = false;

      if (req.query?.id) {
        const bootResponse = await utils.getPredictionStatus(req.query.id);

        if (bootResponse?.status === "starting") {
          starting = true;
        } else if (bootResponse?.status === "failed") {
          starting = null;
        }
      }

      res.status(404).send({ starting });
    }
  } else {
    res.status(401).send();
  }
});

app.get("/pictures/:user/:id", async (req, res) => {
  const usr = await user.userModel.findOne({ _id: req.params.user }).catch((err) => {
    utils.sendError(err);
  });

  if (!usr) return res.status(404).send();

  const img = usr.generatedImages.find((img) => img._id.toString() === req.params.id) ?? req.user.profilPicture == req.params.id;

  if (img) {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: req.params.id,
    });

    res.set({
      "Cache-Control": "public, max-age=86400",
      Expires: new Date(Date.now() + 86400000).toUTCString(),
    });

    try {
      const item = await client.send(command);
      item.Body.pipe(res);
    } catch (err) {
      utils.sendError(err);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  } else {
    res.status(404).send();
  }
});

app.get("/pictures", async (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).send({ images: req.user.generatedImages });
  } else {
    res.status(401).send();
  }
});

app.get("/categories/:category", async (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).send({ categories: generationOptions["easy"]["options"][req.params.category] });
  } else {
    res.status(401).send();
  }
});

app.get("/copycat-gallery", async (req, res) => {
  if (req.isAuthenticated()) {
    let images;

    if (req.user.gender === "person") {
      images = generationOptions["copycat"]["options"]["man"].concat(generationOptions["copycat"]["options"]["woman"]);
    } else {
      images = generationOptions["copycat"]["options"][req.user.gender];
    }

    res.status(200).send({ images: shuffle(images) });
  } else {
    res.status(401).send();
  }
});

app.post("/like-picture", async (req, res) => {
  if (req.isAuthenticated()) {
    const usr = await user.userModel.findOne({ _id: req.user.id });
    const img = usr.generatedImages.find((img) => img._id.toString() === req.body.id);

    img.liked = req.body.liked;

    await usr.save();

    res.status(200).send({ liked: img.liked });
  } else {
    res.status(401).send();
  }
});

app.get("/credits", async (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).send({ credits: req.user.credits });
  } else {
    res.status(401).send();
  }
});

app.get("/user-pictures/:id", (req, res) => {
  const id = req.params.id.replace(/[^A-Za-z0-9]/g, "");
  res.download(path.join(__dirname, "uploads/" + id + ".zip"));
});

app.all("/model-completed/:id", async (req, res) => {
  try {
    if (req.body.status == "succeeded") {
      const usr = await user.userModel.findOne({ _id: req.params.id });

      if (usr.model) return res.status(200).send();

      usr.model = req.body.version;
      usr.save();

      settings = {};
      Object.assign(settings, generationOptions["profile_picture"]["base"]);
      settings.prompt = settings.prompt.replace("INSTANCE", "cjw " + usr.gender);
      settings.face_enhance_prompt = settings.face_enhance_prompt.replace("INSTANCE", "cjw " + usr.gender);
      await utils.generateImage(req.params.id, req.body.version, settings);

      settings = {};
      Object.assign(settings, generationOptions["email"]["base"]);
      settings.prompt = settings.prompt.replace("INSTANCE", "cjw " + usr.gender);
      settings.face_enhance_prompt = settings.face_enhance_prompt.replace("INSTANCE", "cjw " + usr.gender);
      await utils.generateImage(req.params.id, req.body.version, settings);

      fs.unlinkSync(path.join(__dirname, "uploads/" + req.params.id + ".zip"));
    } else if (req.body.status == "failed") {
      utils.sendError(req.body);
    }
  } catch (err) {
    utils.sendError(err);
  }

  res.status(200).send();
});

app.get("/model-completed", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(403).send({ message: "Failed authentication" });
  }

  res.status(200).send({ ready: Boolean(req?.user?.model) && Boolean(req?.user?.profilPicture) });
});

app.post("/create-payment-intent", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(403).send({ message: "Failed authentication" });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: req.body.item === "main" ? legal["main-price"] * 100 : legal["topup-price"] * 100,
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
    capture_method: "automatic",
  });

  if (req.body.item === "main") {
    await user.userModel.findOneAndUpdate({ _id: req.user._id }, { mainPaymentID: paymentIntent.id }).catch((err) => {
      utils.sendError(err);
      return res.status(500).send({ message: "Internal Server Error" });
    });
  } else if (req.body.item === "topup") {
    await user.userModel.findOneAndUpdate({ _id: req.user._id }, { topupPaymentID: paymentIntent.id }).catch((err) => {
      utils.sendError(err);
      return res.status(500).send({ message: "Internal Server Error" });
    });
  }

  res.send({
    clientSecret: paymentIntent.client_secret,
    price: paymentIntent.amount / 100,
    email: req.user.email,
  });
});

app.get("/payment-complete", (req, res) => {
  res.send(
    "<html lang='en'><head><script> !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '1361276824737553', { em: '" +
      (req?.user?.email ? req?.user?.email : "") +
      "', fn: '" +
      (req?.user?.gender == "man" ? "m" : req?.user?.gender == "woman" ? "f" : "") +
      "'}); </script> <noscript><img height='1' width='1' style='display:none' src='https://www.facebook.com/tr?id=1361276824737553&ev=PageView&noscript=1' /></noscript></head><body></body><script>fbq('track', 'Purchase'); location.href = '/dashboard'; </script></html>"
  );
});

app.post("/payment-completed", express.raw({ type: "application/json" }), async (req, res) => {
  let event = req.body;
  const endpointSecret = process.env.STRIPE_ENDPOINT;

  if (endpointSecret) {
    const signature = req.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
    } catch (err) {
      utils.sendError(err.message);
      return res.status(400).send();
    }
  }

  if (event.type == "payment_intent.succeeded") {
    res.status(200).send();

    if (event.data.object.amount === legal["main-price"] * 100) {
      let usr = await user.userModel.findOne({ mainPaymentID: event.data.object.id }).catch((err) => {
        utils.sendError(err);
      });

      if (usr && usr.model === null) {
        try {
          const usrImgs = await getUserImages(usr._id);

          usr.credits = legal["main-picture-amount"];
          usr.model = "";
          usr.save();

          await utils.processImages(usrImgs, usr._id);
          await deleteUserImages(usr._id);
          await utils.generateModel(usr._id, usr.gender, usrImgs.length);
        } catch (err) {
          utils.sendError(err);
        }
      }
    } else if (event.data.object.amount === legal["topup-price"] * 100) {
      await user.userModel.findOneAndUpdate({ topupPaymentID: event.data.object.id }, { $inc: { credits: legal["topup-picture-amount"] } }).catch((err) => {
        utils.sendError(err);
      });
    }
  }
});

app.get("*", (req, res) => {
  res.status(404).render("404.ejs");
});

async function emailExists(email) {
  const usr = await user.userModel.findOne({ email: normalizeEmail(email) }).catch((err) => {
    utils.sendError(err);
  });

  if (await doneSetup(usr)) {
    return true;
  }

  return false;
}

async function deleteUserImages(id) {
  let ObjectID = mongoose.Types.ObjectId;
  const files = await gfs.find({ "filename.metadata.userId": new ObjectID(id) }).toArray();

  files.forEach((file) => {
    gfs.delete(file._id);
  });
}

async function getUserImages(id) {
  let images = [];
  let ObjectID = mongoose.Types.ObjectId;
  const files = await gfs.find({ "filename.metadata.userId": new ObjectID(id) }).toArray();

  const readImages = files.map(async (file) => {
    try {
      const readStream = gfs.openDownloadStream(file._id);

      const chunks = [];
      let imageBuffer;

      await new Promise((resolve, reject) => {
        readStream.on("data", (chunk) => {
          chunks.push(chunk);
        });

        readStream.on("end", () => {
          imageBuffer = Buffer.concat(chunks);

          images.push({ data: imageBuffer, filename: file.filename.filename });
          resolve();
        });

        readStream.on("error", (err) => {
          reject(err);
        });
      });
    } catch (err) {
      utils.sendError("An error occurred while reading the image:", err);
    }
  });

  await Promise.all(readImages);
  return images;
}

async function doneSetup(user) {
  if (!user || !user.mainPaymentID) {
    return false;
  }

  const status = (await stripe.paymentIntents.retrieve(user.mainPaymentID)).status;

  if (!status || status == "requires_payment_method" || status == "canceled") {
    return false;
  } else {
    return true;
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

cron.schedule("0 0 * * *", async () => {
  const now = new Date();

  const uncompletedAccountsDeadline = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const uncompletedAccounts = await user.userModel.find({ lastVisited: { $lt: uncompletedAccountsDeadline }, model: { $eq: null } });

  uncompletedAccounts.forEach(async (usr) => {
    await deleteUserImages(usr.id);
    await user.userModel.findByIdAndDelete(usr.id);
  });

  const inactiveAccountsCloseDeadline = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate() + 1);
  const inactiveAccountsDeadline = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  const inactiveAccountsWarning = await user.userModel.find({ lastVisited: { $lt: inactiveAccountsCloseDeadline, $gt: inactiveAccountsDeadline } });
  const inactiveAccounts = await user.userModel.find({ lastVisited: { $lt: inactiveAccountsDeadline } });

  inactiveAccountsWarning.forEach(async (usr) => {
    sgMail.send({
      from: "photoshootai@photoshootai.app",
      template_id: process.env.SENDGRID_INACTIVE_ACCOUNT_TEMPLATE,
      personalizations: [
        {
          to: { email: usr.email },
        },
      ],
    });
  });

  inactiveAccounts.forEach(async (usr) => {
    const imgs = usr.generatedImages.map((img) => {
      return { Key: img._id };
    });
    const command = new DeleteObjectsCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Delete: {
        Objects: imgs,
      },
    });

    try {
      await client.send(command);
    } catch (err) {
      utils.sendError(err);
    }

    await user.userModel.findByIdAndDelete(usr.id);
  });
});

app.listen(PORT, async () => {
  await mongoose.connect(process.env.MONGO_URL);

  gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });

  console.log("\nListening on port " + PORT);
  utils.sendError("Server has been restarted.");
});

process.on("uncaughtException", (err) => {
  utils.sendError(err);
});

process.on("unhandledRejection", (reason, promise) => {
  utils.sendError(reason);
});
