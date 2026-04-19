const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const Complaint = require("../models/Complaint");
const bcrypt = require("bcrypt");
const Review = require("../models/Review");

router.get("/profile", isLoggedIn, (req, res) => {
  res.render("student/profile", {
    title: "My Profile | Hindu Hostel",
    user: req.user,
  });
});

router.post("/update-password", isLoggedIn, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      req.flash("error_msg", "New passwords do not match.");
      return res.redirect("/student/profile");
    }

    const isMatch = await bcrypt.compare(oldPassword, req.user.password);
    if (!isMatch) {
      req.flash("error_msg", "Something went wrong!");
      return res.redirect("/student/profile");
    }

    req.user.password = await bcrypt.hash(newPassword, 10);
    await req.user.save();

    req.flash("success_msg", "Password updated successfully!");
    res.redirect("/student/profile");
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

router.post("/feedback/submit", isLoggedIn, async (req, res) => {
  try {
    const newReview = new Review({
      user: req.user._id,
      content: req.body.content,
      rating: req.body.rating,
    });
    await newReview.save();
    req.flash("success_msg", "Thank you. Your feedback has been recorded.");
    res.redirect("/");
  } catch (err) {
    console.log(`${err.message}`);
    req.flash("error_msg", `Failed to submit feedback.`);
    res.redirect("/");
  }
});

router.get("/complaints", isLoggedIn, async (req, res) => {
  try {
    const myComplaints = await Complaint.find({ student: req.user._id }).sort(
      "-createdAt",
    );

    res.render("student/complaints", {
      title: "Complaint Portal | Hindu Hostel",
      complaints: myComplaints,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading complaints.");
  }
});

router.post("/complaints/new", isLoggedIn, async (req, res) => {
  try {
    const { subject, category, description } = req.body;
    const newComplaint = new Complaint({
      student: req.user._id,
      roomNumber: req.user.roomNumber,
      subject,
      category,
      description,
    });
    await newComplaint.save();
    req.flash("success_msg", "Complaint filed successfully!");
    res.redirect("/student/dashboard");
  } catch (err) {
    res.status(500).send("Error filing complaint.");
  }
});

router.get("/dashboard", isLoggedIn, async (req, res) => {
  try {
    const myComplaints = await Complaint.find({ student: req.user._id }).sort(
      "-createdAt",
    );

    res.render("student/dashboard", {
      title: "My Portal",
      complaints: myComplaints,
    });
  } catch (err) {
    res.status(500).send("Error loading dashboard");
  }
});
module.exports = router;
