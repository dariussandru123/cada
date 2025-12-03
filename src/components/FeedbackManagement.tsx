import { useState, useEffect } from 'react';
import { MessageSquare, FileText, CheckCircle, Clock, Trash2, X } from 'lucide-react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Feedback } from '../types/feedback';

export default function FeedbackManagement() {
  const { currentUser } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'solved'>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const feedbackList: Feedback[] = [];
      querySnapshot.forEach((doc) => {
        feedbackList.push({
          id: doc.id,
          ...doc.data()
        } as Feedback);
      });
      
      setFeedbacks(feedbackList);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to feedback:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function handleMarkAsSolved(feedbackId: string) {
    if (!currentUser) return;
    
    try {
      await updateDoc(doc(db, 'feedback', feedbackId), {
        status: 'solved',
        resolvedAt: new Date().toISOString(),
        resolvedBy: currentUser.uid,
        resolvedByEmail: currentUser.email
      });
    } catch (error) {
      console.error('Error marking feedback as solved:', error);
      alert('Eroare la marcarea ca rezolvat');
    }
  }

  async function handleDelete(feedbackId: string) {
    if (!confirm('Sigur doriți să ștergeți acest mesaj?')) return;
    
    try {
      await deleteDoc(doc(db, 'feedback', feedbackId));
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Eroare la ștergerea mesajului');
    }
  }

  const filteredFeedbacks = feedbacks.filter(feedback => {
    if (filter === 'all') return true;
    return feedback.status === filter;
  });

  const pendingCount = feedbacks.filter(f => f.status === 'pending').length;
  const solvedCount = feedbacks.filter(f => f.status === 'solved').length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Mesaje de la UAT-uri
          </h2>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              {pendingCount} în așteptare
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {solvedCount} rezolvate
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              filter === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Toate ({feedbacks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              filter === 'pending'
                ? 'border-yellow-600 text-yellow-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            În așteptare ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('solved')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              filter === 'solved'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Rezolvate ({solvedCount})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Se încarcă...</div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nu există mesaje {filter !== 'all' ? filter === 'pending' ? 'în așteptare' : 'rezolvate' : ''}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className={`border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer ${
                  feedback.status === 'pending'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-green-200 bg-green-50'
                }`}
                onClick={() => setSelectedFeedback(feedback)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {feedback.type === 'comment' ? (
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-purple-600" />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{feedback.subject}</h3>
                      <p className="text-sm text-gray-600">
                        {feedback.uatName} • {feedback.uatEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {feedback.status === 'pending' ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        <Clock className="h-3 w-3" />
                        În așteptare
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        <CheckCircle className="h-3 w-3" />
                        Rezolvat
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                  {feedback.message}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Trimis: {new Date(feedback.createdAt).toLocaleString('ro-RO')}
                  </span>
                  {feedback.resolvedAt && (
                    <span>
                      Rezolvat: {new Date(feedback.resolvedAt).toLocaleString('ro-RO')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                  {feedback.status === 'pending' && (
                    <button
                      onClick={() => handleMarkAsSolved(feedback.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Marchează ca rezolvat
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(feedback.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    Șterge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-[10000]">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-[10001]">
              <h2 className="text-xl font-semibold text-gray-900">
                Detalii mesaj
              </h2>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedFeedback.type === 'comment' ? (
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  ) : (
                    <FileText className="h-6 w-6 text-purple-600" />
                  )}
                  <span className="text-sm font-medium text-gray-600">
                    {selectedFeedback.type === 'comment' ? 'Comentariu' : 'Cerere'}
                  </span>
                </div>
                {selectedFeedback.status === 'pending' ? (
                  <span className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    În așteptare
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Rezolvat
                  </span>
                )}
              </div>

              {/* UAT Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Informații UAT</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Nume:</strong> {selectedFeedback.uatName}</p>
                  <p><strong>Email:</strong> {selectedFeedback.uatEmail}</p>
                </div>
              </div>

              {/* Subject */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Subiect</h3>
                <p className="text-gray-700">{selectedFeedback.subject}</p>
              </div>

              {/* Message */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Mesaj</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedFeedback.message}</p>
              </div>

              {/* Timestamps */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <p><strong>Trimis la:</strong> {new Date(selectedFeedback.createdAt).toLocaleString('ro-RO')}</p>
                {selectedFeedback.resolvedAt && (
                  <>
                    <p><strong>Rezolvat la:</strong> {new Date(selectedFeedback.resolvedAt).toLocaleString('ro-RO')}</p>
                    {selectedFeedback.resolvedByEmail && (
                      <p><strong>Rezolvat de:</strong> {selectedFeedback.resolvedByEmail}</p>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDelete(selectedFeedback.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Șterge
                </button>
                {selectedFeedback.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleMarkAsSolved(selectedFeedback.id);
                      setSelectedFeedback(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Marchează ca rezolvat
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
