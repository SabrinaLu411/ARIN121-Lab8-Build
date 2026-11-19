import React, { useState, useId } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  FileText,
  Lightbulb,
  Award,
  AlertCircle,
  Check,
  RefreshCw,
  Copy,
  Layers,
} from 'lucide-react';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

const SAMPLE_NOTES: { label: string; text: string }[] = [
  {
    label: 'Photosynthesis (Biology)',
    text: `Photosynthesis is the biological process used by plants, algae, and cyanobacteria to convert light energy into chemical energy. In plants, photosynthesis primarily takes place inside specialized organelles called chloroplasts, which contain the green pigment chlorophyll. The overall chemical equation is 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ (glucose) + 6O₂ (oxygen gas).

The process occurs in two main stages:
1. The Light-Dependent Reactions: Occur within the thylakoid membranes of chloroplasts. Chlorophyll absorbs sunlight and splits water molecules (photolysis), releasing oxygen as a byproduct and generating high-energy carriers ATP and NADPH.
2. The Calvin Cycle (Light-Independent Reactions): Takes place in the stroma of chloroplasts. It uses ATP and NADPH along with the enzyme RuBisCO to fix carbon dioxide into glucose and other carbohydrates.

Photosynthesis is vital for aerobic life on Earth as it produces virtually all atmospheric oxygen and forms the primary energy base of global ecosystems.`,
  },
  {
    label: 'Apollo 11 (History)',
    text: `Apollo 11 was the American spaceflight that first landed humans on the Moon on July 20, 1969. Commander Neil Armstrong and Lunar Module Pilot Buzz Aldrin landed the Apollo Lunar Module Eagle at Tranquility Base, while Command Module Pilot Michael Collins orbited above in Columbia.

Armstrong became the first human to step onto the lunar surface six hours and 39 minutes after landing, uttering the famous words: "That's one small step for man, one giant leap for mankind." Aldrin joined him 19 minutes later. They spent about two and a quarter hours outside the spacecraft, collecting 47.5 pounds (21.5 kg) of lunar material to bring back to Earth. The mission effectively fulfilled President John F. Kennedy's 1961 national goal of reaching the Moon before the decade was out.`,
  },
  {
    label: 'How the Web Works (Computer Science)',
    text: `The World Wide Web relies on client-server architecture. When a user enters a URL into a web browser, the client first queries a Domain Name System (DNS) server to translate the human-readable domain name (like example.com) into a machine-readable IP address.

Once the IP address is found, the browser establishes a Transmission Control Protocol (TCP) handshake and Transport Layer Security (TLS) connection with the web server. The client then sends an HTTP/HTTPS GET request for the requested webpage. The server processes the request and responds with an HTTP status code (such as 200 OK) along with HTML, CSS, JavaScript, and media assets. The browser's rendering engine parses the HTML into the Document Object Model (DOM), styles it with the CSSOM, and executes JavaScript to render an interactive web interface.`,
  },
];

const INITIAL_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q-1',
    question: 'Where do the light-dependent reactions of photosynthesis take place within a plant cell?',
    options: [
      'Inside the thylakoid membranes of chloroplasts',
      'Within the mitochondrial matrix',
      'In the outer cell wall and vacuole',
      'Exclusively in the stroma fluid without membranes',
    ],
    correctAnswerIndex: 0,
    explanation:
      'The light-dependent reactions take place within the thylakoid membranes of chloroplasts, where chlorophyll captures sunlight and photolysis splits water to release oxygen and create ATP and NADPH.',
  },
  {
    id: 'q-2',
    question: 'What are the two primary chemical products produced by the overall photosynthesis reaction?',
    options: [
      'Carbon dioxide (CO₂) and water (H₂O)',
      'Glucose (C₆H₁₂O₆) and oxygen gas (O₂)',
      'Nitrogen gas and lactic acid',
      'Methane and solar photons',
    ],
    correctAnswerIndex: 1,
    explanation:
      'The overall chemical equation demonstrates that carbon dioxide and water, energized by light, are converted into glucose (sugar for cellular energy) and oxygen gas released into the atmosphere.',
  },
  {
    id: 'q-3',
    question: 'What is the function of the enzyme RuBisCO during the Calvin cycle?',
    options: [
      'It breaks down cell walls to release starch into the soil',
      'It produces green light to illuminate plant cells',
      'It catalyzes the fixation of carbon dioxide into organic carbohydrates in the stroma',
      'It transports water up from the roots to the leaves',
    ],
    correctAnswerIndex: 2,
    explanation:
      'RuBisCO operates within the stroma of chloroplasts to fix atmospheric carbon dioxide into 3-carbon compounds, which are converted into glucose using ATP and NADPH.',
  },
];

