import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UrbanismCertificate } from '../types/urbanism';

const COLLECTION_NAME = 'urbanism_certificates';

export const urbanismService = {
  async createCertificate(data: Omit<UrbanismCertificate, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error('Error creating certificate:', error);
      throw error;
    }
  },

  async getCertificates(uatId: string) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('uatId', '==', uatId)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UrbanismCertificate[];
    } catch (error) {
      console.error('Error fetching certificates:', error);
      throw error;
    }
  },

  generateCertificateNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${random}/${year}`;
  }
};
