export interface QuizQuestion {
  id: string;
  stem: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface Quiz {
  id: string;
  topic: string;
  wikipedia_context: string | null;
  questions: QuizQuestion[];
  created_at: string;
}

export interface Attempt {
  id: string;
  quiz_id: string;
  answers: Record<string, string>;
  score: number;
  created_at: string;
  quizzes?: Quiz;
}
