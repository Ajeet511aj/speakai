/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

export async function analyzeAudio(audioBase64: string, mimeType: string): Promise<AnalysisResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured. Please add it to your environment variables.");
  }
  const model = "gemini-2.5-flash"; // Using a stable GA model for audio analysis

  const prompt = `
    Analyze this voice recording for an enterprise speech coaching platform.
    Provide a detailed breakdown including:
    1. Full transcript.
    2. A concise summary of the transcript (max 3 sentences).
    3. Overall speech quality score (0-100).
    3. Metrics: Words Per Minute (WPM), filler words (um, uh, like, etc.), dominant emotion, and vocal variety.
    4. Insights: 3 strengths, 3 weaknesses, and 3 actionable recommendations.
    5. Timeline data: Sample metrics every few seconds for visualization.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.NUMBER },
          transcript: { type: Type.STRING },
          summary: { type: Type.STRING },
          metrics: {
            type: Type.OBJECT,
            properties: {
              wpm: { type: Type.NUMBER },
              totalFillerCount: { type: Type.NUMBER },
              dominantEmotion: { type: Type.STRING },
              vocalVariety: { type: Type.NUMBER },
              fillerWords: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    count: { type: Type.NUMBER },
                  },
                },
              },
              emotionBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    emotion: { type: Type.STRING },
                    percentage: { type: Type.NUMBER },
                  },
                },
              },
            },
          },
          insights: {
            type: Type.OBJECT,
            properties: {
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    impact: { type: Type.STRING, enum: ["high", "medium", "low"] },
                  },
                },
              },
            },
          },
          timelineData: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.NUMBER },
                wpm: { type: Type.NUMBER },
                pitch: { type: Type.NUMBER },
                volume: { type: Type.NUMBER },
                emotion: { type: Type.STRING },
              },
            },
          },
        },
        required: ["overallScore", "transcript", "metrics", "insights", "timelineData"],
      },
    },
  });

  const result = JSON.parse(response.text || "{}");
  
  return {
    ...result,
    id: Math.random().toString(36).substring(7),
    timestamp: new Date().toISOString(),
    duration: 0, // Should be calculated from audio if possible
  };
}

export async function generateScript(topic: string, language: string = "English"): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Generate a professional speech script for a coaching session on the topic: "${topic}" in ${language}. The script should be about 150-200 words long and formatted for easy reading.`,
  });

  return response.text || "Failed to generate script.";
}
