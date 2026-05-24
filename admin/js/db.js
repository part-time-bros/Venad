/* ============================================================
   VENAD HOUSE ADMIN — db.js
   Data layer — Firebase Firestore with localStorage fallback.

   USE_FIREBASE = true  → real Firestore (production)
   USE_FIREBASE = false → localStorage demo mode
   ============================================================ */

const USE_FIREBASE = true;

/* ── Firebase imports (only used when USE_FIREBASE = true) ───── */
let fsDB, fsDoc, fsCollection, fsGetDoc, fsSetDoc, fsUpdateDoc,
    fsDeleteDoc, fsGetDocs, fsQuery, fsWhere, fsOrderBy,
    fsArrayUnion, fsArrayRemove, fsServerTimestamp;

async function initFirebase() {
  if (!USE_FIREBASE) return;
  const app   = await import('./firebase-config.js');
  const store = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  fsDB              = app.db;
  fsDoc             = store.doc;
  fsCollection      = store.collection;
  fsGetDoc          = store.getDoc;
  fsSetDoc          = store.setDoc;
  fsUpdateDoc       = store.updateDoc;
  fsDeleteDoc       = store.deleteDoc;
  fsGetDocs         = store.getDocs;
  fsQuery           = store.query;
  fsWhere           = store.where;
  fsOrderBy         = store.orderBy;
  fsArrayUnion      = store.arrayUnion;
  fsArrayRemove     = store.arrayRemove;
  fsServerTimestamp = store.serverTimestamp;
}

