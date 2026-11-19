import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

// Initialize Gemini client if API key is present
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback generator when API key is unavailable or fails
function generateFallbackQuiz(notes: string): QuizQuestion[] {
  const sentences = notes
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 25);

  const fallbackQuestions: QuizQuestion[] = [];

  // Extract key phrases or terms
  const words = notes
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9-]/g, ''))
    .filter(w => w.length > 4 && !['about', 'after', 'which', 'their', 'there', 'where', 'these', 'those', 'could', 'would'].includes(w.toLowerCase()));

  const uniqueWords = Array.from(new Set(words));

  if (sentences.length >= 3) {
    const templates = [
      {
        q: (s: string) => `According to the study notes, which of the following statements is accurate?`,
        correctOpt: (s: string) => s,
        wrongOpts: [
          'This phenomenon occurs exclusively under reverse environmental conditions.',
          'The process has been completely discredited by modern scientific consensus.',
          'This relationship is purely coincidental and lacks empirical validation.',
        ],
        expl: (s: string) => `Directly referenced in your notes: "${s.slice(0, 100)}${s.length > 100 ? '...' : ''}"`,
      },
      {
        q: (s: string, kw: string) => `What role or significance is highlighted in the text regarding "${kw}"?`,
        correctOpt: (s: string) => `It is a foundational element in: "${s.slice(0, 85)}${s.length > 85 ? '...' : ''}"`,
        wrongOpts: [
          'It is cited as an irrelevant historical footnote.',
          'It operates without any interaction with neighboring components.',
          'It acts solely as an inhibiting factor that shuts down the cycle.',
        ],
        expl: (s: string) => `The study material details: "${s.slice(0, 100)}${s.length > 100 ? '...' : ''}"`,
      },
      {
        q: (s: string) => `Based on the provided notes, what conclusion can be drawn from the passage?`,
        correctOpt: (s: string) => `The principles detailed in: "${s.slice(0, 85)}${s.length > 85 ? '...' : ''}"`,
        wrongOpts: [
          'The material suggests abandoning this line of research completely.',
          'All underlying mechanisms operate without energy or input requirements.',
          'The observations apply only to theoretical simulations, not real systems.',
        ],
        expl: (s: string) => `As described in the notes: "${s.slice(0, 100)}${s.length > 100 ? '...' : ''}"`,
      },
    ];

    for (let i = 0; i < 3; i++) {
      const sentence = sentences[i % sentences.length];
      const template = templates[i];
      const kw = uniqueWords[i % (uniqueWords.length || 1)] || 'core concept';

      const correctOpt = template.correctOpt(sentence);
      const wrongOpts = template.wrongOpts;

      // Deterministic placement or variation
      const correctIndex = i % 4; // Q1 at 0 (A), Q2 at 1 (B), Q3 at 2 (C)
      const options = [...wrongOpts];
      options.splice(correctIndex, 0, correctOpt);

      fallbackQuestions.push({
        id: `q-${i + 1}`,
        question: template.q(sentence, kw),
        options: options.slice(0, 4),
        correctAnswerIndex: correctIndex,
        explanation: template.expl(sentence),
      });
    }
  } else {
    // Standard default 3 questions when notes are brief
    const summary = notes.slice(0, 70) || 'The fundamental concept outlined in the text';
    fallbackQuestions.push(
      {
        id: 'q-1',
        question: 'What is the primary topic or principle described in the provided notes?',
        options: [
          summary,
          'A conflicting theory disproven by recent research',
          'An unrelated computational benchmark',
          'A negligible anomaly with no real-world application'
        ],
        correctAnswerIndex: 0,
        explanation: `This directly captures the main focus stated in your notes: "${summary}"`
      },
      {
        id: 'q-2',
        question: 'How do the supporting details function in the context of these study notes?',
        options: [
          'They introduce contradictions to refute the original thesis',
          'They provide context, definitions, and key evidence to explain the subject',
          'They serve solely as decorative filler without informative value',
          'They advise disregarding experimental measurements'
        ],
        correctAnswerIndex: 1,
        explanation: 'Study notes are designed to provide factual clarity, contextual definitions, and core principles.'
      },
      {
        id: 'q-3',
        question: 'Which of the following is the most effective approach to mastering this material?',
        options: [
          'Skimming only the first sentence and ignoring relationships',
          'Memorizing isolated terms without comprehending their function',
          'Understanding key definitions, stages, and cause-and-effect relationships',
          'Assuming the concepts are static and non-interactive'
        ],
        correctAnswerIndex: 2,
        explanation: 'Deep comprehension comes from analyzing definitions, stages, and cause-and-effect relationships.'
      }
    );
  }

  return fallbackQuestions;
}

// API endpoint to generate a 3-question quiz from study notes
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { notes } = req.body;

    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return res.status(400).json({ error: 'Please enter or paste your study notes.' });
    }

    const trimmedNotes = notes.trim();

    if (!ai) {
      console.warn('GEMINI_API_KEY is not set. Generating quiz using intelligent fallback.');
      const fallback = generateFallbackQuiz(trimmedNotes);
      return res.json({ questions: fallback, source: 'fallback' });
    }

    const prompt = `You are an expert educator and quiz creator.
Create exactly THREE (3) high-quality multiple-choice questions based strictly on the following study notes.
Each question must have:
- Exactly 4 plausible answer options (index 0, 1, 2, 3)
- Exactly one correct answer
- The 0-based index of the correct answer (0, 1, 2, or 3)
- A clear, concise explanation why that option is correct citing facts from the notes.

Study Notes:
"""
${trimmedNotes}
"""`;

    let text: string | undefined;

    // Try primary model gemini-3.8-flash first, then gemini-3.1-flash-lite if 503/429
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: 'You generate accurate 3-question multiple choice quizzes from study notes. Never output markdown around the JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              description: 'A list of 3 multiple-choice quiz questions',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: 'Unique question ID like q-1, q-2, q-3' },
                  question: { type: Type.STRING, description: 'The question text' },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Four multiple-choice options',
                  },
                  correctAnswerIndex: {
                    type: Type.INTEGER,
                    description: '0-based index (0, 1, 2, or 3) of the correct answer in options array',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Detailed explanation of why the correct answer is right according to the study notes',
                  },
                },
                required: ['id', 'question', 'options', 'correctAnswerIndex', 'explanation'],
              },
            },
          },
        });

        text = response.text;
        if (text) {
          break; // Successfully got response
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed:`, err?.message || err);
      }
    }

    if (!text) {
      throw lastError || new Error('No response from Gemini models.');
    }

    const questions: QuizQuestion[] = JSON.parse(text);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid format returned by AI.');
    }

    // Ensure exactly 3 questions and properly formatted ids
    const formattedQuestions = questions.slice(0, 3).map((q, idx) => ({
      id: q.id || `q-${idx + 1}`,
      question: q.question,
      options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : q.options,
      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < (q.options?.length || 4)
        ? q.correctAnswerIndex
        : 0,
      explanation: q.explanation || 'Based on the provided notes.',
    }));

    return res.json({ questions: formattedQuestions, source: 'gemini' });
  } catch (error: any) {
    console.error('Error generating quiz with Gemini:', error);
    // Provide graceful fallback so user never gets stranded
    try {
      const fallback = generateFallbackQuiz(req.body?.notes || '');
      return res.json({
        questions: fallback,
        source: 'fallback',
        notice: 'Generated using local quiz synthesis.'
      });
    } catch {
      return res.status(500).json({ error: 'Failed to generate quiz. Please check your notes and try again.' });
    }
  }
});

async function start() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quiz Generator server running at http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
