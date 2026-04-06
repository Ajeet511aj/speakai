import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from '../firebase';
import { AppState, AnalysisResult } from '../types';
import { analyzeAudio, generateScript } from '../services/gemini';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

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

export default ProfileView;
