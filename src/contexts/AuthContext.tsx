import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import type { UserRole, UserData } from '../types/user';

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setUserData(null);
    navigate('/');
  }

  useEffect(() => {
    console.log('🔐 AuthContext: Setting up auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔐 Auth state changed:', user?.email || 'No user');
      setCurrentUser(user);
      
      if (user) {
        try {
          console.log('📄 Fetching user data from Firestore for:', user.uid);
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            console.log('✅ User data loaded:', {
              email: data.email,
              role: data.role,
              uatName: data.uatName,
              hasShapefile: !!data.shapefileUrl
            });
            setUserData(data);
            
            // Navigate based on role after userData is loaded
            console.log('🔀 AuthContext: Navigating based on role:', data.role);
            if (data.role === 'admin') {
              console.log('🔀 AuthContext: Navigating to /admin');
              navigate('/admin', { replace: true });
            } else if (data.role === 'city_hall_manager') {
              console.log('🔀 AuthContext: Navigating to /uat');
              navigate('/uat', { replace: true });
            }
          } else {
            console.log('⚠️ User document not found, creating default...');
            // Create default user document if it doesn't exist
            const defaultUserData: UserData = {
              uid: user.uid,
              email: user.email || '',
              role: 'city_hall_manager' as UserRole,
              createdAt: new Date().toISOString()
            };
            
            await setDoc(userDocRef, defaultUserData);
            setUserData(defaultUserData);
            console.log('✅ Default user document created');
            navigate('/uat', { replace: true });
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
          // Set default data even if Firestore fails
          const defaultData = {
            uid: user.uid,
            email: user.email || '',
            role: 'city_hall_manager' as UserRole,
            createdAt: new Date().toISOString()
          };
          setUserData(defaultData);
          navigate('/uat', { replace: true });
        }
      } else {
        console.log('👤 No user logged in');
        setUserData(null);
      }
      
      setLoading(false);
      console.log('✅ Auth loading complete');
    });

    return unsubscribe;
  }, [navigate]);

  const value = {
    currentUser,
    userData,
    loading,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
