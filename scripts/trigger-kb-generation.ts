require('dotenv').config({ path: '.env.local' });

const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator, collection, addDoc } = require('firebase/firestore');

// Inlining the firebaseConfig object to avoid module issues
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FB_DATABASE_URL,
  projectId: 'ecomsai',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const triggerGeneration = async () => {
  console.log('Initializing Firebase and connecting to emulators...');

  // Initialize Firebase app
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Connect to Firestore emulator
  connectFirestoreEmulator(db, '127.0.0.1', 8081);

  console.log('Connected to Firestore emulator.');

  const tId = 'test-tenant';
  const sId = 'test-session';
  const collectionPath = `ingestion_jobs/${tId}/${sId}`;

  const jobData = {
    sourceFiles: [
      {
        fileName: 'test-file.txt',
        storagePath: 'test/path/test-file.txt',
        type: 'text/plain',
        gsUri: 'gs://ecomsai.appspot.com/test/path/test-file.txt',
        downloadURL: 'https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/test%2Fpath%2Ftest-file.txt?alt=media'
      }
    ],
    status: 'pending',
    createdOn: new Date().toISOString(),
    modifiedOn: new Date().toISOString(),
  };

  try {
    const docRef = await addDoc(collection(db, collectionPath), jobData);
    console.log(`Successfully created document with ID: ${docRef.id} in ${collectionPath}`);
    console.log('startGeneration function should be triggered.');
  } catch (error) {
    console.error('Error creating document:', error);
  }
};

triggerGeneration().then(() => {
  console.log('Script finished.');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
