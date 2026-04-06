import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from '../firebase';
import { AppState, AnalysisResult } from '../types';
import { analyzeAudio, generateScript } from '../services/gemini';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

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

export default Dashboard;
