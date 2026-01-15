import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getQuiz, submitQuiz } from "@/lib/api";
import type { Quiz as QuizType } from "@/lib/types";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Quiz = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizType | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    
    const fetchQuiz = async () => {
      try {
        const data = await getQuiz(id);
        if (!data) {
          toast.error("Quiz not found");
          navigate("/");
          return;
        }
        setQuiz(data);
      } catch (error) {
        toast.error("Failed to load quiz");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [id, navigate]);

  const handleSubmit = async () => {
    if (!quiz || !id) return;

    const unanswered = quiz.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitQuiz(id, answers);
      navigate(`/results/${result.attemptId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quiz) return null;

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground">
            {answeredCount}/5 answered
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{quiz.topic}</CardTitle>
            <CardDescription>Answer all 5 questions to complete the quiz</CardDescription>
          </CardHeader>
        </Card>

        {quiz.questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                {index + 1}. {question.stem}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[question.id] || ""}
                onValueChange={(value) =>
                  setAnswers((prev) => ({ ...prev, [question.id]: value }))
                }
              >
                {(["A", "B", "C", "D"] as const).map((option) => (
                  <div key={option} className="flex items-start space-x-3 py-2">
                    <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                    <Label
                      htmlFor={`${question.id}-${option}`}
                      className="font-normal cursor-pointer flex-1"
                    >
                      <span className="font-medium mr-2">{option}.</span>
                      {question.options[option]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || answeredCount < 5}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Quiz"
          )}
        </Button>
      </div>
    </div>
  );
};

export default Quiz;
