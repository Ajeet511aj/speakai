import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from '../firebase';
import { AppState, AnalysisResult } from '../types';
import { analyzeAudio, generateScript } from '../services/gemini';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

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

export default ProcessingScreen;