/* ── Seed data (demo + Firestore first-run reference) ────────── */
const SEED = {
  siteConfig: {
    property: {
      name: 'Venad House', tagline: 'Where Kerala Lives',
      phone: '+91 98765 43210', whatsapp: '919876543210',
      email: 'hello@venadhome.com',
      address: 'Alleppey Backwaters, Alappuzha, Kerala 688001',
      location: 'Alleppey, Kerala',
    },
    images: {
      hero: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1920&q=85',
      rooms: {
        nadumuttom: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1000&q=82','https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&q=80','https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600&q=80'],
        backwater:  ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1000&q=82','https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80','https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'],
        plantation: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&q=82','https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80','https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80'],
        heritage:   ['https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1000&q=82','https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600&q=80','https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600&q=80'],
      },
      experiences: {
        kayak:'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=900&q=82',
        cooking:'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=900&q=82',
        spice:'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=900&q=82',
        kathakali:'https://images.unsplash.com/photo-1604423026493-095b82c9c7c3?w=900&q=82',
        houseboat:'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=900&q=82',
        ayurveda:'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=900&q=82',
      },
    },
  },

  rooms: [
    { id:'nadumuttom', name:'Nadumuttom Suite', tagline:'The heart of the home', description:'Built around a private open courtyard. Morning light falls through a skylight onto original mosaic floors.', price:'₹7,500', priceNum:7500, features:['Private Open Courtyard','King Bed','Ensuite Bathroom','Rain Shower','Writing Desk','Garden View','Up to 2 Guests'], isActive:true },
    { id:'backwater',  name:'Backwater Villa',  tagline:'Where the land meets the water', description:'A private cottage sitting directly on the bank of Vembanad Lake.', price:'₹12,000', priceNum:12000, features:['Direct Waterfront','Private Verandah','King Bed','Stone Bathtub','Private Garden Entrance','Panoramic Lake View','Up to 2 Guests'], isActive:true },
    { id:'plantation', name:'Plantation Room',  tagline:'The slowest mornings in Kerala', description:'Surrounded by coconut palms and a working spice garden.', price:'₹5,500', priceNum:5500, features:['Private Spice Garden View','Queen Bed','Open-Air Stone Shower','Private Garden Enclosure','Natural Ventilation','Up to 2 Guests'], isActive:true },
    { id:'heritage',   name:'Heritage Loft',    tagline:'One hundred years, undisturbed', description:'The original 1924 family quarters. Rosewood ceiling beams, antique brass fittings.', price:'₹9,500', priceNum:9500, features:['Original 1924 Rosewood Beams','King Bed','Mezzanine Reading Loft','Antique Brass Fittings','Canal View','Coir Mat Flooring','Up to 2 Guests'], isActive:true },
  ],

  roomUnits: {
    nadumuttom: { status:'available', currentGuest:null, nextGuest:null, blockedDates:[] },
    backwater:  { status:'occupied',  currentGuest:{ name:'James Wilson', phone:'+44 7911 123456', email:'james@example.com', checkIn:'2026-05-19', checkOut:'2026-05-23', adults:2, children:0, notes:'Anniversary trip', source:'WhatsApp', paymentStatus:'paid' }, nextGuest:{ name:'Sophie Laurent', phone:'+33 6 12 34 56 78', checkIn:'2026-05-26', checkOut:'2026-05-29' }, blockedDates:[] },
    plantation: { status:'available', currentGuest:null, nextGuest:null, blockedDates:[] },
    heritage:   { status:'blocked',   currentGuest:null, nextGuest:null, blockedDates:[{ from:'2026-05-20', to:'2026-05-22', reason:'Maintenance — roof repair' }] },
  },

  experiences: [
    { id:'kayak',     name:'Sunrise Kayak',        price:'₹800',   priceNum:800,  duration:'2 hrs',    per:'person', requiresNotice:0,  isActive:true },
    { id:'cooking',   name:'Kerala Cooking Class', price:'₹1,200', priceNum:1200, duration:'3 hrs',    per:'person', requiresNotice:4,  isActive:true },
    { id:'spice',     name:'Spice Garden Walk',    price:'₹400',   priceNum:400,  duration:'1 hr',     per:'person', requiresNotice:0,  isActive:true },
    { id:'kathakali', name:'Kathakali Evening',    price:'₹1,500', priceNum:1500, duration:'2 hrs',    per:'person', requiresNotice:48, isActive:true },
    { id:'houseboat', name:'Houseboat Day Trip',   price:'₹4,000', priceNum:4000, duration:'Full day', per:'boat',   requiresNotice:24, isActive:true },
    { id:'ayurveda',  name:'Ayurveda Session',     price:'₹2,000', priceNum:2000, duration:'90 mins',  per:'person', requiresNotice:24, isActive:true },
  ],

  enquiries: [
    { id:'enq_001', guestName:'Rohan Mehta', phone:'+91 98100 12345', room:'backwater', checkIn:'2026-06-01', checkOut:'2026-06-05', guests:2, experiences:['kayak','cooking'], note:'Honeymoon trip', status:'new', createdAt:new Date(Date.now()-3600000).toISOString() },
    { id:'enq_002', guestName:'Fiona MacAllan', phone:'+44 7890 654321', room:'heritage', checkIn:'2026-06-10', checkOut:'2026-06-14', guests:2, experiences:['kathakali','ayurveda'], note:'', status:'responded', createdAt:new Date(Date.now()-86400000).toISOString() },
  ],

  blockedDates: {},
};

/* ── localStorage helpers ────────────────────────────────────── */
function lsGet(key) { try { const r=localStorage.getItem('vh_'+key); return r?JSON.parse(r):null; } catch{return null;} }
function lsSet(key,val) { try{localStorage.setItem('vh_'+key,JSON.stringify(val));return true;}catch{return false;} }

function initSeedData() {
  if (lsGet('seeded')) return;
  Object.entries(SEED).forEach(([k,v]) => lsSet(k,v));
  lsSet('seeded', true);
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key]==='object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key]||{}, source[key]);
    } else { out[key] = source[key]; }
  }
  return out;
}

