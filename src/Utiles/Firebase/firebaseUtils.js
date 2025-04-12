
const admin = require('firebase-admin');
require('dotenv').config();
console.log("LLEGO A CORRER")
console.log(process.env.GOOGLE_CREDENTIALS)

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

admin.initializeApp({
    credential: admin.credential.cert(credentials),
    storageBucket: "factudata-3afdf.appspot.com"
});

const db = admin.firestore();

module.exports = { admin, db };
