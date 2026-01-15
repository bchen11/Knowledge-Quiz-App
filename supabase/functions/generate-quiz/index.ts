import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zod schema to validate LLM response
const QuestionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  options: z.object({
    A: z.string(),
    B: z.string(),
    C: z.string(),
    D: z.string(),
  }),
  correct: z.enum(["A", "B", "C", "D"]),
  explanation: z.string(),
});

const QuizResponseSchema = z.object({
  topic: z.string(),
  questions: z.array(QuestionSchema).length(5),
});

// Blocked topics for safety
const BLOCKED_PATTERNS = [
  /\b(porn|sex|nude|nsfw|xxx)\b/i,
  /\b(kill|murder|suicide|self.?harm)\b/i,
  /\b(hitler|nazi|holocaust.?denial)\b/i,
  /\b(racist|racial.?slur|hate.?speech)\b/i,
];

function isTopicBlocked(topic: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(topic));
}

async function fetchWikipediaSummary(topic: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "AI-Knowledge-Quiz/1.0" },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.extract || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();

    // Validate topic
    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Topic is required and cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanTopic = topic.trim();

    if (cleanTopic.length > 100) {
      return new Response(
        JSON.stringify({ error: "Topic must be 100 characters or less" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isTopicBlocked(cleanTopic)) {
      return new Response(
        JSON.stringify({ error: "This topic is not allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Wikipedia context
    const wikiSummary = await fetchWikipediaSummary(cleanTopic);
    const wikiContext = wikiSummary
      ? `\n\nWikipedia context for reference:\n${wikiSummary}`
      : "";


    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `You are a quiz generator. Generate exactly 5 multiple-choice questions about the given topic. Each question must have 4 options (A, B, C, D) with exactly one correct answer. Provide clear explanations for each answer.

IMPORTANT: 
- Return ONLY valid JSON, no markdown or additional text
- Do not include any inappropriate, sexual, violent, or hateful content
- Questions should be educational and factually accurate
- Each question ID should be unique (q1, q2, q3, q4, q5)`;

    const userPrompt = `Generate a quiz about: ${cleanTopic}${wikiContext}

Return ONLY this exact JSON structure:
{
  "topic": "${cleanTopic}",
  "questions": [
    {
      "id": "q1",
      "stem": "Question text here?",
      "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
      "correct": "A",
      "explanation": "Explanation of why this answer is correct and why others are wrong."
    }
  ]
}

Generate exactly 5 questions.`;

    const aiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error("Failed to generate quiz");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse and validate JSON response
    let parsedQuiz;
    try {
      // Remove any potential markdown code blocks
      const jsonStr = content.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      parsedQuiz = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid quiz format from AI");
    }

    // Validate with Zod
    const validatedQuiz = QuizResponseSchema.parse(parsedQuiz);

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: quiz, error: dbError } = await supabase
      .from("quizzes")
      .insert({
        topic: validatedQuiz.topic,
        wikipedia_context: wikiSummary,
        questions: validatedQuiz.questions,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save quiz");
    }

    return new Response(
      JSON.stringify({ quizId: quiz.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate quiz error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
