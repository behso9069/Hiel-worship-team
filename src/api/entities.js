import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  limit,
  where,
  serverTimestamp
} from 'firebase/firestore';

// Generic CRUD operations for any collection
const createEntity = (collectionName) => ({
  async list(sortField = 'created_date', limitCount = 100) {
    try {
      const colRef = collection(db, collectionName);
      let q;
      
      if (sortField.startsWith('-')) {
        q = query(colRef, orderBy(sortField.slice(1), 'desc'), limit(limitCount));
      } else {
        q = query(colRef, orderBy(sortField, 'asc'), limit(limitCount));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      // If orderBy fails (index not created), fallback to simple query
      console.log(`Fallback query for ${collectionName}:`, error.message);
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  },

  async get(id) {
    const docRef = doc(db, collectionName, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
  },

  async create(data) {
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, {
      ...data,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    });
    return { id: docRef.id, ...data };
  },

  async update(id, data) {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updated_date: new Date().toISOString()
    });
    return { id, ...data };
  },

  async delete(id) {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { id };
  },

  async filter(filters) {
    const colRef = collection(db, collectionName);
    let q = query(colRef);
    
    Object.entries(filters).forEach(([field, value]) => {
      q = query(q, where(field, '==', value));
    });
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
});

// Export entities matching the base44 structure
export const Member = createEntity('members');
export const Attendance = createEntity('attendance');
export const ServiceSchedule = createEntity('service_schedules');
export const Announcement = createEntity('announcements');
export const Song = createEntity('songs');
export const WeeklySetlist = createEntity('weekly_setlists');
export const ServiceRecord = createEntity('service_records');
export const Meeting = createEntity('meetings');
export const Survey = createEntity('surveys');
export const Event = createEntity('events');
export const PrayerRequest = createEntity('prayer_requests');
export const ChangeRequest = createEntity('change_requests');

// Simple auth placeholder (no login required for now)
export const User = {
  async me() {
    return {
      id: 'local-user',
      email: 'user@hiel.church',
      full_name: '히엘 팀원'
    };
  },
  logout() {
    console.log('Logged out');
  }
};
