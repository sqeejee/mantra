const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
require('dotenv').config();

const mongoUrl = process.env.DB_URL;
const dbName = 'Cluster0';
const collectionName = 'messages';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  MongoClient.connect(mongoUrl, (err, client) => {
    if (err) {
      console.error('Error connecting to MongoDB:', err);
      return res.status(500).send('Internal Server Error');
    }

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    collection.find({}).sort({ _id: -1 }).toArray((err, messages) => {
      if (err) {
        console.error('Error querying MongoDB:', err);
        client.close(); // Close the MongoDB connection
        return res.status(500).send('Internal Server Error');
      }

      if (!messages || messages.length === 0) {
        // Handle case where there are no messages
        const emptyMessage = { timestamp: 'No messages available' };
        return res.render('home.ejs', { recentMessage: emptyMessage, otherMessages: [] });
      }

      const recentMessage = messages[0];
      const otherMessages = messages.filter((_, index) => index % 2 !== 0);

      recentMessage.timestamp = new Date(recentMessage.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      res.render('home.ejs', { recentMessage, otherMessages });

      client.close(); // Close the MongoDB connection after rendering
    });
  });
});

app.post('/submit', (req, res) => {
  const { username, message } = req.body;

  MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    if (err) {
      console.error('Error connecting to MongoDB:', err);
      return res.status(500).send('Internal Server Error');
    }

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const newMessage = {
      username: username || 'Anonymous',
      message,
      timestamp: new Date()
    };

    collection.insertOne(newMessage, (err, result) => {
      if (err) {
        console.error('Error inserting message:', err);
        client.close(); // Close the MongoDB connection
        return res.status(500).send('Internal Server Error');
      }
      console.log('Message inserted:', newMessage);
      res.redirect('/');
      client.close(); // Close the MongoDB connection after inserting
    });
  });
});

const port = process.env.PORT || 3000; // Use PORT from environment variable or default to 3000
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
