import { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Mail, MapPin, Upload, FileCheck, MessageSquare } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UATAccount } from '../types/user';
import CreateUATModal from './CreateUATModal';
import AssignShapefileModal from './AssignShapefileModal';
import FeedbackManagement from './FeedbackManagement';

export default function AdminDashboard() {
  const [uatAccounts, setUatAccounts] = useState<UATAccount[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUAT, setSelectedUAT] = useState<UATAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'uats' | 'feedback'>('uats');
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'city_hall_manager'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const accounts: UATAccount[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        accounts.push({
          id: doc.id,
          uatName: data.uatName || '',
          uatCode: data.uatCode || '',
          email: data.email || '',
          createdAt: data.createdAt || '',
          shapefileUrl: data.shapefileUrl,
          shapefileMetadata: data.shapefileMetadata
        });
      });
      
      setUatAccounts(accounts);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to UAT accounts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'feedback'), where('status', '==', 'pending'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setPendingFeedbackCount(querySnapshot.size);
    }, (error) => {
      console.error('Error listening to pending feedback:', error);
    });

    return () => unsubscribe();
  }, []);

  async function handleDeleteAccount(accountId: string) {
    if (!confirm('Sigur doriți să ștergeți acest cont UAT?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', accountId));
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Eroare la ștergerea contului');
    }
  }

  function handleAssignShapefile(account: UATAccount) {
    setSelectedUAT(account);
    setIsAssignModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('uats')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'uats'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Building2 className="h-5 w-5" />
              Conturi UAT ({uatAccounts.length})
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'feedback'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              Mesaje UAT ({pendingFeedbackCount})
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'uats' ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Conturi UAT (Primării)
              </h2>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Adaugă UAT</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Se încarcă...</div>
          ) : uatAccounts.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nu există conturi UAT create</p>
              <p className="text-sm text-gray-400 mt-1">
                Creați primul cont pentru o primărie
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {uatAccounts.map((account) => (
                <div
                  key={account.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">
                        {account.uatName}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Șterge cont"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>Cod: {account.uatCode}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{account.email}</span>
                    </div>
                    
                    {account.shapefileMetadata ? (
                      <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                        <div className="flex items-center space-x-2 text-green-700">
                          <FileCheck className="h-4 w-4" />
                          <span className="text-xs font-medium">Hartă asignată</span>
                        </div>
                        <p className="text-xs text-green-600 mt-1 truncate">
                          {account.shapefileMetadata.fileName}
                        </p>
                        <p className="text-xs text-green-500 mt-1">
                          {new Date(account.shapefileMetadata.uploadedAt).toLocaleDateString('ro-RO')}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                        <p className="text-xs text-gray-500">Nicio hartă asignată</p>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleAssignShapefile(account)}
                      className="w-full mt-3 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">
                        {account.shapefileMetadata ? 'Actualizează hartă' : 'Asignează hartă'}
                      </span>
                    </button>
                    
                    <div className="text-xs text-gray-400 mt-2">
                      Creat: {new Date(account.createdAt).toLocaleDateString('ro-RO')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <FeedbackManagement />
      )}

      {isCreateModalOpen && (
        <CreateUATModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => setIsCreateModalOpen(false)}
        />
      )}

      {isAssignModalOpen && selectedUAT && (
        <AssignShapefileModal
          uatAccount={selectedUAT}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedUAT(null);
          }}
          onSuccess={() => {
            setIsAssignModalOpen(false);
            setSelectedUAT(null);
          }}
        />
      )}
    </div>
  );
}
