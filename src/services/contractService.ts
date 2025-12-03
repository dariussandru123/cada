import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { ContractData } from '../types/contract';

const COLLECTION_NAME = 'contracts';

export const contractService = {
  /**
   * Uploads a contract PDF and creates the Firestore record
   */
  async createContract(data: any, file: File) {
    try {
      console.log('Starting contract creation...');
      
      if (!data.uatId) {
        throw new Error('Missing uatId in contract data');
      }

      // 1. Upload File to Storage
      const fileRef = ref(storage, `contracts/${data.uatId}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(uploadResult.ref);
      
      console.log('File uploaded successfully:', fileUrl);

      // 2. Prepare Firestore Data
      // CRITICAL: We must explicitly construct the object to exclude 'contractFile' 
      // or any other non-serializable objects that might be in 'data'
      const contractData = {
        uatId: data.uatId,
        
        // A. Date Parcela
        parcelaId: data.parcelaId || '',
        nrCadastral: data.nrCadastral || '',
        suprafataParcela: Number(data.suprafataParcela) || 0,
        categoriaFolosinta: data.categoriaFolosinta || '',
        localizare: data.localizare || '',

        // B. Tip Contract
        tipContract: data.tipContract || '',

        // C. Date Titular
        titularTip: data.titularTip || 'PF',
        numeDenumire: data.numeDenumire || '',
        cnpCui: data.cnpCui || '',
        adresa: data.adresa || '',
        telefon: data.telefon || '',
        email: data.email || '',

        // D. Date Contract
        numarContract: data.numarContract || '',
        dataIncheiere: data.dataIncheiere || '',
        dataExpirare: data.dataExpirare || '',
        suprafataContractata: Number(data.suprafataContractata) || 0,
        pret: Number(data.pret) || 0,
        periodicitatePlata: data.periodicitatePlata || '',
        modAtribuire: data.modAtribuire || '',
        hclNumar: data.hclNumar || '',
        hclData: data.hclData || '',

        // E. System Fields
        fileUrl,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: this.calculateStatus(data.dataExpirare)
      };

      console.log('Sanitized Firestore Payload:', contractData);

      // 3. Save to Firestore
      const docRef = await addDoc(collection(db, COLLECTION_NAME), contractData);
      console.log('Document written with ID: ', docRef.id);
      
      return { id: docRef.id, ...contractData };
    } catch (error) {
      console.error('Error creating contract:', error);
      throw error;
    }
  },

  /**
   * Fetches all contracts for a specific UAT
   */
  async getContracts(uatId: string) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('uatId', '==', uatId)
      );

      const querySnapshot = await getDocs(q);
      
      const contracts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContractData[];

      // Client-side sorting
      return contracts.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching contracts:', error);
      throw error;
    }
  },

  /**
   * Checks if a contract exists for a specific CF in a UAT
   */
  async checkContractExists(uatId: string, cf: string) {
    try {
      // Query for contracts with this parcelaId (CF)
      // We check for any contract, but we could restrict to 'activ' if needed
      const q = query(
        collection(db, COLLECTION_NAME),
        where('uatId', '==', uatId),
        where('parcelaId', '==', cf)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking contract existence:', error);
      return false;
    }
  },

  calculateStatus(expirationDate: string): 'activ' | 'expirat' | 'in_asteptare' {
    if (!expirationDate) return 'activ';
    const today = new Date();
    const exp = new Date(expirationDate);
    return exp < today ? 'expirat' : 'activ';
  }
};
