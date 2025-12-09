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
    // 로컬 스토리지에서 현재 사용자 정보 가져오기
    const savedUser = localStorage.getItem('hiel_current_user');
    if (savedUser) {
      return JSON.parse(savedUser);
    }
    return {
      id: 'local-user',
      email: 'user@hiel.church',
      full_name: '히엘 팀원',
      is_team_leader: false
    };
  },
  
  // 현재 사용자 설정
  setCurrentUser(member) {
    const userData = {
      id: member.id,
      email: member.email || 'user@hiel.church',
      full_name: member.name,
      is_team_leader: member.executive_roles?.some(role => 
        role.role === '팀장' && role.year === new Date().getFullYear()
      ) || false
    };
    localStorage.setItem('hiel_current_user', JSON.stringify(userData));
    return userData;
  },
  
  // 팀장 여부 확인
  async isTeamLeader() {
    const user = await this.me();
    return user.is_team_leader === true;
  },
  
  logout() {
    localStorage.removeItem('hiel_current_user');
    console.log('Logged out');
  }
};
