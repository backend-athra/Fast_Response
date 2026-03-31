const admin = require("firebase-admin");
const User = require("../model/user");

async function sendPush(tokens, title, body, data = {}, userId = null) {

  try {

    if (!tokens) return;

    const tokenList = Array.isArray(tokens) ? tokens : [tokens];

    if (tokenList.length === 0) return;

    const message = {
      tokens: tokenList,

      android: {
        priority: "high",
      },

      data: {
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        title: String(title),
        body: String(body),
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("✅ Push Success:", response.successCount);
    console.log("❌ Push Fail:", response.failureCount);

    const invalidTokens = [];

    response.responses.forEach((res, index) => {

      if (!res.success) {

        const errorCode = res.error?.code;

        console.log("❌ Token Failed:", tokenList[index]);
        console.log("❌ Error:", errorCode);

        if (
          errorCode === "messaging/registration-token-not-registered" ||
          errorCode === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(tokenList[index]);
        }

      }

    });

    if (invalidTokens.length > 0 && userId) {

      await User.updateOne(
        { _id: userId },
        { $pull: { fcmTokens: { $in: invalidTokens } } }
      );

      console.log("🧹 Removed Invalid Tokens:", invalidTokens);

    }

    return response;

  } catch (error) {

    console.error("❌ Push Send Error:", error);
    return null;

  }
}

module.exports = { sendPush };