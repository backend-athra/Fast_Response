const express = require("express");
const { protect } = require("../middelware/authMiddelware");
const {
  markNotificationsAsRead,
  markSingleNotificationRead,
  getNotifications
} = require("../controllers/helpercontroller");

const admin = require("firebase-admin");
const Notification = require("../model/Notification");
const User = require("../model/user");

const router = express.Router();


// ===============================
// GET ALL NOTIFICATIONS
// ===============================
router.get("/", protect, getNotifications);


// ===============================
// MARK ALL AS READ
// ===============================
router.post("/mark-read", protect, markNotificationsAsRead);


// ===============================
// MARK SINGLE NOTIFICATION
// ===============================
router.patch("/:id/read", protect, markSingleNotificationRead);


// ===============================
// GET NOTIFICATION COUNT
// ===============================
router.get("/count", protect, async (req, res) => {
  try {

    const notifications = await Notification.find({
      user: req.user._id
    }).sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      read: false
    });

    res.json({
      success: true,
      notifications,
      notificationCount: unreadCount
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
});


// ===============================
// SAVE / UPDATE FCM TOKEN
// ===============================
router.post("/save-fcm-token", protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required"
      });
    }

    console.log("New Token:", fcmToken);

    // STEP 1: remove token from other users
    await User.updateMany(
      { fcmTokens: fcmToken },
      { $pull: { fcmTokens: fcmToken } }
    );

    // STEP 2: clean null tokens
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { fcmTokens: null } }
    );

    // STEP 3: add token to current user
    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { fcmTokens: fcmToken } }
    );

    res.json({
      success: true,
      message: "FCM token saved successfully"
    });

  } catch (err) {
    console.error("Save FCM Token Error:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// ===============================
// TEST FCM NOTIFICATION
// ===============================
router.post("/test-fcm", protect, async (req, res) => {

  try {

    const user = await User.findById(req.user._id);

    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No FCM tokens found"
      });
    }

    const tokens = user.fcmTokens;

    const message = {

      tokens: tokens,

      notification: {
        title: "Test Notification",
        body: "Ye demo FCM notification hai"
      },

      android: {
        priority: "high",
        notification: {
          channelId: "default",
          sound: "default",
          color: "#1E88E5"
        }
      },

      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1
          }
        }
      },

      data: {
        type: "TEST"
      }

    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("FCM Response:", response);

    // REMOVE INVALID TOKENS
    const invalidTokens = [];

    response.responses.forEach((resp, idx) => {

      if (!resp.success) {

        const errorCode = resp.error?.code;

        if (
          errorCode === "messaging/registration-token-not-registered" ||
          errorCode === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(tokens[idx]);
        }

      }

    });

    if (invalidTokens.length > 0) {

      await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { fcmTokens: { $in: invalidTokens } } }
      );

      console.log("Removed Invalid Tokens:", invalidTokens);

    }

    res.json({
      success: true,
      message: "Test notification sent",
      response
    });

  } catch (error) {

    console.error("FCM Test Error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

});


module.exports = router;