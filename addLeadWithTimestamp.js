const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addLead() {
  const newLead = {
    name: 'Test Lead',
    contact: '9999999999',
    loanType: 'Personal',
    createdBy: 'testUserId',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    // Add other fields as needed
  };
  try {
    const docRef = await db.collection('leads').add(newLead);
    console.log('New lead added with ID:', docRef.id);
  } catch (err) {
    console.error('Error adding lead:', err);
  }
}

addLead(); 