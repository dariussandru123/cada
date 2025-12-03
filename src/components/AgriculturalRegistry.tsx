import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Calendar, MapPin, Loader2, Download, AlertCircle, Clock, Eye, X } from 'lucide-react';
import ContractForm from './ContractForm';
import { useAuth } from '../contexts/AuthContext';
import { contractService } from '../services/contractService';
import type { ContractData } from '../types/contract';

interface AgriculturalRegistryProps {
  initialSearchTerm?: string;
}

export default function AgriculturalRegistry({ initialSearchTerm = '' }: AgriculturalRegistryProps) {
  const { currentUser } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Update searchTerm when initialSearchTerm changes
  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  const fetchContracts = async () => {
    if (!currentUser) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await contractService.getContracts(currentUser.uid);
      setContracts(data);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError('Nu s-au putut încărca contractele. Verificați conexiunea.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [currentUser]);

  const handleContractAdded = () => {
    fetchContracts();
    setIsFormOpen(false);
  };

  const getDaysRemaining = (dateString: string) => {
    if (!dateString) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(dateString);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const renderCountdown = (dateString: string) => {
    const days = getDaysRemaining(dateString);
    
    if (days === null) return <span className="text-gray-400">-</span>;

    if (days < 0) {
      return (
        <div className="flex items-center gap-1.5 text-red-600 font-medium">
          <AlertCircle size={14} />
          <span>Expirat de {Math.abs(days)} zile</span>
        </div>
      );
    }
    
    if (days === 0) {
      return (
        <div className="flex items-center gap-1.5 text-red-600 font-bold">
          <AlertCircle size={14} />
          <span>Expiră azi!</span>
        </div>
      );
    }

    if (days <= 30) {
      return (
        <div className="flex items-center gap-1.5 text-orange-600 font-medium">
          <Clock size={14} />
          <span>{days} zile rămase</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-green-600 font-medium">
        <Clock size={14} />
        <span>{days} zile</span>
      </div>
    );
  };

  const filteredContracts = contracts.filter(c => 
    c.numeDenumire.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.numarContract.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.parcelaId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Registrul Agricol</h2>
          <p className="text-sm text-gray-500">Gestionare contracte și terenuri arendate</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Caută contract, nume sau CF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
          </div>
          
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Contract Nou</span>
            <span className="sm:hidden">Nou</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            <p>{error}</p>
            <button 
              onClick={fetchContracts}
              className="mt-4 text-blue-600 hover:underline"
            >
              Încearcă din nou
            </button>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Nu au fost găsite contracte</h3>
            <p className="text-gray-500 mt-1">Încearcă alt termen de căutare sau adaugă un contract nou.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contract / Titular
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Detalii Parcelă
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valabilitate
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acțiuni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          contract.status === 'activ' ? 'bg-green-50 text-green-700 border-green-100' :
                          contract.status === 'expirat' ? 'bg-red-50 text-red-700 border-red-100' :
                          'bg-yellow-50 text-yellow-700 border-yellow-100'
                        }`}>
                          {contract.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{contract.numeDenumire}</span>
                          <span className="text-xs text-gray-500">Nr. {contract.numarContract} • {contract.tipContract}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <MapPin size={14} className="text-gray-400" />
                            <span>Număr CF: <span className="font-medium">{contract.parcelaId}</span></span>
                          </div>
                          <div className="text-xs text-gray-500 pl-5">
                            {contract.suprafataContractata} mp • {contract.localizare || 'Fără localizare'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm text-gray-900">
                            {renderCountdown(contract.dataExpirare)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Exp: {contract.dataExpirare}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {contract.fileUrl && (
                            <>
                              <button
                                onClick={() => setPreviewUrl(contract.fileUrl!)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Previzualizare Contract"
                              >
                                <Eye size={18} />
                              </button>
                              <a 
                                href={contract.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Descarcă Contract"
                              >
                                <Download size={18} />
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isFormOpen && (
        <ContractForm 
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleContractAdded}
        />
      )}

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Previzualizare Document</h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-gray-100 p-4 overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg border border-gray-200 bg-white"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
