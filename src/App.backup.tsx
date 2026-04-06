/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  Upload,
  BarChart3,
  History,
  Settings,
  LayoutDashboard,
  LogOut,
  Play,
  Square,
  Loader2,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Smile,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  FileAudio,
  User,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  Bell,
  CreditCard,
  Lock,
  Globe,
  Moon,
  Sun,
  Mail,
  Camera,
  Trash2,
  Eye,
  EyeOff,
  Key,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { cn } from './lib/utils';
import {
  auth,
  loginWithGoogle,
  logout,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  updateDoc,
  deleteDoc,
  FirebaseUser
} from './firebase';
import { AppState, AnalysisResult } from './types';
import { analyzeAudio, generateScript } from './services/gemini';

// --- Error Handling ---

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Ensure Firestore is created in the console.");
    }
    // Skip logging for other errors, as this is simply a connection test.
  }
}
testConnection();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const isOffline = message.includes('the client is offline');

  const errInfo: FirestoreErrorInfo = {
    error: isOffline
      ? "Firestore database not found. Please ensure you have clicked 'Create database' in your Firebase Console (Firestore Database tab)."
      : message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  if (isOffline) {
    console.error("CRITICAL: Firestore database not initialized. Visit https://console.firebase.google.com/project/ai-voice-c8dce/firestore to create it.");
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: {
  isOpen: boolean,
  onClose: () => void,
  onConfirm: () => void,
  title: string,
  message: string
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-slate-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800"
          >
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => { onConfirm(); onClose(); }}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Sidebar = ({ active, onChange, isOpen, onToggle, user, onLogout, onSignInClick }: {
  active: AppState,
  onChange: (s: AppState) => void,
  isOpen: boolean,
  onToggle: () => void,
  user: FirebaseUser | null,
  onLogout: () => void,
  onSignInClick: () => void
}) => {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <motion.div
      animate={{ width: isOpen ? 256 : 80 }}
      className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 h-screen flex flex-col border-r border-slate-100 dark:border-slate-800 relative transition-colors duration-300"
    >
      <div className="p-6 flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <Zap className="text-white w-6 h-6 fill-current" />
        </div>
        {isOpen && <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">SpeakAI</span>}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-hidden">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id as AppState)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              active === item.id
                ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium"
                : "hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <item.icon className={cn("w-5 h-5 shrink-0", active === item.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
            {isOpen && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 overflow-hidden">
        {user ? (
          <div
            onClick={() => onChange('profile')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group relative",
              active === 'profile' && "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
            </div>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.displayName || 'User'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Pro Plan</p>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              className="absolute right-4 text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={onSignInClick} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
            <User className="w-4 h-4" />
            {isOpen && <span className="text-sm font-bold">Sign In</span>}
          </button>
        )}
      </div>

      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors z-50 shadow-sm"
      >
        <ChevronRight className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>
    </motion.div>
  );
};

const HistoryView = ({ analyses, loading, onSelect }: {
  analyses: AnalysisResult[],
  loading: boolean,
  onSelect: (a: AnalysisResult) => void
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmotion, setFilterEmotion] = useState<string>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'analyses', deleteId));
      setDeleteId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `analyses/${deleteId}`);
    }
  };

  const handleRename = async (e: React.MouseEvent, item: AnalysisResult) => {
    e.stopPropagation();
    setEditingId(item.id);
    setNewName(item.title || `Recording ${item.id.substring(0, 6)}`);
  };

  const saveRename = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'analyses', id), { title: newName });
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `analyses/${id}`);
    }
  };

  const filteredAnalyses = analyses.filter(item => {
    const title = item.title || `Recording ${item.id.substring(0, 6)}`;
    const matchesSearch = item.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEmotion = filterEmotion === 'All' || item.metrics.dominantEmotion === filterEmotion;
    return matchesSearch && matchesEmotion;
  });

  const emotions = ['All', ...new Set(analyses.map(a => a.metrics.dominantEmotion))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Analysis History</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Track your progress and revisit past insights.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search transcript or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full sm:w-64"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
            <select
              value={filterEmotion}
              onChange={(e) => setFilterEmotion(e.target.value)}
              className="appearance-none pl-12 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full sm:w-48 font-medium text-slate-700 dark:text-slate-300"
            >
              {emotions.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredAnalyses.length === 0 ? (
        <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <History className="w-10 h-10 text-slate-200 dark:text-slate-700" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No records found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAnalyses.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onSelect(item)}
              className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 cursor-pointer transition-all group relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                  <FileAudio className="w-7 h-7 text-slate-400 dark:text-slate-600 group-hover:text-indigo-500" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleRename(e, item)}
                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                {editingId === item.id ? (
                  <div className="flex gap-2 mb-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="flex-1 px-3 py-1 border border-indigo-500 rounded-lg text-sm focus:outline-none dark:bg-slate-800 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={(e) => saveRename(e, item.id)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">
                    {item.title || `Recording ${item.id.substring(0, 6)}`}
                  </h4>
                )}
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {item.metrics.dominantEmotion}
                </span>
                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {item.metrics.wpm} WPM
                </span>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800">
                <span className="text-xs font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Recording"
        message="Are you sure you want to delete this recording? This action cannot be undone."
      />
    </div>
  );
};

