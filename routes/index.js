const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const Event = require("../models/Event");
const { isAdmin, isLoggedIn, isWarden } = require("../middleware/auth");
const { sendResetEmail } = require("../utils/mailer");
const crypto = require("crypto");
const Announcement = require("../models/Announcement");
const Resource = require("../models/Resource");
const Scholar = require("../models/Scholar");
const Essential = require("../models/Essential");
const Review = require("../models/Review");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.get("/", async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });

    res.render("index", {
      title: "Hindu Hostel | Home",
      announcements,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const prompt = `System: You are the "HH Assistant," the digital caretaker of Hindu Hostel (Estd. 1901), University of Allahabad.
        Your tone is professional, institutional, and slightly italic/formal, matching the portal's aesthetic.
        Rules:
        1. Always refer to users as "Resident."
        2. If asked about complaints, tell them to use the "Complaints" section.
        3. If asked about website or portal, tell them to conatct admins or visit "https://hindu-hostel.onrender.com".
        4. Your knowledge is focused on hostel life, academics at UoA, and Allahabad (Prayagraj) geography.
        5. Keep responses concise (under 3 sentences) to fit the mobile UI and don't use font formating like bold or italics.
        Resident says: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("CHAT ERROR:", error);
    res.status(500).json({
      reply: "Server Error: System recalibrating!",
    });
  }
});

router.get("/hostel-events", isLoggedIn, async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    res.render("events", {
      title: "Hostel Events | Hindu Hostel",
      events: events,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading history chronicles.");
  }
});

router.get("/student/academic-vault", isLoggedIn, async (req, res) => {
  try {
    const resources = await Resource.find().sort("subject");
    res.render("student/resources", {
      title: "Academic Vault | Hindu Hostel",
      resources,
    });
  } catch (err) {
    res.redirect("/");
  }
});

router.get("/scholars", async (req, res) => {
  try {
    const scholars = await Scholar.find().sort({ name: 1 });
    res.render("history", {
      title: "Hall of Eminence | Hindu Hostel",
      scholars,
    });
  } catch (err) {
    console.error("Fetch Error:", err);
    res.redirect("/");
  }
});

router.get("/helpdesk", async (req, res) => {
  try {
    const essentials = await Essential.find().sort({ category: 1 });
    res.render("helpdesk", { title: "Resident Helpdesk", essentials });
  } catch (err) {
    res.redirect("/");
  }
});

router.get("/login", (req, res) => {
  res.render("login", { title: "Login | Hindu Hostel" });
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      req.flash("error", info.message);
      return res.redirect("/login");
    }

    req.logIn(user, (err) => {
      if (err) return next(err);

      req.flash("success_msg", `Welcome back, ${user.name}!`);

      return res.redirect("/");
    });
  })(req, res, next);
});

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success_msg", "You are logged out.");
    res.redirect("/");
  });
});

router.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      tokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash(
        "error_msg",
        "Link expired or invalid. Please contact the Warden or Admin.",
      );
      return res.redirect("/login");
    }

    res.render("set-password", {
      title: "Activate Account",
      token: req.params.token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Verification Error.");
  }
});

router.post("/activate-account", async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      req.flash("error_msg", "Passwords do not match.");
      return res.redirect("back");
    }

    const user = await User.findOne({
      verificationToken: token,
      tokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error_msg", "Invalid or expired session.");
      return res.redirect("/login");
    }

    user.password = await bcrypt.hash(password, 10);
    user.isVerified = true;
    user.verificationToken = undefined;
    user.tokenExpires = undefined;

    await user.save();

    req.flash(
      "success_msg",
      "Account activated successfully! You can now log in.",
    );
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Account activation failed.");
  }
});

router.get("/forgot-password", (req, res) => {
  res.render("forgot-password", { title: "Reset Password" });
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      req.flash(
        "error_msg",
        "If an account exists with that email, a link has been sent.",
      );
      return res.redirect("/forgot-password");
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    await sendResetEmail(user.email, user.name, token);

    req.flash("success_msg", "Check your inbox for the reset link.");
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.redirect("/forgot-password");
  }
});

router.get("/reset-password/:token", async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash("error_msg", "Password reset token is invalid or has expired.");
    return res.redirect("/forgot-password");
  }

  res.render("reset-password", {
    token: req.params.token,
    title: "Set New Password",
  });
});

router.post("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error_msg", "Token expired.");
      return res.redirect("/forgot-password");
    }

    if (req.body.password !== req.body.confirmPassword) {
      req.flash("error_msg", "Passwords do not match.");
      return res.redirect("back");
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.flash("success_msg", "Password reset successful. Log in to continue.");
    res.redirect("/login");
  } catch (err) {
    res.redirect("back");
  }
});

module.exports = router;
