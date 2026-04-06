import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from '../firebase';
import { AppState, AnalysisResult } from '../types';
import { analyzeAudio, generateScript } from '../services/gemini';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import ConfirmModal from './ConfirmModal';
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

export default HistoryView;
