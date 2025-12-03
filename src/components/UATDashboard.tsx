import { useState, useEffect } from 'react';
import { 
  Building2, 
  FileCheck, 
  AlertCircle, 
  Loader2, 
  MessageSquare, 
  Map as MapIcon, 
  FileText, 
  Menu,
  Search,
  FilePlus
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Map from './Map';
import FeedbackModal from './FeedbackModal';
import AgriculturalRegistry from './AgriculturalRegistry';
import UrbanismCertificateForm from './UrbanismCertificateForm';
import { parseShapefile, type ShapefileLayer } from '../utils/shapefileParser';
import type { LatLngBounds } from 'leaflet';
import { contractService } from '../services/contractService';

type Tab = 'gis' | 'registry' | 'urbanism';

export default function UATDashboard() {
  const { currentUser, userData } = useAuth();
  const [layers, setLayers] = useState<ShapefileLayer[]>([]);
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Inițializare...');
  const [error, setError] = useState('');
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<Tab>('gis');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Registry Search State (for redirection from Map)
  const [registrySearchTerm, setRegistrySearchTerm] = useState('');

  // Urbanism State
  const [showUrbanismForm, setShowUrbanismForm] = useState(false);
  const [urbanismSearchCf, setUrbanismSearchCf] = useState('');
  const [showCfSearchModal, setShowCfSearchModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAssignedShapefile() {
      if (!currentUser || !userData) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        setLoadingMessage('Se verifică contul...');
        setLoadingProgress(10);
        
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          if (isMounted) {
            setError('Contul UAT nu a fost găsit');
            setLoading(false);
          }
          return;
        }

        const data = userDoc.data();
        
        if (!data.shapefileUrl) {
          if (isMounted) {
            setError('Nu aveți o hartă asignată încă. Vă rugăm să contactați administratorul.');
            setLoading(false);
          }
          return;
        }

        setLoadingMessage('Se pregătește descărcarea...');
        setLoadingProgress(20);

        const urlParts = data.shapefileUrl.split('/o/')[1];
        const storagePath = decodeURIComponent(urlParts.split('?')[0]);
        const fileRef = ref(storage, storagePath);

        setLoadingMessage('Se obține link-ul de descărcare...');
        setLoadingProgress(30);
        
        const downloadUrl = await getDownloadURL(fileRef);
        const idToken = await currentUser.getIdToken();

        setLoadingMessage('Se descarcă fișierul...');
        setLoadingProgress(50);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const response = await fetch(downloadUrl, {
            headers: {
              'Authorization': `Bearer ${idToken}`
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          setLoadingMessage('Se procesează fișierul...');
          setLoadingProgress(60);

          const blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error('Downloaded file is empty');
          }
          
          const file = new File([blob], data.shapefileMetadata?.fileName || 'shapefile.zip');

          setLoadingMessage('Se analizează harta...');
          setLoadingProgress(70);
          
          const { layers: parsedLayers, bounds: fileBounds } = await parseShapefile(file);
          
          setLoadingMessage('Se încarcă harta...');
          setLoadingProgress(90);
          
          if (isMounted) {
            setLayers(parsedLayers);
            setBounds(fileBounds);
            setError('');
            
            setLoadingMessage('Finalizare...');
            setLoadingProgress(100);
            
            setTimeout(() => {
              setLoading(false);
            }, 300);
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (err: any) {
        console.error('Error loading shapefile:', err);
        if (!isMounted) return;
        
        let errorMessage = 'Eroare la încărcarea hărții.';
        if (err.code === 'storage/object-not-found') errorMessage = 'Fișierul hartă nu a fost găsit.';
        else if (err.code === 'storage/unauthorized') errorMessage = 'Nu aveți permisiunea de a accesa harta.';
        
        setError(errorMessage);
        setLoading(false);
      }
    }

    loadAssignedShapefile();

    return () => {
      isMounted = false;
    };
  }, [currentUser, userData]);

  const handleCheckContract = async (cf: string) => {
    if (!currentUser) return false;
    return await contractService.checkContractExists(currentUser.uid, cf);
  };

  const handleRedirectToRegistry = (cf: string) => {
    setRegistrySearchTerm(cf);
    setActiveTab('registry');
  };

  const handleUrbanismSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (urbanismSearchCf.trim()) {
      setShowCfSearchModal(false);
      setShowUrbanismForm(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md w-full px-6">
          <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Se încarcă harta
          </h2>
          <p className="text-sm text-gray-600 mb-6">{loadingMessage}</p>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'gis', label: 'GIS (Hartă)', icon: MapIcon },
    { id: 'registry', label: 'Registrul Agricol', icon: FileText },
    { id: 'urbanism', label: 'Certificat de Urbanism', icon: FileCheck },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <Building2 className="h-6 w-6 text-blue-600 hidden sm:block" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                {userData?.uatName || 'UAT Dashboard'}
              </h1>
              <p className="text-xs text-gray-500">
                Cod UAT: {userData?.uatCode || 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {userData?.shapefileMetadata && (
              <div className="hidden sm:flex items-center space-x-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                <FileCheck className="h-3.5 w-3.5" />
                <span className="font-medium truncate max-w-[150px]">
                  {userData.shapefileMetadata.fileName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div 
          className={`
            absolute lg:relative z-30 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden'}
          `}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 space-y-1 flex-1">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Meniu Principal
              </p>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as Tab);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      if (item.id !== 'registry') {
                        setRegistrySearchTerm('');
                      }
                    }}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}
                    `}
                  >
                    <Icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setIsFeedbackModalOpen(true)}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <MessageSquare size={18} className="text-gray-400" />
                <span>Contactează Admin</span>
              </button>
            </div>
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="absolute inset-0 bg-black/20 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Content Area */}
        <div className="flex-1 relative bg-gray-50 overflow-hidden flex flex-col">
          {activeTab === 'gis' && (
            error ? (
              <div className="h-full flex items-center justify-center p-4">
                <div className="text-center max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Eroare la încărcarea hărții
                  </h2>
                  <p className="text-gray-600 text-sm">{error}</p>
                </div>
              </div>
            ) : (
              <Map 
                layers={layers} 
                bounds={bounds} 
                onCheckContract={handleCheckContract}
                onRedirectToRegistry={handleRedirectToRegistry}
              />
            )
          )}

          {activeTab === 'registry' && (
            <AgriculturalRegistry initialSearchTerm={registrySearchTerm} />
          )}

          {activeTab === 'urbanism' && (
            <div className="h-full p-8 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Certificate de Urbanism</h2>
                    <p className="text-gray-500 mt-1">Gestionare și emitere certificate</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Option 1: Search by CF */}
                  <button
                    onClick={() => setShowCfSearchModal(true)}
                    className="flex flex-col items-center justify-center p-8 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-center h-64"
                  >
                    <div className="bg-blue-50 p-4 rounded-full mb-4 group-hover:bg-blue-100 transition-colors">
                      <Search className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Caută după CF</h3>
                    <p className="text-sm text-gray-500 max-w-xs">
                      Completează automat datele imobilului folosind numărul de Carte Funciară existent în baza de date.
                    </p>
                  </button>

                  {/* Option 2: Create Custom */}
                  <button
                    onClick={() => {
                      setUrbanismSearchCf('');
                      setShowUrbanismForm(true);
                    }}
                    className="flex flex-col items-center justify-center p-8 bg-white border-2 border-green-100 rounded-xl hover:border-green-500 hover:shadow-md transition-all group text-center h-64"
                  >
                    <div className="bg-green-50 p-4 rounded-full mb-4 group-hover:bg-green-100 transition-colors">
                      <FilePlus className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Creează Custom</h3>
                    <p className="text-sm text-gray-500 max-w-xs">
                      Completează manual toate datele pentru emiterea unui certificat nou fără referință automată.
                    </p>
                  </button>
                </div>

                {/* Recent Certificates List Placeholder */}
                <div className="mt-12">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Recente</h3>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-8 text-center text-gray-500">
                      Nu există certificate emise recent.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CF Search Modal */}
      {showCfSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Căutare după CF</h3>
            <form onSubmit={handleUrbanismSearch}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Număr Carte Funciară</label>
                <input
                  type="text"
                  required
                  value={urbanismSearchCf}
                  onChange={(e) => setUrbanismSearchCf(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Introduceți nr. CF..."
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCfSearchModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Continuă
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Urbanism Form Modal */}
      {showUrbanismForm && (
        <UrbanismCertificateForm
          onClose={() => setShowUrbanismForm(false)}
          onSuccess={() => {
            setShowUrbanismForm(false);
            alert('Certificatul a fost emis cu succes!');
          }}
          initialCf={urbanismSearchCf}
        />
      )}

      {isFeedbackModalOpen && (
        <FeedbackModal
          onClose={() => setIsFeedbackModalOpen(