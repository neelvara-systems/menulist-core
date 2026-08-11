
import { menulistPublicEnv } from '@lib/env/menulistPublicEnv';

const firebaseConfig = {
    apiKey: menulistPublicEnv.firebaseApiKey,
    authDomain: menulistPublicEnv.firebaseAuthDomain,
    databaseURL: menulistPublicEnv.firebaseDatabaseUrl,
    projectId: menulistPublicEnv.firebaseProjectId,
    storageBucket: menulistPublicEnv.firebaseStorageBucket,
    messagingSenderId: menulistPublicEnv.firebaseMessagingSenderId,
    appId: menulistPublicEnv.firebaseAppId,
    measurementId: menulistPublicEnv.firebaseMeasurementId,
};

export default firebaseConfig;
