import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quizId, answers } = await req.json();

    if (!quizId || typeof quizId !== "string") {
      return new Response(
        JSON.stringify({ error: "Quiz ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!answers || typeof answers !== "object") {
      return new Response(
        JSON.stringify({ error: "Answers are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the quiz to calculate score
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("questions")
      .eq("id", quizId)
      .single();

    if (quizError || !quiz) {
      return new Response(
        JSON.stringify({ error: "Quiz not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate score
    const questions = quiz.questions as Array<{ id: string; correct: string }>;
    let score = 0;
    for (const question of questions) {
      if (answers[question.id] === question.correct) {
        score++;
      }
    }

    // Store attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .insert({
        quiz_id: quizId,
        answers,
        score,
      })
      .select("id")
      .single();

    if (attemptError) {
      console.error("Attempt error:", attemptError);
      throw new Error("Failed to save attempt");
    }

    return new Response(
      JSON.stringify({ attemptId: attempt.id, score }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Submit quiz error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
