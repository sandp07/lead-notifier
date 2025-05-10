const admin = require('firebase-admin');
const fs = require('fs');

// Load service account from file (GitHub Action will create this file)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
  // Get the last checked timestamp from a file (or use 15 minutes ago)
  let lastChecked = Date.now() - 15 * 60 * 1000;
  if (fs.existsSync('lastChecked.txt')) {
    lastChecked = parseInt(fs.readFileSync('lastChecked.txt', 'utf8'), 10);
  }

  // Query for leads added since lastChecked
  const leadsSnapshot = await db.collection('leads')
    .where('timestamp', '>', new Date(lastChecked))
    .get();

  if (leadsSnapshot.empty) {
    console.log('No new leads found.');
  } else {
    const usersSnapshot = await db.collection('users').get();
    const tokens = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) tokens.push(data.fcmToken);
    });

    leadsSnapshot.forEach(doc => {
      const lead = doc.data();
      const message = {
        notification: {
          title: 'New Lead Created',
          body: `${lead.name || 'New Lead'} - ${lead.loanType || ''}`
        },
        data: {
          leadId: doc.id
        },
        tokens: tokens
      };
      admin.messaging().sendMulticast(message)
        .then(response => {
          console.log(`Notification sent for lead ${doc.id}:`, response.successCount, 'successes');
        })
        .catch(err => {
          console.error('Error sending notification:', err);
        });
    });
  }

  // Save the current time as the last checked time
  fs.writeFileSync('lastChecked.txt', Date.now().toString());
}

main().catch(console.error);
