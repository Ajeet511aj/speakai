/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AnalysisResult {
  id: string;
  title?: string;
  timestamp: string;
  duration: number;
  transcript: string;
  summary?: string;
  overallScore: number;
  metrics: {
    wpm: number;
    fillerWords: { word: string; count: number }[];
    totalFillerCount: number;
    dominantEmotion: string;
    emotionBreakdown: { emotion: string; percentage: number }[];
    vocalVariety: number; // 0-100
  };
  insights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: {
      title: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
    }[];
  };
  timelineData: {
    time: number;
    wpm: number;
    pitch: number;
    volume: number;
    emotion: string;
  }[];
}

export type AppState = 'landing' | 'onboarding' | 'dashboard' | 'recording_setup' | 'recording' | 'processing' | 'results' | 'history' | 'settings' | 'profile';
