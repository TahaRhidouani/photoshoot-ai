const user = require("./user");
const bcrypt = require("bcrypt");
const passport = require("passport");
const normalizeEmail = require("normalize-email");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const MicrosoftStrategy = require("passport-microsoft").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (username, password, done) => {
      const currentUser = await getUserByEmail(username);

      if (!currentUser || !currentUser.password) {
        return done(null, false);
      }

      if (!(await bcrypt.compare(password, currentUser.password))) {
        return done(null, false);
      }

      await user.userModel.findOneAndUpdate({ _id: currentUser._id }, { lastVisited: new Date() });
      return done(null, currentUser);
    }
  )
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.URL + "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      const currentUser = await getUserByEmail(email);

      if (!currentUser) {
        const newUser = await addUser(email, null);
        return done(null, newUser);
      }

      await user.userModel.findOneAndUpdate({ _id: currentUser._id }, { lastVisited: new Date() });
      return done(null, currentUser);
    }
  )
);

passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_APPLICATION_ID,
      clientSecret: process.env.MICROSOFT_APPLICATION_SECRET,
      callbackURL: process.env.URL + "/auth/microsoft/callback",
      scope: ["user.read"],
    },
    async (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      const currentUser = await getUserByEmail(email);

      if (!currentUser) {
        const newUser = await addUser(email, null);
        return done(null, newUser);
      }

      await user.userModel.findOneAndUpdate({ _id: currentUser._id }, { lastVisited: new Date() });
      return done(null, currentUser);
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.URL + "/auth/facebook/callback",
      profileFields: ["id", "displayName", "photos", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      const email = profile?.emails[0].value;
      const currentUser = await getUserByEmail(email);

      if (!currentUser) {
        if (!email) {
          return done(null, false);
        }

        const newUser = await addUser(email, null);
        return done(null, newUser);
      }

      await user.userModel.findOneAndUpdate({ _id: currentUser._id }, { lastVisited: new Date() });
      return done(null, currentUser);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  const currentUser = await user.userModel.findOne({
    _id: id,
  });
  done(null, currentUser);
});

async function addUser(email, password) {
  const newUser = new user.userModel({
    email,
    password,
  });
  return newUser.save();
}

async function getUserByEmail(email) {
  return await user.userModel.findOne({
    email: normalizeEmail(email),
  });
}
