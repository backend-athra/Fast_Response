const mongoose = require("mongoose");
const fs = require("fs");
const Service = require("../model/servicecard"); // service model import

mongoose
  .connect("mongodb+srv://enterpricesssa:SAA2025@ssadatabase.mqs6quf.mongodb.net/?retryWrites=true&w=majority&appName=SSADATABASE")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

async function fetchAndSave() {
  try {
    const services = await Service.find(
      {},
      {
        title: 1,
        category: 1,
        serviceType: 1,
        specialization: 1,
        _id: 0
      }
    );

    fs.writeFileSync(
      "services.json",
      JSON.stringify(services, null, 2)
    );

    console.log("✅ JSON file saved: services.json");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    mongoose.connection.close();
  }
}

fetchAndSave();