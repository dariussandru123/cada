import { useState } from 'react';
import { X, Building2, Mail, Lock, MapPin } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface CreateUATModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateUATModal({ onClose, onSuccess }: CreateUATModalProps) {
  const [formData, setFormData] = useState({
    uatName: '',
    uatCode: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Creating UAT account with data:', {
        uatName: formData.uatName,
        uatCode: formData.uatCode,
        email: formData.email
      });

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      console.log('Firebase Auth user created:', userCredential.user.uid);

      // Create Firestore user document
      const userData = {
        uid: userCredential.user.uid,
        email: formData.email,
        role: 'city_hall_manager',
        uatName: formData.uatName,
        uatCode: formData.uatCode,
        createdAt: new Date().toISOString()
      };

      console.log('Creating Firestore document with data:', userData);

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      console.log('UAT account created successfully!');
      onSuccess();
    } catch (err: any) {
      console.error('Error creating UAT account:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Acest email este deja folosit');
      } else if (err.code === 'auth/weak-password') {
        setError('Parola trebuie să aibă cel puțin 6 caractere');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email invalid');
      } else {
        setError('Eroare la crearea contului: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Creare Cont UAT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nume UAT (Primărie)
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.uatName}
                onChange={(e) => setFormData({ ...formData, uatName: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ex: Primăria Municipiului București"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cod UAT
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.uatCode}
                onChange={(e) => setFormData({ ...formData, uatCode: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ex: RO-B"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Cod unic pentru identificarea UAT-ului
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="contact@primarie.ro"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parolă
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Minim 6 caractere"
                minLength={6}
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Se creează...' : 'Creează Cont'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
