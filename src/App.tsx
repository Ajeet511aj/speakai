/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from './lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from './firebase';
import { AppState, AnalysisResult } from './types';
import { analyzeAudio, generateScript } from './services/gemini';
import { OperationType, handleFirestoreError } from './lib/firestore-errors';

import ConfirmModal from './components/ConfirmModal';
import Sidebar from './components/Sidebar';
import HistoryView from './components/HistoryView';
import LoginModal from './components/LoginModal';
import LandingPage from './components/LandingPage';
import OnboardingFlow from './components/OnboardingFlow';
import SettingsView from './components/SettingsView';
import ProfileView from './components/ProfileView';
import Dashboard from './components/Dashboard';
import RecordingSetup from './components/RecordingSetup';
import RecordingScreen from './components/RecordingScreen';
import ProcessingScreen from './components/ProcessingScreen';
import ResultsDashboard from './components/ResultsDashboard';

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
    } catch (err: any) {
      console.error("Microphone access denied", err);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
         setError("Microphone API not supported. Please ensure you are using HTTPS or localhost.");
      } else {
         setError("Could not access microphone. Please check permissions.");
      }
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