/* ── Firestore helpers ───────────────────────────────────────── */
async function fsGet(path) {
  const snap = await fsGetDoc(fsDoc(fsDB, ...path.split('/')));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function fsSet(path, data) {
  await fsSetDoc(fsDoc(fsDB, ...path.split('/')), data, { merge: true });
}

async function fsGetAll(col) {
  const snap = await fsGetDocs(fsCollection(fsDB, col));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ── DB API ──────────────────────────────────────────────────── */
const DB = {

  /* Site config */
  async getSiteConfig() {
    if (USE_FIREBASE) {
      const doc = await fsGet('siteConfig/main');
      return doc || SEED.siteConfig;
    }
    return lsGet('siteConfig') || SEED.siteConfig;
  },
  async updateSiteConfig(data) {
    if (USE_FIREBASE) {
      await fsSet('siteConfig/main', data);
      return data;
    }
    const cfg = await DB.getSiteConfig();
    const merged = deepMerge(cfg, data);
    lsSet('siteConfig', merged);
    return merged;
  },

  /* Rooms */
  async getRooms() {
    if (USE_FIREBASE) {
      const docs = await fsGetAll('rooms');
      return docs.length ? docs : SEED.rooms;
    }
    return lsGet('rooms') || SEED.rooms;
  },
  async updateRoom(id, data) {
    if (USE_FIREBASE) { await fsSet(`rooms/${id}`, data); return data; }
    const rooms = await DB.getRooms();
    const idx = rooms.findIndex(r => r.id === id);
    if (idx === -1) return null;
    rooms[idx] = { ...rooms[idx], ...data };
    lsSet('rooms', rooms);
    return rooms[idx];
  },
  async addRoom(data) {
    const id = 'room_' + Date.now();
    const newRoom = { id, isActive: true, ...data };
    if (USE_FIREBASE) { await fsSet(`rooms/${id}`, newRoom); return newRoom; }
    const rooms = await DB.getRooms();
    rooms.push(newRoom);
    lsSet('rooms', rooms);
    return newRoom;
  },
  async deleteRoom(id) {
    if (USE_FIREBASE) { await fsDeleteDoc(fsDoc(fsDB, 'rooms', id)); return; }
    const rooms = await DB.getRooms();
    lsSet('rooms', rooms.filter(r => r.id !== id));
  },

  /* Room units */
  async getRoomUnits() {
    if (USE_FIREBASE) {
      const doc = await fsGet('roomUnits/all');
      return doc ? doc : SEED.roomUnits;
    }
    return lsGet('roomUnits') || SEED.roomUnits;
  },
  async updateRoomUnit(roomId, data) {
    if (USE_FIREBASE) {
      const units = await DB.getRoomUnits();
      units[roomId] = { ...(units[roomId]||{}), ...data };
      await fsSet('roomUnits/all', units);
      return units[roomId];
    }
    const units = lsGet('roomUnits') || SEED.roomUnits;
    units[roomId] = { ...(units[roomId]||{}), ...data };
    lsSet('roomUnits', units);
    return units[roomId];
  },

  /* Experiences */
  async getExperiences() {
    if (USE_FIREBASE) {
      const docs = await fsGetAll('experiences');
      return docs.length ? docs : SEED.experiences;
    }
    return lsGet('experiences') || SEED.experiences;
  },
  async updateExperience(id, data) {
    if (USE_FIREBASE) { await fsSet(`experiences/${id}`, data); return data; }
    const exps = await DB.getExperiences();
    const idx = exps.findIndex(e => e.id === id);
    if (idx === -1) return null;
    exps[idx] = { ...exps[idx], ...data };
    lsSet('experiences', exps);
    return exps[idx];
  },
  async addExperience(data) {
    const id = 'exp_' + Date.now();
    const newExp = { id, isActive: true, ...data };
    if (USE_FIREBASE) { await fsSet(`experiences/${id}`, newExp); return newExp; }
    const exps = await DB.getExperiences();
    exps.push(newExp);
    lsSet('experiences', exps);
    return newExp;
  },
  async deleteExperience(id) {
    if (USE_FIREBASE) { await fsDeleteDoc(fsDoc(fsDB, 'experiences', id)); return; }
    const exps = await DB.getExperiences();
    lsSet('experiences', exps.filter(e => e.id !== id));
  },

  /* Enquiries */
  async getEnquiries() {
    if (USE_FIREBASE) {
      const docs = await fsGetAll('enquiries');
      return docs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return lsGet('enquiries') || SEED.enquiries;
  },
  async addEnquiry(data) {
    const id = 'enq_' + Date.now();
    const newEnq = { id, status:'new', createdAt: new Date().toISOString(), ...data };
    if (USE_FIREBASE) { await fsSet(`enquiries/${id}`, newEnq); return newEnq; }
    const enqs = await DB.getEnquiries();
    enqs.unshift(newEnq);
    lsSet('enquiries', enqs);
    return newEnq;
  },
  async updateEnquiry(id, data) {
    if (USE_FIREBASE) { await fsSet(`enquiries/${id}`, data); return data; }
    const enqs = await DB.getEnquiries();
    const idx = enqs.findIndex(e => e.id === id);
    if (idx === -1) return null;
    enqs[idx] = { ...enqs[idx], ...data };
    lsSet('enquiries', enqs);
    return enqs[idx];
  },

  /* Blocked dates */
  async getBlockedDates() {
    if (USE_FIREBASE) {
      const doc = await fsGet('config/blockedDates');
      return doc?.dates || {};
    }
    return lsGet('blockedDates') || {};
  },
  async setBlockedDate(dateStr, data) {
    if (USE_FIREBASE) {
      const dates = await DB.getBlockedDates();
      dates[dateStr] = data;
      await fsSet('config/blockedDates', { dates });
      return;
    }
    const blocked = await DB.getBlockedDates();
    blocked[dateStr] = data;
    lsSet('blockedDates', blocked);
  },
  async clearBlockedDate(dateStr) {
    if (USE_FIREBASE) {
      const dates = await DB.getBlockedDates();
      delete dates[dateStr];
      await fsSet('config/blockedDates', { dates });
      return;
    }
    const blocked = await DB.getBlockedDates();
    delete blocked[dateStr];
    lsSet('blockedDates', blocked);
  },

  /* Users */
  async getUsers() {
    if (USE_FIREBASE) {
      const docs = await fsGetAll('users');
      return docs;
    }
    return lsGet('users') || [];
  },
  async updateUser(uid, data) {
    if (USE_FIREBASE) { await fsSet(`users/${uid}`, data); return data; }
    const users = await DB.getUsers();
    const idx = users.findIndex(u => u.uid === uid);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...data };
    lsSet('users', users);
    return users[idx];
  },
  async addUser(data) {
    const uid = 'user_' + Date.now();
    const newUser = { uid, isActive: true, ...data };
    if (USE_FIREBASE) { await fsSet(`users/${uid}`, newUser); return newUser; }
    const users = await DB.getUsers();
    users.push(newUser);
    lsSet('users', users);
    return newUser;
  },
  async deleteUser(uid) {
    if (USE_FIREBASE) { await fsDeleteDoc(fsDoc(fsDB, 'users', uid)); return; }
    const users = await DB.getUsers();
    const supers = users.filter(u => u.role==='super_admin' && u.uid!==uid);
    if (supers.length===0 && users.find(u=>u.uid===uid)?.role==='super_admin') {
      throw new Error('Cannot delete the last super admin.');
    }
    lsSet('users', users.filter(u => u.uid !== uid));
  },

  /* Seed Firestore on first Firebase run */
  async seedFirestore() {
    if (!USE_FIREBASE) return;
    const cfg = await fsGet('siteConfig/main');
    if (cfg) return; // already seeded
    await fsSet('siteConfig/main', SEED.siteConfig);
    for (const r of SEED.rooms)      await fsSet(`rooms/${r.id}`, r);
    for (const e of SEED.experiences) await fsSet(`experiences/${e.id}`, e);
    await fsSet('roomUnits/all', SEED.roomUnits);
    console.log('Firestore seeded with default data.');
  },
};

/* Init */
if (!USE_FIREBASE) initSeedData();
(async () => {
  if (USE_FIREBASE) {
    await initFirebase();
    await DB.seedFirestore();
  }
})();
