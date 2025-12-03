import { useState } from 'react';
import { X, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { UATAccount } from '../types/user';

interface AssignShapefileModalProps {
  uatAccount: UATAccount;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignShapefileModal({ uatAccount, onClose, onSuccess }: AssignShapefileModalProps) {
  const { currentUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    console.log('File selected:', selectedFile.name, selectedFile.size);

    if (!selectedFile.name.endsWith('.zip')) {
      setError('Vă rugăm să selectați un fișier .zip');
      setFile(null);
      return;
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (selectedFile.size > maxSize) {
      setError('Fișierul este prea mare. Dimensiunea maximă este 50MB.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    console.log('Submit started');
    
    if (!file) {
      setError('Vă rugăm să selectați un fișier');
      return;
    }

    if (!currentUser) {
      setError('Nu sunteți autentificat');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress('Se pregătește încărcarea...');

    try {
      console.log('Starting upload for UAT:', uatAccount.id);
      
      // Create storage reference
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `shapefiles/${uatAccount.id}/${fileName}`);
      
      console.log('Storage path:', `shapefiles/${uatAccount.id}/${fileName}`);
      setUploadProgress('Se încarcă fișierul...');

      // Upload file
      console.log('Uploading to Firebase Storage...');
      const uploadResult = await uploadBytes(storageRef, file);
      console.log('Upload complete:', uploadResult);
      
      setUploadProgress('Se obține URL-ul fișierului...');
      
      // Get download URL
      console.log('Getting download URL...');
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL obtained:', downloadURL);

      setUploadProgress('Se actualizează baza de date...');

      // Update UAT account with shapefile info
      console.log('Updating Firestore document...');
      const userDocRef = doc(db, 'users', uatAccount.id);
      await updateDoc(userDocRef, {
        shapefileUrl: downloadURL,
        shapefileMetadata: {
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser.uid,
          fileSize: file.size
        }
      });
      
      console.log('Firestore update complete');
      setUploadProgress('Finalizare...');

      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Upload process completed successfully');
      onSuccess();
    } catch (err: any) {
      console.error('Error uploading shapefile:', err);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      
      let errorMessage = 'Eroare la încărcarea fișierului. Vă rugăm să încercați din nou.';
      
      if (err.code === 'storage/unauthorized') {
        errorMessage = 'Nu aveți permisiunea de a încărca fișiere. Verificați regulile Firebase Storage.';
      } else if (err.code === 'storage/canceled') {
        errorMessage = 'Încărcarea a fost anulată.';
      } else if (err.code === 'storage/unknown') {
        errorMessage = 'Eroare necunoscută. Verificați conexiunea la internet.';
      } else if (err.message) {
        errorMessage = `Eroare: ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Asignează hartă pentru {uatAccount.uatName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={uploading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fișier Shapefile (.zip)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
                id="shapefile-upload"
                disabled={uploading}
              />
              <label
                htmlFor="shapefile-upload"
                className={`cursor-pointer flex flex-col items-center ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className="h-12 w-12 text-gray-400 mb-2" />
                {file ? (
                  <div className="text-sm">
                    <p className="text-blue-600 font-medium">{file.name}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">Click pentru a selecta fișier</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Doar fișiere .zip cu shapefile (max 50MB)
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {uploading && uploadProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <p className="text-sm text-blue-700">{uploadProgress}</p>
              </div>
            </div>
          )}

          {uatAccount.shapefileMetadata && !uploading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Atenție:</strong> Acest UAT are deja o hartă asignată. 
                Încărcarea unui fișier nou va înlocui harta existentă.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            >
              Anulează
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              disabled={uploading || !file}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Se încarcă...</span>
                </>
              ) : (
                <span>Asignează</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
