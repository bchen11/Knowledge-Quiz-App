import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateQuiz } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, History, Brain } from "lucide-react";

const Index = () => {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    const trimmedTopic = topic.trim();
    
    if (!trimmedTopic) {
      toast.error("Please enter a topic");
      return;
    }

    if (trimmedTopic.length > 100) {
      toast.error("Topic must be 100 characters or less");
      return;
    }

    setLoading(true);
    try {
      const quizId = await generateQuiz(trimmedTopic);
      navigate(`/quiz/${quizId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">AI Knowledge Quiz</CardTitle>
          <CardDescription>
            Enter any topic and AI will generate 5 multiple-choice questions for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter a topic (e.g., Solar System, World War II)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleGenerate()}
              disabled={loading}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">
              {topic.length}/100
            </p>
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              "Generate Quiz"
            )}
          </Button>

          <div className="pt-4 border-t">
            <Link to="/history">
              <Button variant="outline" className="w-full">
                <History className="mr-2 h-4 w-4" />
                View History
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
