const { Router } = require("express");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const randtoken = require("rand-token");
const notificationsRouter = Router();
const admin = require("firebase-admin");
const fetch = require('node-fetch');

var serviceAccount = require("../../mimo-3ef92-firebase-adminsdk-gschq-c7e02cf8a6.json");
const messaging = admin.messaging();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // name: "mimo-3ef92",
      databaseURL: "https://mimo-3ef92.firebaseio.com",
  });
}
const db = admin.firestore();

notificationsRouter.post('/massiveShipment', async (req, res) => {
    console.log(req.body);
    const batchSize = 500;
    const allTokens = [];

    // Obtener los tokens de los usuarios activos
    const querySnapshot = await db.collection('client').where('activo', '==', 1).get();
    querySnapshot.forEach(doc => {
        const token = doc.data().token;
        if (token) {
            allTokens.push(token);
        }
    });

    const messages = [];
    for (let i = 0; i < allTokens.length; i += batchSize) {
        const batch = allTokens.slice(i, i + batchSize);
        const message = {
            notification: {
                title: req.body.title,
                body: req.body.description,
            },
            tokens: batch,
        };
        if (req.body.image) {
            message.notification.image = req.body.image;
        }
        messages.push(message);
    }

    try {
        const promises = messages.map(message => {
            console.log(message);
            return messaging.sendMulticast(message)
                .then(response => {
                    console.log(`${response.successCount} notifications sent successfully`);
                    if (response.failureCount > 0) {
                        console.error(`Failed to send ${response.failureCount} notifications`);
                    }
                })
                .catch(error => {
                    console.error('Error sending notification:', error);
                });
        });

        await Promise.all(promises);
        res.status(200).send('All notifications sent successfully');
    } catch (error) {
        console.error('Error sending notifications:', error);
        res.status(500).send('Error sending notifications');
    }
});
module.exports = {
  notificationsRouter,
};
