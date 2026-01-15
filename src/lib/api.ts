import { supabase } from "@/integrations/supabase/client";
import type { Quiz, Attempt, QuizQuestion } from "./types";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export async function generateQuiz(topic: string): Promise<string> {
  const response = await fetch(`${FUNCTIONS_URL}/generate-quiz`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ topic }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to generate quiz");
  }

  return data.quizId;
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  
  if (data) {
    return {
      ...data,
      questions: data.questions as unknown as QuizQuestion[],
    };
  }
  
  return null;
}

export async function submitQuiz(
  quizId: string,
  answers: Record<string, string>
): Promise<{ attemptId: string; score: number }> {
  const response = await fetch(`${FUNCTIONS_URL}/submit-quiz`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ quizId, answers }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to submit quiz");
  }

  return data;
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  const { data, error } = await supabase
    .from("attempts")
    .select(`
      *,
      quizzes (*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  
  if (data) {
    return {
      ...data,
      answers: data.answers as unknown as Record<string, string>,
      quizzes: data.quizzes ? {
        ...data.quizzes,
        questions: data.quizzes.questions as unknown as QuizQuestion[],
      } : undefined,
    };
  }
  
  return null;
}

export async function getHistory(): Promise<Attempt[]> {
  const { data, error } = await supabase
    .from("attempts")
    .select(`
      *,
      quizzes (*)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  
  return (data || []).map((item) => ({
    ...item,
    answers: item.answers as unknown as Record<string, string>,
    quizzes: item.quizzes ? {
      ...item.quizzes,
      questions: item.quizzes.questions as unknown as QuizQuestion[],
    } : undefined,
  }));
}
