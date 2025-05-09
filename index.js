const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('Listening for new leads...');

let lastLeadId = null;

db.collection('leads')
  .orderBy('timestamp', 'desc')
  .limit(1)
  .onSnapshot(snapshot => {
    console.log('Snapshot received');
    if (snapshot.empty) return;
    const doc = snapshot.docs[0];
    console.log('Detected lead document ID:', doc.id);
    console.log('Lead data:', doc.data());
    if (!lastLeadId) {
      lastLeadId = doc.id;
      return;
    }
    if (doc.id !== lastLeadId) {
      lastLeadId = doc.id;
      const lead = doc.data();
      sendNotificationToAllUsers(lead, doc.id);
    }
  });

async function sendNotificationToAllUsers(lead, leadId) {
  console.log('sendNotificationToAllUsers called for lead:', leadId);
  const usersSnapshot = await db.collection('users').get();
  const tokens = [];
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.fcmToken) tokens.push(data.fcmToken);
  });
  console.log('Found tokens:', tokens);
  if (tokens.length === 0) {
    console.log('No FCM tokens found.');
    return;
  }
  const message = {
    notification: {
      title: 'New Lead Created',
      body: `${lead.name || 'New Lead'} - ${lead.loanType || ''}`
    },
    data: {
      leadId: leadId
    },
    tokens: tokens
  };
  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log('Notification sent:', response.successCount, 'successes');
  } catch (err) {
    console.error('Error sending notification:', err);
  }
} 