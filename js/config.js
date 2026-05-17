/* ============================================================
   VENAD HOUSE — config.js
   Single source of truth for all site-wide settings.
   To onboard a real client: edit this file only.
   ============================================================ */

const VENAD = {
  name:       'Venad House',
  tagline:    'Where Kerala Lives',
  location:   'Alleppey, Kerala',
  whatsapp:   '919876543210',       // ← Change for real client. Format: country code + number, no +
  email:      'hello@venadhome.com',
  phone:      '+91 98765 43210',
  instagram:  'https://instagram.com/venadhome',
  mapEmbed:   'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d62956.4!2d76.27!3d9.49!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b088d00c4a05999%3A0xb4fc8f558f8f2cd4!2sAlappuzha%2C+Kerala!5e0!3m2!1sen!2sin!4v1234567890',

  rooms: [
    { id: 'nadumuttom',  name: 'Nadumuttom Suite',  price: '₹7,500' },
    { id: 'backwater',   name: 'Backwater Villa',   price: '₹12,000' },
    { id: 'plantation',  name: 'Plantation Room',   price: '₹5,500' },
    { id: 'heritage',    name: 'Heritage Loft',     price: '₹9,500' },
  ],
};

/* ── WhatsApp message builders ──────────────────────────────── */

function waGeneral() {
  const msg = `Hi! I'd like to know more about ${VENAD.name} in ${VENAD.location}.`;
  window.open(`https://wa.me/${VENAD.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
}

function waBook(roomName = '') {
  const room = roomName ? `the ${roomName}` : 'a room';
  const msg = `Hi! I'd like to book ${room} at ${VENAD.name}. Could you please share availability and details?`;
  window.open(`https://wa.me/${VENAD.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
}

function waExperience(expName = '') {
  const exp = expName ? `the ${expName} experience` : 'an experience';
  const msg = `Hi! I'm interested in ${exp} at ${VENAD.name}. Could you share more details?`;
  window.open(`https://wa.me/${VENAD.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
}

function waContact(name = '', dates = '', message = '') {
  let msg = `Hi! I'm ${name} and I'm interested in staying at ${VENAD.name}.`;
  if (dates)   msg += ` My preferred dates are: ${dates}.`;
  if (message) msg += ` Additional details: ${message}`;
  window.open(`https://wa.me/${VENAD.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
}

/*
  ── Firebase stub (Phase 2) ──────────────────────────────────
  When a real client needs form data saved to Firestore,
  uncomment and fill in the config below. No HTML changes needed.

  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.x.x/firebase-app.js';
  import { getFirestore, collection, addDoc, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js';

  const firebaseConfig = {
    apiKey:     'YOUR_KEY',
    authDomain: 'YOUR_APP.firebaseapp.com',
    projectId:  'YOUR_PROJECT_ID',
  };

  const app = initializeApp(firebaseConfig);
  const db  = getFirestore(app);

  async function saveEnquiry(data) {
    await addDoc(collection(db, 'enquiries'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }
*/