export default function App() {
  const [notes, setNotes] = useState<string>(SAMPLE_NOTES[0].text);
  const [questions, setQuestions] = useState<QuizQuestion[]>(INITIAL_QUESTIONS);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);
  const [copiedState, setCopiedState] = useState<boolean>(false);

  const notesTextareaId = useId();

  // Character and word count
  const charCount = notes.length;
  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  // Handle selecting an answer
  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted) return; // Locked once submitted until reset
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
    setValidationAlert(null);
  };

  // Generate Quiz from current notes
  const handleGenerateQuiz = async () => {
    if (!notes.trim()) {
      setErrorMessage('Please paste or type study notes first.');
      return;
    }
    if (notes.trim().length < 30) {
      setErrorMessage('Please enter slightly longer study notes (at least 30 characters) to create quality questions.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setValidationAlert(null);

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate quiz questions.');
      }

      const data = await response.json();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setSelectedAnswers({});
        setIsSubmitted(false);
      } else {
        throw new Error('Received unexpected format from quiz generator.');
      }
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      setErrorMessage(err.message || 'An error occurred while generating the quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit answers & compute results
  const handleSubmitAnswers = () => {
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;

    if (answeredCount < totalQuestions) {
      setValidationAlert(
        `You have answered ${answeredCount} of ${totalQuestions} questions. Please answer all questions before submitting!`
      );
      return;
    }

    setValidationAlert(null);
    setIsSubmitted(true);

    // Scroll results into view smoothly
    setTimeout(() => {
      const resultsElement = document.getElementById('results-section');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Reset current answers to retake the same quiz
  const handleRetakeQuiz = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setValidationAlert(null);
    const quizSection = document.getElementById('quiz-questions-section');
    if (quizSection) {
      quizSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Load a preset sample note
  const handleLoadSample = (sampleText: string) => {
    setNotes(sampleText);
    setErrorMessage(null);
  };

  // Copy notes to clipboard
  const handleCopyNotes = () => {
    if (!notes) return;
    navigator.clipboard.writeText(notes);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  // Clear notes
  const handleClearNotes = () => {
    setNotes('');
    setErrorMessage(null);
  };

  // Calculate score
  const correctCount = questions.reduce((acc, q, idx) => {
    return selectedAnswers[idx] === q.correctAnswerIndex ? acc + 1 : acc;
  }, 0);
  const scorePercent = Math.round((correctCount / (questions.length || 1)) * 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navigation / App Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm ring-4 ring-indigo-50">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Quiz Generator</h1>
              <p className="text-xs text-slate-500 font-medium">Turn study notes into interactive multiple-choice quizzes</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              3 Questions per Quiz
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Intro Banner */}
        <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-indigo-200 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Smart Study Assistant</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
              Transform Notes into Knowledge
            </h2>
            <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
              Paste your study notes below and generate a tailored 3-question quiz with instant scoring and detailed explanations.
            </p>
          </div>
          {/* Subtle decorative background circles */}
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
          <div className="absolute right-20 bottom-0 -mb-10 w-48 h-48 rounded-full bg-indigo-400/15 blur-xl pointer-events-none" />
        </section>

        {/* SETUP VIEW: Study Notes Box & Generate Quiz Button */}
        <section aria-labelledby="notes-section-title" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 id="notes-section-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Study Notes
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Paste your lecture notes, textbook excerpts, or study summaries below.
              </p>
            </div>

            {/* Quick sample buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
              <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Quick Presets:
              </span>
              {SAMPLE_NOTES.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => handleLoadSample(sample.text)}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors"
                  title={`Load ${sample.label}`}
                >
                  {sample.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              id={notesTextareaId}
              rows={8}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Paste your study notes here (e.g. key concepts, definitions, processes, dates, formulas)..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-4 text-slate-800 text-sm leading-relaxed placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all resize-y outline-hidden font-normal"
            />

            {/* Floating actions in textarea footer */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 px-1">
              <div className="flex items-center gap-3">
                <span>
                  <strong>{wordCount}</strong> {wordCount === 1 ? 'word' : 'words'}
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  <strong>{charCount}</strong> characters
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyNotes}
                  disabled={!notes}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-40"
                  title="Copy notes"
                >
                  {copiedState ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedState ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearNotes}
                  disabled={!notes}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                  title="Clear notes"
                >
                  <Trash2Icon className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>

          {/* Error Banner if any */}
          {errorMessage && (
            <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to Generate Quiz</p>
                <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Generate Quiz Action Button */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Generates 3 multiple-choice questions with 4 options and detailed explanations.
            </p>

            <button
              type="button"
              onClick={handleGenerateQuiz}
              disabled={isLoading || !notes.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Quiz...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>Generate Quiz</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* QUIZ QUESTIONS SECTION */}
        <section id="quiz-questions-section" aria-labelledby="quiz-section-title" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h2 id="quiz-section-title" className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>Quiz Questions</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                  3 Questions
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select your answer for each question, then click Submit Answers below.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span>
                Answered: <strong>{Object.keys(selectedAnswers).length}</strong> of {questions.length}
              </span>
              {isSubmitted && (
                <button
                  type="button"
                  onClick={handleRetakeQuiz}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
              )}
            </div>
          </div>

          {/* Validation Alert */}
          {validationAlert && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="font-medium text-xs sm:text-sm">{validationAlert}</p>
            </div>
          )}

          {/* Question Cards */}
          <div className="space-y-6">
            {questions.map((q, qIndex) => {
              const isAnswered = selectedAnswers[qIndex] !== undefined;
              const userAnswer = selectedAnswers[qIndex];
              const isCorrect = isSubmitted && userAnswer === q.correctAnswerIndex;

              return (
                <div
                  key={q.id || `question-${qIndex}`}
                  className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden ${
                    isSubmitted
                      ? isCorrect
                        ? 'border-emerald-300 ring-2 ring-emerald-50'
                        : 'border-rose-300 ring-2 ring-rose-50'
                      : isAnswered
                      ? 'border-indigo-300 shadow-sm'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Question Header */}
                  <div className="p-5 sm:p-6 pb-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase bg-slate-100 text-slate-700">
                        Question {qIndex + 1} of {questions.length}
                      </span>

                      {/* Status indicator after submission */}
                      {isSubmitted && (
                        <div>
                          {isCorrect ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="w-4 h-4 text-rose-600" />
                              Incorrect
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
                      {q.question}
                    </h3>
                  </div>

                  {/* Options List */}
                  <div className="px-5 sm:px-6 pb-5 space-y-2.5">
                    {q.options.map((optionText, optIndex) => {
                      const letter = String.fromCharCode(65 + optIndex);
                      const isOptionSelected = userAnswer === optIndex;
                      const isOptionCorrect = q.correctAnswerIndex === optIndex;

                      // Style computation based on submission status
                      let optionStyle =
                        'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300 text-slate-800';
                      let badgeStyle = 'bg-slate-200 text-slate-700';

                      if (isSubmitted) {
                        if (isOptionCorrect) {
                          // Correct answer highlighted
                          optionStyle =
                            'border-emerald-400 bg-emerald-50 text-emerald-950 font-medium ring-1 ring-emerald-300';
                          badgeStyle = 'bg-emerald-600 text-white font-bold';
                        } else if (isOptionSelected && !isOptionCorrect) {
                          // Wrong selected answer
                          optionStyle =
                            'border-rose-400 bg-rose-50 text-rose-950 ring-1 ring-rose-300';
                          badgeStyle = 'bg-rose-600 text-white font-bold';
                        } else {
                          // Unselected non-correct
                          optionStyle = 'border-slate-200 bg-slate-50/40 text-slate-400 opacity-60';
                          badgeStyle = 'bg-slate-200 text-slate-400';
                        }
                      } else if (isOptionSelected) {
                        optionStyle =
                          'border-indigo-600 bg-indigo-50/90 text-indigo-950 font-medium ring-2 ring-indigo-200';
                        badgeStyle = 'bg-indigo-600 text-white font-bold';
                      }

                      return (
                        <button
                          key={optIndex}
                          type="button"
                          onClick={() => handleSelectOption(qIndex, optIndex)}
                          disabled={isSubmitted}
                          className={`w-full text-left rounded-xl border p-3.5 sm:p-4 flex items-start gap-3 transition-all ${optionStyle} ${
                            isSubmitted ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          {/* Option letter badge */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 transition-colors ${badgeStyle}`}
                          >
                            {letter}
                          </div>

                          {/* Option text */}
                          <div className="flex-1 text-sm leading-relaxed pt-0.5">
                            {optionText}
                          </div>

                          {/* Icon indicator */}
                          <div className="shrink-0 mt-0.5">
                            {isSubmitted ? (
                              isOptionCorrect ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : isOptionSelected ? (
                                <XCircle className="w-5 h-5 text-rose-600" />
                              ) : null
                            ) : (
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                  isOptionSelected
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isOptionSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Area (Shown after submission) */}
                  {isSubmitted && (
                    <div className="mx-5 sm:mx-6 mb-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-start gap-2.5">
                        <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                            Explanation
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {q.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* SUBMIT ANSWERS ACTION BUTTON */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900 text-sm">
                Ready to review your performance?
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isSubmitted
                  ? 'Your answers have been evaluated. Check your score and explanations below.'
                  : `${Object.keys(selectedAnswers).length} of ${questions.length} questions answered.`}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isSubmitted ? (
                <button
                  type="button"
                  onClick={handleRetakeQuiz}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake Quiz</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitAnswers}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Answers</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* RESULTS AREA: Score and Explanations after submission */}
        {isSubmitted && (
          <section id="results-section" aria-labelledby="results-title" className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                {/* Score Dial / Badge */}
                <div className="relative shrink-0 flex flex-col items-center justify-center w-36 h-36 rounded-full bg-slate-50 border-4 border-indigo-100 shadow-inner">
                  <span className="text-3xl font-black text-slate-900">
                    {correctCount}/{questions.length}
                  </span>
                  <span className="text-xs font-bold text-indigo-600 tracking-wide mt-0.5">
                    {scorePercent}% SCORE
                  </span>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Award className="w-4 h-4" />
                  </div>
                </div>

                {/* Score Message & Feedback */}
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2">
                    <Award className="w-3.5 h-3.5" />
                    <span>Quiz Complete</span>
                  </div>
                  <h3 id="results-title" className="text-2xl font-bold text-slate-900">
                    {scorePercent === 100
                      ? 'Perfect Score! Outstanding Work!'
                      : scorePercent >= 66
                      ? 'Great Job! Solid Understanding.'
                      : 'Keep Practicing! Review the Notes.'}
                  </h3>
                  <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                    {scorePercent === 100
                      ? 'You correctly answered all 3 questions! Your study notes are well-understood.'
                      : scorePercent >= 66
                      ? 'You got 2 out of 3 questions right. Review the explanations above for the questions you missed.'
                      : 'You scored 1 or fewer questions correctly. Read the detailed explanations and study notes to reinforce key concepts.'}
                  </p>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full mt-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        scorePercent >= 66 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons in Results */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center md:justify-end gap-3">
                <button
                  type="button"
                  onClick={handleRetakeQuiz}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <span>Retake This Quiz</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const notesSection = document.getElementById('notes-section-title');
                    if (notesSection) {
                      notesSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>Generate New Quiz from Notes</span>
                </button>
              </div>
            </div>

            {/* Quick Answer Key Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h4 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Question Breakdown & Summary</span>
              </h4>
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const userAnswer = selectedAnswers[idx];
                  const isCorrect = userAnswer === q.correctAnswerIndex;
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Q{idx + 1}:</span>
                          <span className="text-slate-800 line-clamp-1">{q.question}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          <strong>Correct:</strong> {String.fromCharCode(65 + q.correctAnswerIndex)} -{' '}
                          {q.options[q.correctAnswerIndex]}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 self-start sm:self-center">
                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-md">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Incorrect
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Quiz Generator • Intelligent Study & Review</p>
          <p className="text-slate-400">Created for effective learning and comprehension</p>
        </div>
      </footer>
    </div>
  );
}

function Trash2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}
