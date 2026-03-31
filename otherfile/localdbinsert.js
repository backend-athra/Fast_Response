// preTestSetup.js
const mongoose = require("mongoose");
const User = require("./model/user");
const bcrypt = require("bcrypt");

async function createTestUser() {
  await mongoose.connect("mongodb://127.0.0.1:27017/test");
  await User.deleteMany({ email: "testuser@example.com" });
  await User.create({
    firstName: "Test",
    lastName: "User",
    email: "testuser@example.com",
    password: await bcrypt.hash("password123", 10),
    role: "client",
    isEmailVerified: true,
  });
  console.log("Test user created ✅");
  await mongoose.disconnect();
}

createTestUser();
