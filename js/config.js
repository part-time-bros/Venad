/* ============================================================
   VENAD HOUSE — config.js
   Single source of truth for all site-wide settings.
   To onboard a real client: edit this file only.
   ============================================================ */

const VENAD = {
  name:       'Venad House',
  tagline:    'Where Kerala Lives',
  location:   'Alleppey, Kerala',
  whatsapp:   '7034525123',       // ← Change for real client. Format: country code + number, no +
  email:      'hello@venadhome.com',
  phone:      '+91 7034525123',
  instagram:  'https://instagram.com/venadhome',
  mapEmbed:   'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d62956.4!2d76.27!3d9.49!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b088d00c4a05999%3A0xb4fc8f558f8f2cd4!2sAlappuzha%2C+Kerala!5e0!3m2!1sen!2sin!4v1234567890',

  rooms: [
    { id: 'nadumuttom',  name: 'Nadumuttom Suite',  price: '₹7,500',  priceNum: 7500 },
    { id: 'backwater',   name: 'Backwater Villa',   price: '₹12,000', priceNum: 12000 },
    { id: 'plantation',  name: 'Plantation Room',   price: '₹5,500',  priceNum: 5500 },
    { id: 'heritage',    name: 'Heritage Loft',     price: '₹9,500',  priceNum: 9500 },
  ],

  experiences: [
    { id: 'kayak',      name: 'Sunrise Kayak',         price: '₹800',   priceNum: 800,  duration: '2 hrs',    per: 'person' },
    { id: 'cooking',    name: 'Kerala Cooking Class',  price: '₹1,200', priceNum: 1200, duration: '3 hrs',    per: 'person' },
    { id: 'spice',      name: 'Spice Garden Walk',     price: '₹400',   priceNum: 400,  duration: '1 hr',     per: 'person' },
    { id: 'kathakali',  name: 'Kathakali Evening',     price: '₹1,500', priceNum: 1500, duration: '2 hrs',    per: 'person' },
    { id: 'houseboat',  name: 'Houseboat Day Trip',    price: '₹4,000', priceNum: 4000, duration: 'Full day', per: 'boat'   },
    { id: 'ayurveda',   name: 'Ayurveda Session',      price: '₹2,000', priceNum: 2000, duration: '90 mins',  per: 'person' },
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

function waConfirm(type, name) {
  let msg = '';
  if (type === 'room') {
    msg = `Hi! I'd like to book the ${name} at ${VENAD.name}. Could you please share availability and details?`;
  } else if (type === 'experience') {
    msg = `Hi! I'm interested in the ${name} experience at ${VENAD.name}. Could you share more details and availability?`;
  } else {
    msg = `Hi! I have a question about the ${name} at ${VENAD.name}.`;
  }

  const pendingUrl = `https://wa.me/${VENAD.whatsapp}?text=${encodeURIComponent(msg)}`;

  const modal   = document.getElementById('wa-modal');
  const subject = document.getElementById('wa-modal-subject');
  const confirm = document.getElementById('wa-modal-confirm');
  const cancel  = document.getElementById('wa-modal-cancel');

  if (!modal) {
    // Fallback: no modal on this page, open directly
    window.open(pendingUrl, '_blank');
    return;
  }

  subject.textContent = name || VENAD.name;
  modal._pendingUrl = pendingUrl;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { if (cancel) cancel.focus(); }, 50);
}

/* Modal event listeners — initialised once when DOM is ready */
document.addEventListener('DOMContentLoaded', function () {
  const modal   = document.getElementById('wa-modal');
  if (!modal) return;

  const confirm = document.getElementById('wa-modal-confirm');
  const cancel  = document.getElementById('wa-modal-cancel');

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modal._pendingUrl = '';
  }

  confirm.addEventListener('click', () => {
    if (modal._pendingUrl) window.open(modal._pendingUrl, '_blank');
    closeModal();
  });

  cancel.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
});

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