const LoginModal = ({ isOpen, onClose, onGoogleLogin }: {
  isOpen: boolean,
  onClose: () => void,
  onGoogleLogin: () => void
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const validatePassword = (pass: string) => {
    const hasCap = /[A-Z]/.test(pass);
    const hasSmall = /[a-z]/.test(pass);
    const hasNum = /[0-9]/.test(pass);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    return hasCap && hasSmall && hasNum && hasSymbol && pass.length >= 8;
  };

  const validateEmail = (mail: string) => {
    return /^[^\s@]+@gmail\.com$/.test(mail);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!validateEmail(email)) {
      setError("Please use a standard Gmail address (@gmail.com).");
      return;
    }

    if (mode === 'signup') {
      if (!username) {
        setError("Username is required.");
        return;
      }
      if (!validatePassword(password)) {
        setError("Password must contain at least 8 characters, including a capital letter, a small letter, a number, and a symbol.");
        return;
      }
      setLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: username });
        onClose();
      } catch (err: any) {
        if (err.code === 'auth/network-request-failed') {
          setError("Network error: Please check your internet connection and try again.");
        } else if (err.code === 'auth/operation-not-allowed') {
          setError("Email/Password sign-in is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.");
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    } else if (mode === 'signin') {
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } catch (err: any) {
        if (err.code === 'auth/network-request-failed') {
          setError("Network error: Please check your internet connection and try again.");
        } else if (err.code === 'auth/operation-not-allowed') {
          setError("Email/Password sign-in is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.");
        } else {
          setError("Invalid email or password.");
        }
      } finally {
        setLoading(false);
      }
    } else if (mode === 'forgot') {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email);
        setMessage("Password reset email sent! Please check your inbox.");
      } catch (err: any) {
        if (err.code === 'auth/network-request-failed') {
          setError("Network error: Please check your internet connection and try again.");
        } else if (err.code === 'auth/operation-not-allowed') {
          setError("Email/Password sign-in is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.");
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await onGoogleLogin();
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError("Network error: Google sign-in failed. Please check your connection.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("Popup blocked: Please allow popups for this site to sign in with Google.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("Unauthorized domain: Please add this app's domain to the 'Authorized domains' list in the Firebase Console (Authentication > Settings).");
      } else {
        setError(err.message || "Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-blue-500" />

            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  {mode === 'signin' ? 'Sign in to continue your journey' : mode === 'signup' ? 'Join SpeakAI today' : 'Enter your email to reset'}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {message && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {message}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your name"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Gmail Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-500"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Or continue with</span>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full mt-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Globe className="w-5 h-5" />
              Google Account
            </button>

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500">
                {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                <button
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setError(null);
                    setMessage(null);
                  }}
                  className="ml-2 font-bold text-indigo-600 hover:text-indigo-50"
                >
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
              {mode === 'forgot' && (
                <button
                  onClick={() => setMode('signin')}
                  className="mt-4 text-sm font-bold text-slate-400 hover:text-slate-600"
                >
                  Back to Sign In
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const LandingPage = ({ onStart, onDemo }: { onStart: () => void, onDemo: () => void }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden relative scroll-smooth">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] translate-y-1/2 pointer-events-none" />

      <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <Zap className="w-8 h-8 text-indigo-500 fill-current" />
          <span className="text-2xl font-bold tracking-tight">SpeakAI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-slate-400 font-medium">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <button onClick={onStart} className="bg-white text-slate-950 px-6 py-2.5 rounded-full font-bold hover:bg-indigo-50 transition-all active:scale-95">
            Sign In
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 relative z-10">
        <div className="max-w-3xl mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>New: Enterprise Emotion AI v2.0</span>
            </div>
            <h1 className="text-7xl font-bold leading-[1.1] tracking-tight mb-8">
              Analyze Your Voice <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">Like a Professional.</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed mb-10 max-w-2xl">
              The world's most advanced AI-powered voice coaching platform.
              Get instant feedback on emotion, pacing, and clarity to transform
              your communication skills.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={onStart}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-500 transition-all flex items-center gap-3 group shadow-lg shadow-indigo-600/20"
              >
                Sign In to Start
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onDemo}
                className="bg-slate-900 border border-slate-800 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all"
              >
                Try Demo Mode
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 1 }}
            className="mt-20 flex items-center gap-12 grayscale opacity-50"
          >
            <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Trusted By</span>
            <div className="flex gap-8 items-center">
              <div className="text-xl font-black">TECHCORP</div>
              <div className="text-xl font-black">GLOBALEDU</div>
              <div className="text-xl font-black">VOICEMEDIA</div>
            </div>
          </motion.div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-32 border-t border-slate-900">
          <div className="mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-slate-400 text-lg max-w-2xl">Everything you need to master your vocal presence and communication style.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Mic, title: "Real-time Analysis", desc: "Get instant feedback as you speak, with low-latency processing." },
              { icon: Smile, title: "Emotion Detection", desc: "Understand the emotional impact of your voice with advanced AI." },
              { icon: BarChart3, title: "Deep Metrics", desc: "Track WPM, filler words, pitch variance, and vocal professionality." },
              { icon: MessageSquare, title: "Smart Transcripts", desc: "AI-generated transcripts with key insight highlighting." },
              { icon: TrendingUp, title: "Progress Tracking", desc: "Visualize your improvement over time with detailed history." },
              { icon: ShieldCheck, title: "Enterprise Security", desc: "Your data is encrypted and private, following strict security standards." }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-slate-900/50 border border-slate-800 rounded-[32px] hover:border-indigo-500/50 transition-all group"
              >
                <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                  <feature.icon className="w-6 h-6 text-indigo-400 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>



        {/* Pricing Section */}
        <section id="pricing" className="py-32 border-t border-slate-900">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400 text-lg">Choose the plan that's right for your communication goals.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Free",
                price: "₹0",
                features: [
                  "2 analyses / month",
                  "Basic emotion detection",
                  "24-hour history",
                  "Standard support"
                ]
              },
              {
                name: "Pro",
                price: "₹49",
                popular: true,
                features: [
                  "Unlimited analyses",
                  "Advanced vocal metrics",
                  "Lifetime history",
                  "Priority support",
                  "PDF & HTML reports",
                  "Smart teleprompter"
                ]
              },
              {
                name: "Enterprise",
                price: "₹99",
                features: [
                  "Everything in Pro",
                  "Team collaboration",
                  "API access",
                  "Custom AI training",
                  "Dedicated account manager",
                  "SLA guarantee",
                  "Bulk data export"
                ]
              }
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "p-10 rounded-[40px] border flex flex-col relative",
                  plan.popular ? "bg-indigo-600 border-indigo-500 shadow-2xl shadow-indigo-600/20" : "bg-slate-900 border-slate-800"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-indigo-600 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-black">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-slate-400">/mo</span>}
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className={cn("w-5 h-5", plan.popular ? "text-indigo-200" : "text-indigo-500")} />
                      <span className={plan.popular ? "text-indigo-50" : "text-slate-300"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onStart}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold transition-all active:scale-95",
                    plan.popular ? "bg-white text-indigo-600 hover:bg-indigo-50" : "bg-slate-800 text-white hover:bg-slate-700"
                  )}
                >
                  {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-900 text-center text-slate-500 text-sm">
        <p>&copy; 2026 SpeakAI. All rights reserved.</p>
      </footer>
    </div>
  );
};

