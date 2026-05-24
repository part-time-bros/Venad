/* ============================================================
   VENAD HOUSE ADMIN — firebase-config.js
   Real Firebase project configuration.
   This file is gitignored — never commit to public repo.
   ============================================================ */

import { initializeApp }       from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth }             from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore }        from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            'AIzaSyALvJ3Exy8dF_gK19MIseCvlEzj-n60d40',
  authDomain:        'venadu-hm.firebaseapp.com',
  projectId:         'venadu-hm',
  storageBucket:     'venadu-hm.firebasestorage.app',
  messagingSenderId: '358744993077',
  appId:             '1:358744993077:web:1a875d12a3c4ad701bb07c',
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
