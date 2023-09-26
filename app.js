const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
require("dotenv").config();

const mongoUrl = process.env.DB_URL;
const dbName = "Cluster0";
const collectionName = "messages";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

async function fetchMessages() {
  try {
    const client = await MongoClient.connect(mongoUrl);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const messages = await collection.find({}).sort({ _id: -1 }).toArray();
    client.close();
    return messages;
  } catch (err) {
    console.error("Error querying MongoDB:", err);
    throw err;
  }
}

app.get("/", async (req, res) => {
  try {
    const messages = await fetchMessages();

    if (!messages || messages.length === 0) {
      const emptyMessage = { timestamp: "No messages available" };
      return res.render("home.ejs", {
        recentMessage: emptyMessage,
        otherMessages: [],
      });
    }

    const recentMessage = messages[0];
    const otherMessages = messages.filter((_, index) => index % 2 !== 0);

    recentMessage.timestamp = new Date(recentMessage.timestamp).toLocaleString(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );

    res.render("home.ejs", { recentMessage, otherMessages });
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
});

app.post("/submit", async (req, res) => {
  const { username, message } = req.body;

  try {
    const client = await MongoClient.connect(mongoUrl);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const newMessage = {
      username: username || "Anonymous",
      message,
      timestamp: new Date(),
    };

    await collection.insertOne(newMessage);
    console.log("Message inserted:", newMessage);
    res.redirect("/");
    client.close();
  } catch (err) {
    console.error("Error inserting message:", err);
    return res.status(500).send("Internal Server Error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