const OnboardingFlow = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Welcome to SpeakAI",
      description: "Your AI-powered speech coach. Let's take a quick tour of how we can help you master your vocal delivery.",
      icon: <Sparkles className="w-12 h-12 text-indigo-600" />,
      image: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Record & Practice",
      description: "Use our smart teleprompter to practice your speeches. We'll monitor your pace, tone, and clarity in real-time.",
      icon: <Mic className="w-12 h-12 text-indigo-600" />,
      image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Deep Analysis",
      description: "Get instant feedback on your WPM, filler words, emotional resonance, and vocal variety using advanced AI models.",
      icon: <BarChart3 className="w-12 h-12 text-indigo-600" />,
      image: "https://images.unsplash.com/photo-1551288049-bbda48658a7d?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Actionable Insights",
      description: "Receive personalized recommendations to improve your public speaking skills and track your progress over time.",
      icon: <Zap className="w-12 h-12 text-indigo-600" />,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"
    }
  ];

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[600px]"
      >
        <div className="flex-1 p-12 flex flex-col justify-between">
          <div>
            <div className="mb-8">{steps[step].icon}</div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 leading-tight">
              {steps[step].title}
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed">
              {steps[step].description}
            </p>
          </div>

          <div className="flex items-center justify-between mt-12">
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === step ? "w-8 bg-indigo-600" : "w-2 bg-slate-200 dark:bg-slate-800"
                  )}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {step === steps.length - 1 ? "Get Started" : "Next Step"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="hidden md:block w-1/2 relative bg-slate-100 dark:bg-slate-800">
          <AnimatePresence mode="wait">
            <motion.img
              key={step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={steps[step].image}
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
        </div>
      </motion.div>
    </div>
  );
};

