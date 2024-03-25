const mongoose = require("mongoose");
const normalizeEmail = require("normalize-email");
const Schema = mongoose.Schema;

const processEmail = (eml) => {
  return normalizeEmail(eml);
};

const userSchema = new Schema({
  email: {
    type: String,
    set: processEmail,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    default: null,
  },
  gender: {
    type: String,
    enum: ["man", "woman", "person"],
    default: "person",
  },
  profilPicture: {
    type: String,
    default: null,
  },
  model: {
    type: String,
    default: null,
  },
  mainPaymentID: {
    type: String,
    default: null,
  },
  topupPaymentID: {
    type: String,
    default: null,
  },
  credits: {
    type: Number,
    default: null,
  },
  generatedImages: [
    {
      liked: Boolean,
    },
  ],
  lastVisited: {
    type: Date,
    default: Date.now,
  },
});

let userModel = mongoose.model("user", userSchema, "user");

module.exports = { userModel };
