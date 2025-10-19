const admin = require('firebase-admin');
const logger = require('./logger');

try {
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  logger.info('✅ Firebase Admin initialized');
  console.log('✅ Firebase Admin initialized');

} catch (error) {
  logger.error(`❌ Firebase initialization failed: ${error.message}`);
  console.error(`❌ Firebase Error: ${error.message}`);
}

module.exports = admin;