import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAttempt } from "@/lib/api";
import type { Attempt } from "@/lib/types";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Home, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const Results = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchAttempt = async () => {
      try {
        const data = await getAttempt(id);
        if (!data || !data.quizzes) {
          toast.error("Results not found");
          navigate("/");
          return;
        }
        setAttempt(data);
      } catch (error) {
        toast.error("Failed to load results");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchAttempt();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!attempt || !attempt.quizzes) return null;

  const quiz = attempt.quizzes;
  const percentage = (attempt.score / 5) * 100;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">
              {attempt.score}/5
            </CardTitle>
            <CardDescription className="text-lg">
              {percentage >= 80
                ? "Excellent! 🎉"
                : percentage >= 60
                ? "Good job! 👍"
                : percentage >= 40
                ? "Not bad! 📚"
                : "Keep learning! 💪"}
            </CardDescription>
            <div className="pt-2">
              <Badge variant="outline" className="text-sm">
                {quiz.topic}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <h2 className="text-lg font-semibold pt-4">Review Answers</h2>

        {quiz.questions.map((question, index) => {
          const userAnswer = attempt.answers[question.id];
          const isCorrect = userAnswer === question.correct;

          return (
            <Card
              key={question.id}
              className={cn(
                "border-l-4",
                isCorrect ? "border-l-green-500" : "border-l-red-500"
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-base font-medium flex-1">
                    {index + 1}. {question.stem}
                  </CardTitle>
                  {isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {(["A", "B", "C", "D"] as const).map((option) => {
                    const isUserChoice = userAnswer === option;
                    const isCorrectAnswer = question.correct === option;

                    return (
                      <div
                        key={option}
                        className={cn(
                          "p-2 rounded text-sm",
                          isCorrectAnswer && "bg-green-100 dark:bg-green-900/30",
                          isUserChoice && !isCorrectAnswer && "bg-red-100 dark:bg-red-900/30"
                        )}
                      >
                        <span className="font-medium mr-2">{option}.</span>
                        {question.options[option]}
                        {isCorrectAnswer && (
                          <span className="ml-2 text-green-600 dark:text-green-400 text-xs">
                            ✓ Correct
                          </span>
                        )}
                        {isUserChoice && !isCorrectAnswer && (
                          <span className="ml-2 text-red-600 dark:text-red-400 text-xs">
                            ✗ Your answer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-muted rounded-md text-sm">
                  <span className="font-medium">Explanation:</span>{" "}
                  {question.explanation}
                </div>
              </CardContent>
            </Card>
          );
        })}

        <div className="flex gap-4 pt-4">
          <Link to="/" className="flex-1">
            <Button className="w-full">
              <Home className="mr-2 h-4 w-4" />
              New Quiz
            </Button>
          </Link>
          <Link to="/history" className="flex-1">
            <Button variant="outline" className="w-full">
              View History
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Results;
