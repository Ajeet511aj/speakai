import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from '../firebase';
import { AppState, AnalysisResult } from '../types';
import { analyzeAudio, generateScript } from '../services/gemini';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

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

export default RecordingScreen;
