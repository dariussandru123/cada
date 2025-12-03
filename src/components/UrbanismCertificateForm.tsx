import { useState, useEffect } from 'react';
import { Save, X, FileText, Loader2, Search, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { urbanismService } from '../services/urbanismService';
import type { UrbanismCertificate } from '../types/urbanism';
import type { ShapefileLayer } from '../utils/shapefileParser';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialCf?: string;
  layers?: ShapefileLayer[];
}

export default function UrbanismCertificateForm({ onClose, onSuccess, initialCf, layers = [] }: Props) {
  const { currentUser, userData } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [foundInGis, setFoundInGis] = useState<boolean | null>(null);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  
  // Auto-generated values
  const [certificateNumber] = useState(urbanismService.generateCertificateNumber());
  const [currentDate] = useState(new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState<Omit<UrbanismCertificate, 'id' | 'uatId' | 'createdAt' | 'status'>>({
    number: certificateNumber,
    issueDate: currentDate,
    
    // 1. Applicant
    applicant: {
      name: '',
      cnpCui: '',
      address: '',
      email: '',
      phone: ''
    },

    // 2. Property
    property: {
      address: '',
      cadastralNumber: initialCf || '',
      area: 0,
      uat: userData?.uatName || ''
    },

    // 3. Purpose
    purpose: '',

    // 4. Legal Regime
    legalRegime: {
      owner: '',
      usageCategory: '',
      propertyRegime: 'Intravilan'
    },

    // 5. Technical (Auto)
    technicalRegime: 'POT: 35%\nCUT: 1.2\nRegim înălțime: P+1E+M\n(Generat automat din PUG)',

    // 6. Restrictions (GIS)
    restrictions: 'Nu au fost identificate restricții majore în zona selectată.\n(Verificare automată GIS)',

    // 7. Documents
    requiredDocuments: {
      planCadastral: true,
      planSituatie: true,
      extrasCF: true,
      studiuGeotehnic: false,
      memoriuTehnic: false,
      alteDocumente: ''
    },

    // 8. Observations
    observations: ''
  });

  // Extract available keys for debugging
  useEffect(() => {
    if (layers.length > 0) {
      const keys = new Set<string>();
      layers.forEach(layer => {
        if (layer.geoJson.features.length > 0) {
          const props = layer.geoJson.features[0].properties;
          if (props) {
            Object.keys(props).forEach(k => keys.add(k));
          }
        }
      });
      setAvailableKeys(Array.from(keys));
      console.log('Available GIS Keys:', Array.from(keys));
    }
  }, [layers]);

  // Helper to find property value case-insensitively
  const findProperty = (properties: any, keys: string[]): any => {
    if (!properties) return null;
    const propKeys = Object.keys(properties);
    
    // 1. Exact match (case-insensitive)
    for (const key of keys) {
      const foundKey = propKeys.find(k => k.toLowerCase() === key.toLowerCase());
      if (foundKey) return properties[foundKey];
    }

    // 2. Partial match (contains)
    for (const key of keys) {
      const foundKey = propKeys.find(k => k.toLowerCase().includes(key.toLowerCase()));
      if (foundKey) return properties[foundKey];
    }

    return null;
  };

  const searchGisData = (cf: string) => {
    if (!cf || !layers.length) return;

    setIsSearching(true);
    setFoundInGis(null);
    
    console.log(`🔍 Searching GIS for CF: ${cf}`);
    const searchVal = cf.trim().toLowerCase();

    let foundFeature = null;
    
    // Strategy 1: Search in specific CF columns first
    const cfKeys = ['Nr_CF', 'nr_cf', 'NR_CF', 'cf', 'CF', 'nr_cad', 'cadastral', 'id', 'nr_top'];
    
    for (const layer of layers) {
      for (const feature of layer.geoJson.features) {
        if (feature.properties) {
          const featureCf = findProperty(feature.properties, cfKeys);
          if (featureCf && String(featureCf).trim().toLowerCase() === searchVal) {
            foundFeature = feature;
            break;
          }
        }
      }
      if (foundFeature) break;
    }

    // Strategy 2: "Search Everywhere" - Check ALL property values if not found yet
    if (!foundFeature) {
      console.log('⚠️ CF not found in standard columns, searching all properties...');
      for (const layer of layers) {
        for (const feature of layer.geoJson.features) {
          if (!feature.properties) continue;
          
          const values = Object.values(feature.properties);
          const match = values.some(val => String(val).trim().toLowerCase() === searchVal);
          
          if (match) {
            foundFeature = feature;
            break;
          }
        }
        if (foundFeature) break;
      }
    }

    if (foundFeature && foundFeature.properties) {
      console.log('✅ Found feature:', foundFeature.properties);
      setFoundInGis(true);

      // Extract data with expanded key list
      const area = findProperty(foundFeature.properties, ['Suprafata', 'suprafata', 'Area', 'area', 'S_teren', 'mp', 'st']);
      const owner = findProperty(foundFeature.properties, ['Proprietar', 'proprietar', 'Nume', 'nume', 'owner', 'deinator']);
      const address = findProperty(foundFeature.properties, ['Adresa', 'adresa', 'Locatie', 'strada']);
      const usage = findProperty(foundFeature.properties, ['Categoria', 'folosinta', 'utilizare', 'cat_fol']);
      const regime = findProperty(foundFeature.properties, ['Intravilan', 'intravilan', 'regim']);

      console.log('📊 GIS Data extracted:', {
        area: area ? Number(area) : 'Not found',
        owner: owner ? String(owner) : 'Not found',
        address: address ? String(address) : 'Not found',
        usage: usage ? String(usage) : 'Not found',
        regime: regime ? String(regime) : 'Not found'
      });

      setFormData(prev => ({
        ...prev,
        property: {
          ...prev.property,
          area: area ? Number(area) : prev.property.area,
          address: address ? String(address) : prev.property.address,
        },
        legalRegime: {
          ...prev.legalRegime,
          owner: owner ? String(owner) : prev.legalRegime.owner,
          usageCategory: usage ? String(usage) : prev.legalRegime.usageCategory,
          propertyRegime: regime ? String(regime) : prev.legalRegime.propertyRegime
        }
      }));
    } else {
      console.log('❌ CF not found in GIS data');
      setFoundInGis(false);
    }

    setIsSearching(false);
  };

  // Run search on mount if initialCf is present
  useEffect(() => {
    if (initialCf) {
      searchGisData(initialCf);
    }
  }, [initialCf, layers]);

  const handleApplicantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      applicant: { ...prev.applicant, [e.target.name]: e.target.value }
    }));
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      property: { ...prev.property, [e.target.name]: e.target.value }
    }));
  };

  const handleLegalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      legalRegime: { ...prev.legalRegime, [e.target.name]: e.target.value }
    }));
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked, type, value } = e.target;
    setFormData(prev => ({
      ...prev,
      requiredDocuments: {
        ...prev.requiredDocuments,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setIsSubmitting(true);
      
      const fullData: Omit<UrbanismCertificate, 'id'> = {
        ...formData,
        uatId: currentUser.uid,
        createdAt: new Date().toISOString(),
        status: 'issued'
      };

      await urbanismService.createCertificate(fullData);
      onSuccess();
    } catch (error) {
      console.error('Error saving certificate:', error);
      alert('Eroare la salvarea certificatului.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Emitere Certificat de Urbanism</h2>
              <p className="text-sm text-gray-500">
                Nr. {formData.number} din {formData.issueDate}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 flex-1 overflow-y-auto">
          
          {/* GIS Status Banner */}
          {foundInGis === true && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-green-900">Date preluate din GIS</h4>
                <p className="text-sm text-green-700 mt-1">
                  Următoarele date au fost completate automat din harta GIS: <strong>Suprafață</strong>, <strong>Categorie Folosință</strong>, Proprietar și Adresă.
                </p>
              </div>
            </div>
          )}

          {foundInGis === false && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-yellow-900">CF-ul nu a fost găsit în GIS</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Numărul de Carte Funciară introdus nu a fost identificat în straturile hărții. Vă rugăm să completați datele manual.
                  </p>
                </div>
              </div>
              
              {/* Debug Info for User */}
              <div className="mt-2 pl-8">
                <div className="text-xs text-yellow-800 bg-yellow-100/50 p-2 rounded border border-yellow-200">
                  <div className="flex items-center gap-1 font-semibold mb-1">
                    <Info size={12} />
                    <span>Info Debug (Coloane disponibile în fișier):</span>
                  </div>
                  <p className="font-mono break-words">
                    {availableKeys.length > 0 ? availableKeys.join(', ') : 'Nu s-au detectat coloane în fișierul GIS.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* 1. Date Solicitant */}
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Date despre solicitant
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nume / Denumire</label>
                <input required name="name" value={formData.applicant.name} onChange={handleApplicantChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNP / CUI</label>
                <input required name="cnpCui" value={formData.applicant.cnpCui} onChange={handleApplicantChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input name="phone" value={formData.applicant.phone} onChange={handleApplicantChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresă</label>
                <input required name="address" value={formData.applicant.address} onChange={handleApplicantChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" value={formData.applicant.email} onChange={handleApplicantChange} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
          </section>

          {/* 2. Identificarea Imobilului */}
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              Identificarea imobilului
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Localizare (Adresă imobil)</label>
                <input required name="address" value={formData.property.address} onChange={handlePropertyChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UAT</label>
                <input readOnly name="uat" value={formData.property.uat} className="w-full p-2 border rounded-lg bg-gray-100" />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nr. Cadastral / CF</label>
                <div className="flex">
                  <input 
                    required 
                    name="cadastralNumber" 
                    value={formData.property.cadastralNumber} 
                    onChange={handlePropertyChange} 
                    className="w-full p-2 border rounded-l-lg" 
                  />
                  <button
                    type="button"
                    onClick={() => searchGisData(formData.property.cadastralNumber)}
                    disabled={isSearching}
                    className="bg-blue-600 text-white px-3 rounded-r-lg hover:bg-blue-700 disabled:opacity-50"
                    title="Caută în GIS"
                  >
                    {isSearching ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suprafață (mp)</label>
                <input required type="number" name="area" value={formData.property.area} onChange={handlePropertyChange} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
          </section>

          {/* 3. Scopul Solicitării */}
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
              Scopul solicitării
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descriere lucrări</label>
              <textarea 
                required 
                rows={3}
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                placeholder="Ex: Construire locuință unifamilială P+1E, împrejmuire teren..."
              />
            </div>
          </section>

          {/* 4. Regimul Juridic */}
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
              Regimul juridic
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Proprietar actual</label>
                <input required name="owner" value={formData.legalRegime.owner} onChange={handleLegalChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Regim proprietate</label>
                <select name="propertyRegime" value={formData.legalRegime.propertyRegime} onChange={handleLegalChange} className="w-full p-2 border rounded-lg">
                  <option value="Intravilan">Intravilan</option>
                  <option value="Extravilan">Extravilan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorie de folosință</label>
                <input required name="usageCategory" value={formData.legalRegime.usageCategory} onChange={handleLegalChange} className="w-full p-2 border rounded-lg" placeholder="Ex: Curți construcții" />
              </div>
            </div>
          </section>

          {/* 5 & 6. Regim Tehnic & Restricții (Auto) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">5</span>
                Regimul tehnic și urbanistic
              </h3>
              <textarea 
                readOnly
                rows={5}
                value={formData.technicalRegime}
                className="w-full p-3 border border-blue-200 rounded-lg bg-white text-gray-600 text-sm font-mono"
              />
            </section>

            <section className="bg-orange-50 p-6 rounded-xl border border-orange-100">
              <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">6</span>
                Servituți și restricții (GIS)
              </h3>
              <textarea 
                readOnly
                rows={5}
                value={formData.restrictions}
                className="w-full p-3 border border-orange-200 rounded-lg bg-white text-gray-600 text-sm font-mono"
              />
            </section>
          </div>

          {/* 7. Documente Necesare */}
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">7</span>
              Documente necesare la următoarea etapă
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" name="planCadastral" checked={formData.requiredDocuments.planCadastral} onChange={handleDocChange} className="h-4 w-4 text-blue-600 rounded" />
                <span className="text-sm font-medium text-gray-700">Plan cadastral</span>
              </label>
              <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" name="planSituatie" checked={formData.requiredDocuments.planSituatie} onChange={handleDocChange} className="h-4 w-4 text-blue-600 rounded" />
                <span className="text-sm font-medium text-gray-700">Plan de situație</span>
              </label>
              <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" name="extrasCF" checked={formData.requiredDocuments.extrasCF} onChange={handleDocChange} className="h-4 w-4 text-blue-600 rounded" />
                <span className="text-sm font-medium text-gray-700">Extras CF</span>
              </label>
              <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" name="studiuGeotehnic" checked={formData.requiredDocuments.studiuGeotehnic} onChange={handleDocChange} className="h-4 w-4 text-blue-600 rounded" />
                <span className="text-sm font-medium text-gray-700">Studiu geotehnic</span>
              </label>
              <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" name="memoriuTehnic" checked={formData.requiredDocuments.memoriuTehnic} onChange={handleDocChange} className="h-4 w-4 text-blue-600 rounded" />
                <span className="text-sm font-medium text-gray-700">Memoriu tehnic</span>
              </label>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Alte documente</label>
              <input name="alteDocumente" value={formData.requiredDocuments.alteDocumente} onChange={handleDocChange} className="w-full p-2 border rounded-lg" placeholder="Specificați alte documente necesare..." />
            </div>
          </section>

          {/* 8. Observații */}
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">8</span>
              Observații
            </h3>
            <textarea 
              rows={4}
              value={formData.observations}
              onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
              className="w-full p-2 border rounded-lg"
              placeholder="Alte mențiuni sau observații..."
            />
          </section>

        </form>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Anulează
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin h-4 w-4" />
                Se emite...
              </>
            ) : (
              <>
                <Save size={18} />
                Emite Certificat
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
