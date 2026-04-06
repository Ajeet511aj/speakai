import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from '../firebase';
import { AppState, AnalysisResult } from '../types';
import { analyzeAudio, generateScript } from '../services/gemini';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

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

export default ResultsDashboard;