const SettingsView = ({ onLogout, darkMode, setDarkMode, language, setLanguage, onSignInClick, isDemoMode }: {
  onLogout: () => void,
  darkMode: boolean,
  setDarkMode: (v: boolean) => void,
  language: string,
  setLanguage: (v: string) => void,
  onSignInClick: () => void,
  isDemoMode: boolean
}) => {
  const [notifications, setNotifications] = useState(true);

  const sections = [
    {
      title: language === 'Hindi' ? 'सामान्य' : 'General',
      icon: Settings,
      options: [
        { label: language === 'Hindi' ? 'पुश नोटिफिकेशन' : 'Push Notifications', description: language === 'Hindi' ? 'विश्लेषण पूरा होने पर अलर्ट प्राप्त करें' : 'Get alerts for analysis completion', type: 'toggle', value: notifications, onChange: setNotifications },
        { label: language === 'Hindi' ? 'डार्क मोड' : 'Dark Mode', description: language === 'Hindi' ? 'डार्क इंटरफेस पर स्विच करें' : 'Switch to a darker interface', type: 'toggle', value: darkMode, onChange: setDarkMode }
      ]
    },
    {
      title: language === 'Hindi' ? 'सदस्यता' : 'Subscription',
      icon: CreditCard,
      options: [
        { label: language === 'Hindi' ? 'वर्तमान योजना' : 'Current Plan', description: language === 'Hindi' ? 'आप प्रो प्लान ($19/mo) पर हैं' : 'You are on the Pro Plan ($19/mo)', type: 'button', actionLabel: language === 'Hindi' ? 'योजना प्रबंधित करें' : 'Manage Plan' },
        { label: language === 'Hindi' ? 'बिलिंग इतिहास' : 'Billing History', description: language === 'Hindi' ? 'अपने पिछले चालान देखें और डाउनलोड करें' : 'View and download your past invoices', type: 'button', actionLabel: language === 'Hindi' ? 'चालान देखें' : 'View Invoices' },
      ]
    }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            {language === 'Hindi' ? 'सेटिंग्स' : 'Settings'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {language === 'Hindi' ? 'अपनी खाता प्राथमिकताएं और सदस्यता प्रबंधित करें।' : 'Manage your account preferences and subscription.'}
          </p>
        </div>
        {isDemoMode ? (
          <button
            onClick={onSignInClick}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
          >
            <User className="w-5 h-5" />
            {language === 'Hindi' ? 'साइन इन करें' : 'Sign In'}
          </button>
        ) : (
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {language === 'Hindi' ? 'लॉग आउट' : 'Log Out'}
          </button>
        )}
      </div>

      <div className="space-y-8">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
              <section.icon className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">{section.title}</h3>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {section.options.map((opt, i) => (
                <div key={i} className="px-8 py-6 flex items-center justify-between gap-6">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-0.5">{opt.label}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{opt.description}</p>
                  </div>
                  {opt.type === 'toggle' && (
                    <button
                      onClick={() => opt.onChange?.(!opt.value)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        opt.value ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                        opt.value ? "left-7" : "left-1"
                      )} />
                    </button>
                  )}
                  {opt.type === 'select' && (
                    <select
                      value={opt.value as string}
                      onChange={(e) => opt.onChange?.(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {opt.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  {opt.type === 'button' && (
                    <button className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-transparent dark:border-slate-700">
                      {opt.actionLabel}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfileView = ({ user, analyses, onLogout, setError }: {
  user: FirebaseUser,
  analyses: AnalysisResult[],
  onLogout: () => void,
  setError: (msg: string | null) => void
}) => {
  const avgScore = analyses.length > 0
    ? Math.round(analyses.reduce((acc, curr) => acc + curr.overallScore, 0) / analyses.length)
    : 0;

  const totalDuration = analyses.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const totalHours = (totalDuration / 3600).toFixed(1);

  const handleDownloadAllData = async () => {
    try {
      const q = query(collection(db, 'analyses'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => doc.data());

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `speakai-all-data-${user.uid}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'analyses');
    }
  };

  const handleExportVoiceProfile = async () => {
    try {
      const q = query(collection(db, 'analyses'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const analyses = snapshot.docs.map(doc => doc.data() as AnalysisResult);

      if (analyses.length === 0) {
        setError("No analysis data found to export.");
        return;
      }

      const avgScore = analyses.reduce((acc, a) => acc + a.overallScore, 0) / analyses.length;
      const avgWpm = analyses.reduce((acc, a) => acc + a.metrics.wpm, 0) / analyses.length;
      const emotions = analyses.map(a => a.metrics.dominantEmotion);
      const mostFrequentEmotion = emotions.sort((a, b) =>
        emotions.filter(v => v === a).length - emotions.filter(v => v === b).length
      ).pop();

      const profileHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SpeakAI Voice Profile - ${user.displayName}</title>
    <style>
        body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 20px; background: #f1f5f9; }
        .card { background: white; border-radius: 32px; padding: 50px; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
        .header { text-align: center; margin-bottom: 50px; }
        .logo { font-weight: 900; font-size: 32px; color: #4f46e5; margin-bottom: 10px; }
        .user-name { font-size: 24px; font-weight: 700; color: #0f172a; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 50px; }
        .stat-box { background: #f8fafc; padding: 30px; border-radius: 24px; text-align: center; border: 1px solid #f1f5f9; }
        .stat-label { font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
        .stat-value { font-size: 32px; font-weight: 900; color: #4f46e5; }
        .summary { background: #eef2ff; padding: 30px; border-radius: 24px; border: 1px solid #e0e7ff; }
        .summary-title { font-weight: 800; color: #4338ca; margin-bottom: 10px; font-size: 18px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="logo">SpeakAI</div>
            <div class="user-name">${user.displayName || 'User'}'s Voice Profile</div>
            <div style="color: #64748b; font-size: 14px; margin-top: 5px;">Generated on ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">Total Analyses</div>
                <div class="stat-value">${analyses.length}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Avg Quality Score</div>
                <div class="stat-value">${avgScore.toFixed(1)}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Avg Speaking Rate</div>
                <div class="stat-value">${avgWpm.toFixed(0)} <span style="font-size: 14px;">WPM</span></div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Dominant Tone</div>
                <div class="stat-value" style="font-size: 24px;">${mostFrequentEmotion}</div>
            </div>
        </div>

        <div class="summary">
            <div class="summary-title">Executive Summary</div>
            <p style="margin: 0; color: #3730a3;">
                Based on ${analyses.length} vocal sessions, your communication style is primarily <strong>${mostFrequentEmotion?.toLowerCase()}</strong>. 
                You maintain a consistent speaking rate of <strong>${avgWpm.toFixed(0)} words per minute</strong>, which is considered optimal for audience retention. 
                Your average quality score of <strong>${avgScore.toFixed(1)}%</strong> indicates a high level of vocal professionality.
            </p>
        </div>
    </div>
</body>
</html>
      `.trim();

      const blob = new Blob([profileHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `speakai-voice-profile.html`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'analyses');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Profile</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your personal information and public presence.</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>

      <div className="space-y-8">
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm p-10 flex flex-col md:flex-row items-center gap-10">
          <div className="relative group">
            <div className="w-32 h-32 rounded-[40px] bg-slate-100 dark:bg-slate-800 overflow-hidden border-4 border-white dark:border-slate-700 shadow-xl">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400">
                  <User className="w-12 h-12" />
                </div>
              )}
            </div>
            <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <Camera className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{user.displayName || 'Anonymous User'}</h3>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-6">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-sm font-medium">Verified Account</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-bold uppercase tracking-widest">Pro Member</span>
              <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold uppercase tracking-widest">Beta Tester</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Usage Statistics
            </h4>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Monthly Analysis Limit</span>
                  <span className="text-slate-900 dark:text-white font-bold">42 / 100</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full" style={{ width: '42%' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{totalHours}h</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Recorded</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{avgScore}%</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Avg Score</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Quick Actions
            </h4>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleDownloadAllData}
                className="w-full px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-left flex items-center justify-between group"
              >
                Download All Data
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
              <button
                onClick={handleExportVoiceProfile}
                className="w-full px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-left flex items-center justify-between group"
              >
                Export Voice Profile
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
              <button className="w-full px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all text-left flex items-center justify-between group">
                Delete Account
                <Trash2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ user, analyses, onAction, isDemoMode, onSignInClick }: {
  user: FirebaseUser | null,
  analyses: AnalysisResult[],
  onAction: (a: 'record' | 'upload' | 'history') => void,
  isDemoMode: boolean,
  onSignInClick: () => void
}) => {
  const demoAttempts = parseInt(localStorage.getItem('speakai_demo_attempts') || '0');
  const remainingAttempts = Math.max(0, 2 - demoAttempts);

  const avgScore = analyses.length > 0
    ? Math.round(analyses.reduce((acc, curr) => acc + curr.overallScore, 0) / analyses.length)
    : 0;

  const avgWpm = analyses.length > 0
    ? Math.round(analyses.reduce((acc, curr) => acc + curr.metrics.wpm, 0) / analyses.length)
    : 0;

  const emotions = analyses.map(a => a.metrics.dominantEmotion);
  const dominantEmotion = emotions.length > 0
    ? emotions.sort((a, b) => emotions.filter(v => v === a).length - emotions.filter(v => v === b).length).pop()
    : 'N/A';

  const stats = [
    { label: 'Avg Quality Score', value: `${avgScore}/100`, icon: BarChart3, color: 'text-indigo-500' },
    { label: 'Avg Speaking Rate', value: `${avgWpm} WPM`, icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Dominant Emotion', value: dominantEmotion, icon: Smile, color: 'text-emerald-500' },
    { label: 'Total Analyses', value: analyses.length.toString(), icon: History, color: 'text-amber-500' },
  ];

  const trendData = [...analyses]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-7)
    .map(a => ({
      date: new Date(a.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: a.overallScore
    }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome back, {user?.displayName?.split(' ')[0] || (isDemoMode ? 'Demo User' : 'User')}
          </h2>
          <div className="flex items-center gap-3">
            <p className="text-slate-500 dark:text-slate-400">Ready to improve your vocal delivery today?</p>
            {isDemoMode && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-800">
                  Demo: {remainingAttempts}/2 attempts left
                </span>
                <button
                  onClick={onSignInClick}
                  className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full hover:bg-indigo-500 transition-all flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onAction('record')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/10"
          >
            <Mic className="w-5 h-5" />
            Record Now
          </button>
          <button
            onClick={() => onAction('upload')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Upload className="w-5 h-5" />
            Upload Audio
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className={cn("p-2 rounded-lg bg-slate-50 dark:bg-slate-800 w-fit mb-4", stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Performance Trend</h3>
            <div className="text-sm font-medium text-slate-500">Last 7 Analyses</div>
          </div>
          <div className="h-[300px]">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-10" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tooltip-bg, #fff)' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No data yet. Start recording to see your progress!
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Recent Analyses</h3>
          <div className="space-y-6">
            {analyses.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center gap-4 group cursor-pointer" onClick={() => onAction('history')}>
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                  <FileAudio className="w-6 h-6 text-slate-400 dark:text-slate-600 group-hover:text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {item.title || `Recording ${item.id.substring(0, 6)}`}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(item.timestamp).toLocaleDateString()} • {item.metrics.dominantEmotion}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{item.overallScore}%</p>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
            {analyses.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">
                No analyses yet.
              </div>
            )}
          </div>
          <button
            onClick={() => onAction('history')}
            className="w-full mt-8 py-3 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors border-t border-slate-50 dark:border-slate-800"
          >
            View All History
          </button>
        </div>
      </div>
    </div>
  );
};

const RecordingSetup = ({ onStart, onCancel, isDemoMode }: {
  onStart: (script: string, wpm: number) => void,
  onCancel: () => void,
  isDemoMode: boolean
}) => {
  const [script, setScript] = useState('');
  const [topic, setTopic] = useState('');
  const [wpm, setWpm] = useState(150);
  const [language, setLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateScript = async () => {
    if (!topic) return;
    setIsGenerating(true);
    try {
      const generated = await generateScript(topic, language);
      setScript(generated);
    } catch (err) {
      console.error("Failed to generate script", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const languages = ['English', 'Hindi'];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Recording Setup</h2>
          <p className="text-slate-500 dark:text-slate-400">Prepare your script and settings before you start.</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <X className="w-6 h-6 text-slate-400" />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  Teleprompter Script
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {!script && (
                  <>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border-none text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 min-w-[100px]"
                    >
                      {languages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Enter topic..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border-none text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                    />
                  </>
                )}
                <button
                  onClick={handleGenerateScript}
                  disabled={isGenerating || !topic}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 shrink-0"
                  title="Generate Script with AI"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your script here or generate one using a topic..."
              className="w-full h-64 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Speech Pace
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-medium text-slate-500 mb-2">
                  <span>Target WPM</span>
                  <span className="text-indigo-600 font-bold">{wpm} WPM</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="250"
                  step="5"
                  value={wpm}
                  onChange={(e) => setWpm(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="mt-2 text-[10px] text-slate-400 italic">Average speaking speed is 130-160 WPM.</p>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-600/20">
            <h4 className="text-xl font-bold mb-2">Ready to practice?</h4>
            <p className="text-indigo-100 text-sm mb-6">The teleprompter will follow your {wpm} WPM target.</p>
            <button
              onClick={() => onStart(script, wpm)}
              className="w-full py-4 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              {script ? 'Start Practice' : 'Start Recording'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecordingScreen = ({
  script,
  wpm,
  audioQuality,
  onStop,
  onReset,
  onAnalyze,
  isRecording,
  isPaused,
  onTogglePause
}: {
  script: string,
  wpm: number,
  audioQuality: string,
  onStop: () => void,
  onReset: () => void,
  onAnalyze: () => void,
  isRecording: boolean,
  isPaused: boolean,
  onTogglePause: () => void
}) => {
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const words = useMemo(() => script ? script.split(/\s+/) : [], [script]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsCountingDown(false);
    }
  }, [countdown]);

  useEffect(() => {
    if (!isCountingDown && isRecording && !isPaused && words.length > 0) {
      const msPerWord = 60000 / wpm;
      const interval = setInterval(() => {
        setCurrentWordIndex(prev => {
          if (prev >= words.length - 1) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, msPerWord);
      return () => clearInterval(interval);
    }
  }, [isCountingDown, isRecording, isPaused, words, wpm]);

  useEffect(() => {
    if (scrollRef.current && currentWordIndex >= 0) {
      const activeWord = scrollRef.current.querySelector(`[data-word-index="${currentWordIndex}"]`);
      if (activeWord) {
        activeWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentWordIndex]);

  if (isCountingDown) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <motion.div
          key={countdown}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          className="text-[120px] font-black text-indigo-600"
        >
          {countdown}
        </motion.div>
        <p className="text-xl font-bold text-slate-500 mt-8">Get ready...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8 max-w-5xl mx-auto">
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative">
        {script ? (
          <div
            ref={scrollRef}
            className="flex-1 p-12 overflow-y-auto no-scrollbar scroll-smooth"
          >
            <div className="max-w-3xl mx-auto py-20">
              <p className="text-4xl font-bold leading-relaxed text-slate-200 dark:text-slate-800">
                {words.map((word, i) => {
                  const isPast = i < currentWordIndex;
                  const isActive = i === currentWordIndex;
                  return (
                    <span
                      key={i}
                      data-word-index={i}
                      className={cn(
                        "transition-all duration-300 mr-3 inline-block",
                        isActive ? "text-indigo-600 dark:text-indigo-400 scale-110" :
                          isPast ? "text-slate-400 dark:text-slate-600" : "text-slate-200 dark:text-slate-800"
                      )}
                    >
                      {word}
                    </span>
                  );
                })}
              </p>
              <div className="h-[400px]" />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
              <Mic className="w-10 h-10 text-indigo-600 animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Recording in Progress</h3>
            <p className="text-slate-500 dark:text-slate-400">Speak naturally. We're analyzing your vocal delivery.</p>
          </div>
        )}

        <div className="p-8 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2",
              audioQuality === 'Good' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            )}>
              <div className={cn("w-2 h-2 rounded-full animate-pulse", audioQuality === 'Good' ? "bg-emerald-500" : "bg-amber-500")} />
              {audioQuality} Quality
            </div>
            {script && (
              <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-widest">
                Target: {wpm} WPM
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onReset}
              className="p-4 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all font-bold flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Reset
            </button>
            <button
              onClick={onTogglePause}
              className="p-4 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all font-bold flex items-center gap-2"
            >
              {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Square className="w-5 h-5 fill-current" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={onAnalyze}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 transition-all font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <Zap className="w-5 h-5" />
              Stop & Analyze
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProcessingScreen = ({ audioUrl }: { audioUrl: string | null }) => {
  const [stage, setStage] = useState(0);
  const stages = [
    'Uploading audio...',
    'Transcribing speech...',
    'Analyzing emotional markers...',
    'Evaluating vocal characteristics...',
    'Generating insights...'
  ];

  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `speakai-recording-${new Date().getTime()}.webm`;
    link.click();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setStage(s => (s < stages.length - 1 ? s + 1 : s));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center">
      <div className="relative mb-12">
        <div className="w-24 h-24 border-4 border-slate-100 dark:border-slate-800 rounded-full" />
        <div className="absolute top-0 left-0 w-24 h-24 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
        <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-600 fill-current" />
      </div>

      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Analyzing Your Voice</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-8">Our AI pipeline is processing your recording to provide enterprise-level insights.</p>

      <div className="w-full space-y-4 mb-10">
        {stages.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500",
              i < stage ? "bg-emerald-500 text-white" : i === stage ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800"
            )}>
              {i < stage ? <CheckCircle2 className="w-3 h-3" /> : i === stage ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            </div>
            <span className={cn(
              "text-sm font-medium transition-colors duration-500",
              i < stage ? "text-emerald-600 dark:text-emerald-400" : i === stage ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-slate-600"
            )}>
              {s}
            </span>
          </div>
        ))}
      </div>

      {audioUrl && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
        >
          <FileAudio className="w-4 h-4" />
          Download Raw Recording
        </button>
      )}
    </div>
  );
};

const ResultsDashboard = ({ result, audioUrl, darkMode }: { result: AnalysisResult, audioUrl: string | null, darkMode: boolean }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `speakai-analysis-${result.id}.webm`;
    link.click();
  };

  const handleExportReport = async () => {
    const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SpeakAI Analysis Report - ${result.id}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        
        :root {
            --primary: #4f46e5;
            --primary-light: #eef2ff;
            --secondary: #0f172a;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --bg-body: #f8fafc;
            --bg-card: #ffffff;
            --success: #059669;
            --success-bg: #ecfdf5;
            --warning: #d97706;
            --warning-bg: #fffbeb;
            --danger: #dc2626;
            --danger-bg: #fef2f2;
        }

        body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            line-height: 1.6; 
            color: var(--text-main); 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            background: var(--bg-body); 
        }

        .card { 
            background: var(--bg-card); 
            border-radius: 32px; 
            padding: 60px; 
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1); 
            border: 1px solid #e2e8f0; 
        }

        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 60px; 
        }

        .logo-container {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .logo-icon {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, var(--primary), #3b82f6);
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 900;
            font-size: 22px;
            flex-shrink: 0;
        }

        .logo-text { 
            font-weight: 900; 
            font-size: 28px; 
            color: var(--secondary); 
            letter-spacing: -0.02em;
        }

        .report-meta { 
            text-align: right; 
            font-size: 13px; 
            color: var(--text-muted); 
            font-weight: 500;
        }

        .hero-section {
            text-align: center;
            margin-bottom: 60px;
            padding: 40px;
            background: var(--primary-light);
            border-radius: 24px;
        }

        .score-container {
            width: 120px;
            height: 120px;
            margin: 0 auto 24px;
        }

        .score-circle { 
            width: 120px; 
            height: 120px; 
            border-radius: 50%; 
            background: var(--primary); 
            color: white; 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            justify-content: center; 
            box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);
        }

        .score-value {
            font-size: 40px; 
            font-weight: 900; 
            line-height: 1;
            margin-bottom: 4px;
        }

        .score-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            opacity: 0.8;
        }

        .hero-title { 
            margin: 0; 
            font-size: 32px; 
            font-weight: 900; 
            color: var(--secondary);
            letter-spacing: -0.02em;
        }

        .hero-subtitle {
            color: var(--text-muted);
            font-size: 16px;
            margin-top: 8px;
        }

        .section-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 60px;
        }

        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 20px; 
            margin-bottom: 60px; 
        }

        .metric-card { 
            background: #ffffff; 
            padding: 24px; 
            border-radius: 20px; 
            text-align: center; 
            border: 1px solid #f1f5f9;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
        }

        .metric-label {
            font-size: 11px; 
            font-weight: 700; 
            color: var(--text-muted); 
            text-transform: uppercase; 
            letter-spacing: 0.1em;
            margin-bottom: 8px;
        }

        .metric-value { 
            font-size: 24px; 
            font-weight: 800; 
            color: var(--primary); 
        }

        .section-title { 
            font-size: 16px; 
            font-weight: 800; 
            margin-bottom: 20px; 
            color: var(--secondary); 
            text-transform: uppercase; 
            letter-spacing: 0.1em;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-title::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #e2e8f0;
        }

        .insight-card {
            padding: 20px;
            border-radius: 16px;
            margin-bottom: 16px;
            display: flex;
            gap: 16px;
            align-items: flex-start;
        }

        .strength-card { 
            background: var(--success-bg); 
            border: 1px solid #d1fae5;
        }

        .strength-icon { color: var(--success); font-weight: bold; font-size: 18px; }
        .strength-text { color: #065f46; font-size: 14px; font-weight: 600; }

        .weakness-card { 
            background: var(--danger-bg); 
            border: 1px solid #fee2e2;
        }

        .weakness-icon { color: var(--danger); font-weight: bold; font-size: 18px; }
        .weakness-text { color: #991b1b; font-size: 14px; font-weight: 600; }

        .summary-box {
            background: #f8fafc;
            padding: 32px;
            border-radius: 24px;
            border: 1px solid #e2e8f0;
            margin-bottom: 60px;
        }

        .summary-text {
            font-size: 16px;
            color: var(--text-main);
            line-height: 1.7;
            font-weight: 500;
        }

        .transcript-box {
            background: #ffffff;
            padding: 32px;
            border-radius: 24px;
            border: 1px dashed #cbd5e1;
            color: var(--text-muted);
            font-size: 14px;
            line-height: 1.8;
            font-style: italic;
        }

        .footer {
            margin-top: 60px;
            text-align: center;
            font-size: 12px;
            color: var(--text-muted);
            border-top: 1px solid #e2e8f0;
            padding-top: 40px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="logo-container">
                <div class="logo-icon">S</div>
                <div class="logo-text">SpeakAI</div>
            </div>
            <div class="report-meta">
                REPORT ID: ${result.id}<br>
                DATE: ${new Date(result.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
                TIME: ${new Date(result.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>

        <div class="hero-section">
            <div class="score-container">
                <div class="score-circle">
                    <div class="score-value">${result.overallScore}</div>
                    <div class="score-label">Score</div>
                </div>
            </div>
            <h1 class="hero-title">Speech Analysis Report</h1>
            <p class="hero-subtitle">Comprehensive evaluation of your vocal performance</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Speaking Rate</div>
                <div class="metric-value">${result.metrics.wpm} <span style="font-size: 12px; opacity: 0.6;">WPM</span></div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Dominant Emotion</div>
                <div class="metric-value">${result.metrics.dominantEmotion}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Vocal Variety</div>
                <div class="metric-value">${result.metrics.vocalVariety}%</div>
            </div>
        </div>

        ${result.summary ? `
        <div class="section-title">Executive Summary</div>
        <div class="summary-box">
            <div class="summary-text">${result.summary}</div>
        </div>
        ` : ''}

        <div class="section-grid">
            <div>
                <div class="section-title">Key Strengths</div>
                ${result.insights.strengths.map(s => `
                    <div class="insight-card strength-card">
                        <div class="strength-icon">✓</div>
                        <div class="strength-text">${s}</div>
                    </div>
                `).join('')}
            </div>
            <div>
                <div class="section-title">Areas for Improvement</div>
                ${result.insights.weaknesses.map(w => `
                    <div class="insight-card weakness-card">
                        <div class="weakness-icon">!</div>
                        <div class="weakness-text">${w}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section-title">Full Transcript</div>
        <div class="transcript-box">
            "${result.transcript}"
        </div>

        <div class="footer">
            &copy; ${new Date().getFullYear()} SpeakAI Coaching. All rights reserved.
        </div>
    </div>
</body>
</html>
    `.trim();

    const container = document.createElement('div');
    container.innerHTML = reportHtml;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    document.body.appendChild(container);

    const html2pdf = (await import('html2pdf.js')).default;
    const contentEl = (container.querySelector('.card') || container) as HTMLElement;

    html2pdf()
      .set({
        margin: 0,
        filename: `speakai-report-${result.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(contentEl)
      .save()
      .then(() => {
        document.body.removeChild(container);
      });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'transcript', label: 'Transcript', icon: MessageSquare },
    { id: 'emotions', label: 'Emotions', icon: Smile },
    { id: 'patterns', label: 'Patterns', icon: Zap },
    { id: 'recommendations', label: 'Coaching', icon: Sparkles },
  ];

  const COLORS = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Analysis Results</h2>
            <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
              {result.id}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Analyzed on {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-3">
          {audioUrl && (
            <button
              onClick={handleDownload}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <FileAudio className="w-4 h-4" />
              Download Audio
            </button>
          )}
          <button
            onClick={handleExportReport}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-10">
        <div className="bg-indigo-600 rounded-3xl p-8 text-white flex flex-col items-center justify-center text-center shadow-xl shadow-indigo-600/20">
          <div className="relative w-32 h-32 mb-6">
            <svg className="w-full h-full -rotate-90">
              <circle cx="64" cy="64" r="58" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle
                cx="64" cy="64" r="58" fill="none" stroke="white" strokeWidth="8"
                strokeDasharray={2 * Math.PI * 58}
                strokeDashoffset={2 * Math.PI * 58 * (1 - result.overallScore / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-black">
              {result.overallScore}
            </div>
          </div>
          <h4 className="text-lg font-bold mb-2">Overall Quality</h4>
          <p className="text-indigo-100 text-sm">Your speech was highly engaging and clear.</p>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Speaking Rate', value: `${result.metrics.wpm} WPM`, sub: 'Optimal: 130-150', icon: TrendingUp, color: 'text-blue-500' },
            { label: 'Dominant Emotion', value: result.metrics.dominantEmotion, sub: '92% Confidence', icon: Smile, color: 'text-emerald-500' },
            { label: 'Vocal Variety', value: `${result.metrics.vocalVariety}%`, sub: 'High Engagement', icon: Zap, color: 'text-amber-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <div className={cn("p-2 rounded-xl bg-slate-50 dark:bg-slate-800 w-fit mb-4", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-8 py-5 text-sm font-bold transition-all relative",
                activeTab === tab.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400" />
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                {result.summary && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-500" />
                      Executive Summary
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      {result.summary}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Key Strengths</h4>
                    <div className="space-y-4">
                      {result.insights.strengths.map((s, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-400">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Areas for Improvement</h4>
                    <div className="space-y-4">
                      {result.insights.weaknesses.map((w, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                          <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-400">{w}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'transcript' && (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-3xl mx-auto"
              >
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 leading-relaxed text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">
                  {result.transcript}
                </div>
              </motion.div>
            )}

            {activeTab === 'emotions' && (
              <motion.div
                key="emotions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
              >
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={result.metrics.emotionBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="percentage"
                        nameKey="emotion"
                      >
                        {result.metrics.emotionBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                          borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                          color: darkMode ? '#f8fafc' : '#1e293b'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {result.metrics.emotionBreakdown.map((e, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{e.emotion}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{e.percentage}%</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'patterns' && (
              <motion.div
                key="patterns"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Vocal Pitch Analysis
                  </h4>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.timelineData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#1e293b' : '#e2e8f0'} />
                        <XAxis
                          dataKey="time"
                          stroke={darkMode ? '#64748b' : '#94a3b8'}
                          fontSize={12}
                          tickFormatter={(val) => `${val}s`}
                        />
                        <YAxis
                          stroke={darkMode ? '#64748b' : '#94a3b8'}
                          fontSize={12}
                          label={{ value: 'Pitch (Hz)', angle: -90, position: 'insideLeft', style: { fill: darkMode ? '#64748b' : '#94a3b8', fontSize: 12 } }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                            borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                            color: darkMode ? '#f8fafc' : '#1e293b',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                          }}
                          labelFormatter={(val) => `Time: ${val}s`}
                        />
                        <Line
                          type="monotone"
                          dataKey="pitch"
                          stroke="#4f46e5"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                          animationDuration={1500}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 italic">
                    Pitch variation indicates vocal expressiveness and confidence. A steady but dynamic pitch range is generally more engaging for listeners.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'recommendations' && (
              <motion.div
                key="recommendations"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {result.insights.recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-6 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors group">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                      rec.impact === 'high' ? "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400" : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400"
                    )}>
                      <Zap className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white">{rec.title}</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                          rec.impact === 'high' ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" : "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                        )}>
                          {rec.impact} Impact
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [state, setState] = useState<AppState>('landing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('English');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [script, setScript] = useState('');
  const [targetWpm, setTargetWpm] = useState(150);
  const [audioQuality, setAudioQuality] = useState<'Good' | 'Noisy' | 'Quiet'>('Quiet');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setIsDemoMode(false);
        const userRef = doc(db, 'users', u.uid);
        getDoc(userRef).then((snap) => {
          if (!snap.exists()) {
            setDoc(userRef, {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
              role: 'user',
              hasCompletedOnboarding: false
            }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`));
            setState('onboarding');
          } else {
            const userData = snap.data();
            if (!userData.hasCompletedOnboarding) {
              setState('onboarding');
            } else if (state === 'landing') {
              setState('dashboard');
            }
          }
        }).catch(err => handleFirestoreError(err, OperationType.GET, `users/${u.uid}`));
      }
    });
    return () => unsubscribe();
  }, [state]);

  useEffect(() => {
    if (!user) {
      setAnalyses([]);
      setLoadingHistory(false);
      return;
    }

    const q = query(
      collection(db, 'analyses'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AnalysisResult));
      setAnalyses(data);
      setLoadingHistory(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'analyses');
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = () => {
    logout();
    setIsDemoMode(false);
    setState('landing');
  };

  const handleOnboardingComplete = async () => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userRef, { hasCompletedOnboarding: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
    setState('dashboard');
  };

  const analyzeQuality = () => {
    if (!analyser.current) return;
    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;

    if (average < 5) {
      setAudioQuality('Quiet');
    } else if (average > 60) {
      setAudioQuality('Noisy');
    } else {
      setAudioQuality('Good');
    }

    animationFrame.current = requestAnimationFrame(analyzeQuality);
  };

  const checkDemoLimit = () => {
    if (isDemoMode) {
      const attempts = parseInt(localStorage.getItem('speakai_demo_attempts') || '0');
      if (attempts >= 2) {
        setError("Demo limit reached (2/2). Please sign in to continue analyzing your voice!");
        return false;
      }
    }
    return true;
  };

  const incrementDemoAttempts = () => {
    if (isDemoMode) {
      const attempts = parseInt(localStorage.getItem('speakai_demo_attempts') || '0');
      localStorage.setItem('speakai_demo_attempts', (attempts + 1).toString());
    }
  };

  const startRecording = async (initialScript?: string, initialWpm?: number) => {
    if (!checkDemoLimit()) return;
    if (initialScript !== undefined) setScript(initialScript);
    if (initialWpm !== undefined) setTargetWpm(initialWpm);

    setRecordedAudioUrl(null);
    setIsPaused(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup Audio Analysis
      audioContext.current = new AudioContext();
      const source = audioContext.current.createMediaStreamSource(stream);
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 256;
      source.connect(analyser.current);
      analyzeQuality();

      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setState('processing');
          try {
            const result = await analyzeAudio(base64Audio, 'audio/webm');

            // Save to Firestore if logged in
            if (auth.currentUser) {
              const analysisData = {
                ...result,
                userId: auth.currentUser.uid,
                timestamp: new Date().toISOString()
              };
              try {
                await setDoc(doc(db, 'analyses', result.id), analysisData);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `analyses/${result.id}`);
              }
              setAnalysisResult(analysisData);
            } else {
              incrementDemoAttempts();
              setAnalysisResult(result);
            }

            setState('results');
          } catch (err: any) {
            console.error("Analysis failed", err);
            setError(err.message || "Analysis failed. Please check your connection and try again.");
            setState('dashboard');
          }
        };
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setState('recording');
    } catch (err) {
      console.error("Microphone access denied", err);
      setError("Could not access microphone. Please check permissions.");
    }
  };

  const togglePause = () => {
    if (!mediaRecorder.current) return;
    if (isPaused) {
      mediaRecorder.current.resume();
      setIsPaused(false);
    } else {
      mediaRecorder.current.pause();
      setIsPaused(true);
    }
  };

  const resetRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setIsPaused(false);
    setState('recording_setup');
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());

      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      if (audioContext.current) audioContext.current.close();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!checkDemoLimit()) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setRecordedAudioUrl(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      setState('processing');
      try {
        const result = await analyzeAudio(base64Audio, file.type);

        if (auth.currentUser) {
          const analysisData = {
            ...result,
            userId: auth.currentUser.uid,
            timestamp: new Date().toISOString()
          };
          try {
            await setDoc(doc(db, 'analyses', result.id), analysisData);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `analyses/${result.id}`);
          }
          setAnalysisResult(analysisData);
        } else {
          setAnalysisResult(result);
        }

        setState('results');
      } catch (err: any) {
        console.error("Analysis failed", err);
        setError(err.message || "Analysis failed. Please check your connection and try again.");
        setState('dashboard');
      }
    };
  };

  if (state === 'landing') {
    return (
      <>
        <LandingPage
          onStart={() => setIsLoginModalOpen(true)}
          onDemo={() => {
            setIsDemoMode(true);
            setState('dashboard');
          }}
        />
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onGoogleLogin={loginWithGoogle}
        />
      </>
    );
  }

  return (
    <div className={cn(
      "flex h-screen font-sans overflow-hidden transition-colors duration-300",
      darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    )}>
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onGoogleLogin={loginWithGoogle}
      />
      <Sidebar
        active={state}
        onChange={setState}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        user={user}
        onLogout={handleLogout}
        onSignInClick={() => setIsLoginModalOpen(true)}
      />

      <main className="flex-1 overflow-y-auto relative bg-transparent">
        <input
          type="file"
          id="audio-upload"
          className="hidden"
          accept="audio/*"
          onChange={handleFileUpload}
        />
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
            >
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-2xl shadow-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          type="file"
          id="audio-upload"
          className="hidden"
          accept="audio/*"
          onChange={handleFileUpload}
        />
        <AnimatePresence mode="wait">
          {state === 'onboarding' && (
            <OnboardingFlow onComplete={handleOnboardingComplete} />
          )}

          {state === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard
                user={user}
                analyses={analyses}
                isDemoMode={isDemoMode}
                onAction={(a) => {
                  if (a === 'record') setState('recording_setup');
                  if (a === 'upload') document.getElementById('audio-upload')?.click();
                  if (a === 'history') setState('history');
                }}
                onSignInClick={() => setIsLoginModalOpen(true)}
              />
            </motion.div>
          )}

          {state === 'history' && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              {isDemoMode ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-[32px] flex items-center justify-center mb-6">
                    <Lock className="w-10 h-10 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">History is Locked</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                    Sign in to save your analyses and track your progress over time.
                    Demo mode only allows real-time analysis.
                  </p>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Sign In Now
                  </button>
                </div>
              ) : (
                <HistoryView
                  analyses={analyses}
                  loading={loadingHistory}
                  onSelect={(res) => {
                    setAnalysisResult(res);
                    setState('results');
                  }}
                />
              )}
            </motion.div>
          )}

          {state === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SettingsView
                onLogout={handleLogout}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                language={language}
                setLanguage={setLanguage}
                onSignInClick={() => setIsLoginModalOpen(true)}
                isDemoMode={isDemoMode}
              />
            </motion.div>
          )}

          {state === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              {isDemoMode ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-[32px] flex items-center justify-center mb-6">
                    <User className="w-10 h-10 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Profile Unavailable</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                    Create an account to personalize your profile, earn achievements,
                    and manage your subscription.
                  </p>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Sign In Now
                  </button>
                </div>
              ) : (
                <ProfileView
                  user={user!}
                  analyses={analyses}
                  onLogout={handleLogout}
                  setError={setError}
                />
              )}
            </motion.div>
          )}

          {state === 'recording_setup' && (
            <motion.div key="recording_setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RecordingSetup
                onStart={(s, sp) => startRecording(s, sp)}
                onCancel={() => setState('dashboard')}
                isDemoMode={isDemoMode}
              />
            </motion.div>
          )}

          {state === 'recording' && (
            <motion.div key="recording" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <RecordingScreen
                script={script}
                wpm={targetWpm}
                audioQuality={audioQuality}
                isRecording={isRecording}
                isPaused={isPaused}
                onTogglePause={togglePause}
                onReset={resetRecording}
                onAnalyze={stopRecording}
                onStop={stopRecording}
              />
            </motion.div>
          )}

          {state === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ProcessingScreen audioUrl={recordedAudioUrl} />
            </motion.div>
          )}

          {state === 'results' && analysisResult && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResultsDashboard result={analysisResult} audioUrl={recordedAudioUrl} darkMode={darkMode} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
