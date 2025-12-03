import { useState } from 'react';
import { X, Upload, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { contractService } from '../services/contractService';

interface ContractFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContractForm({ onClose, onSuccess }: ContractFormProps) {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // A. Date Parcela
    parcelaId: '',
    nrCadastral: '',
    suprafataParcela: '',
    categoriaFolosinta: 'Arabil',
    localizare: '',

    // B. Tip Contract
    tipContract: 'Arendă',

    // C. Date Titular
    titularTip: 'PF',
    numeDenumire: '',
    cnpCui: '',
    adresa: '',
    telefon: '',
    email: '',

    // D. Date Contract
    numarContract: '',
    dataIncheiere: '',
    dataExpirare: '',
    suprafataContractata: '',
    pret: '',
    periodicitatePlata: 'anual',
    modAtribuire: 'Directa',
    hclNumar: '',
    hclData: '',
  });

  const [file, setFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!file) {
      setError('Vă rugăm să atașați contractul scanat (PDF).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Combine form data with current user ID
      const submissionData = {
        ...formData,
        uatId: currentUser.uid
      };

      await contractService.createContract(submissionData, file);
      
      onSuccess();
    } catch (err) {
      console.error('Form submission error:', err);
      setError('A apărut o eroare la salvarea contractului. Verificați consola pentru detalii.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Adăugare Contract Nou</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Section A: Date Parcela */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">A. Date Parcelă</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Număr CF</label>
                <input required name="parcelaId" value={formData.parcelaId} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nr. Cadastral</label>
                <input required name="nrCadastral" value={formData.nrCadastral} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suprafață (mp)</label>
                <input required type="number" name="suprafataParcela" value={formData.suprafataParcela} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorie Folosință</label>
                <select name="categoriaFolosinta" value={formData.categoriaFolosinta} onChange={handleChange} className="w-full p-2 border rounded-lg">
                  <option value="Arabil">Arabil</option>
                  <option value="Pasune">Pășune</option>
                  <option value="Fanete">Fânețe</option>
                  <option value="Vie">Vie</option>
                  <option value="Livada">Livadă</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Localizare / Punct</label>
                <input name="localizare" value={formData.localizare} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
          </section>

          {/* Section B & C: Titular */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">B. Date Titular / Arendaș</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tip Titular</label>
                <select name="titularTip" value={formData.titularTip} onChange={handleChange} className="w-full p-2 border rounded-lg">
                  <option value="PF">Persoană Fizică</option>
                  <option value="PJ">Persoană Juridică</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNP / CUI</label>
                <input required name="cnpCui" value={formData.cnpCui} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nume / Denumire</label>
                <input required name="numeDenumire" value={formData.numeDenumire} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresă</label>
                <input required name="adresa" value={formData.adresa} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input name="telefon" value={formData.telefon} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
          </section>

          {/* Section D: Detalii Contract */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">C. Detalii Contract</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tip Contract</label>
                <select name="tipContract" value={formData.tipContract} onChange={handleChange} className="w-full p-2 border rounded-lg">
                  <option value="Arendă">Arendă</option>
                  <option value="Concesiune">Concesiune</option>
                  <option value="Inchiriere">Închiriere</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Număr Contract</label>
                <input required name="numarContract" value={formData.numarContract} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Încheiere</label>
                <input required type="date" name="dataIncheiere" value={formData.dataIncheiere} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Expirare</label>
                <input required type="date" name="dataExpirare" value={formData.dataExpirare} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suprafață Contractată (mp)</label>
                <input required type="number" name="suprafataContractata" value={formData.suprafataContractata} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preț / Redevență (RON)</label>
                <input required type="number" name="pret" value={formData.pret} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
          </section>

          {/* Section E: Document */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">D. Document Scanat</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
              <input
                type="file"
                id="contract-file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="contract-file" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {file ? file.name : 'Click pentru a încărca contractul (PDF)'}
                </span>
                <span className="text-xs text-gray-500">Maxim 10MB</span>
              </label>
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Se salvează...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvează Contract
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
