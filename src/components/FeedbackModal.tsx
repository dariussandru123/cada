import { useState } from 'react';
import { X, MessageSquare, FileText, Send } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface FeedbackModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function FeedbackModal({ onClose, onSuccess }: FeedbackModalProps) {
  const { currentUser, userData } = useAuth();
  const [type, setType] = useState<'comment' | 'request'>('comment');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!currentUser || !userData) {
      setError('Nu sunteți autentificat');
      return;
    }

    if (!subject.trim() || !message.trim()) {
      setError('Vă rugăm să completați toate câmpurile');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const feedbackData = {
        uatId: currentUser.uid,
        uatName: userData.uatName || 'UAT Necunoscut',
        uatEmail: userData.email,
        type,
        subject: subject.trim(),
        message: message.trim(),
        status: 'pending' as const,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'feedback'), feedbackData);
      
      onSuccess();
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      
      let errorMessage = 'Eroare la trimiterea mesajului. ';
      
      if (err.code === 'permission-denied') {
        errorMessage += 'Nu aveți permisiunea necesară. Vă rugăm să contactați administratorul.';
      } else if (err.code === 'unavailable') {
        errorMessage += 'Serviciul este temporar indisponibil. Vă rugăm să încercați din nou.';
      } else if (err.code === 'unauthenticated') {
        errorMessage += 'Sesiunea a expirat. Vă rugăm să vă autentificați din nou.';
      } else {
        errorMessage += 'Vă rugăm să încercați din nou.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-[10000]">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-[10001]">
          <h2 className="text-xl font-semibold text-gray-900">
            Trimite mesaj către administrator
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-semibold mb-1">Eroare</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tip mesaj
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setType('comment')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  type === 'comment'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="font-medium">Comentariu</span>
              </button>
              <button
                type="button"
                onClick={() => setType('request')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  type === 'request'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span className="font-medium">Cerere</span>
              </button>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subiect *
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Actualizare hartă, Problemă tehnică, etc."
              required
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Mesaj *
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Descrieți detaliat comentariul sau cererea dumneavoastră..."
              required
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Informație:</strong> Mesajul va fi trimis către administrator și va fi vizibil în panoul de administrare. 
              Veți primi un răspuns în cel mai scurt timp posibil.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Se trimite...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Trimite mesaj</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
