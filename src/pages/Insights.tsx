import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const Insights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase.from("insights").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => { setInsights(data || []); setLoading(false); });
  }, [user]);

  const generateInsight = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-insights");
      if (error) throw error;
      
      if (data?.insight) {
        setInsights(prev => [data.insight, ...prev]);
        toast.success("New insights generated!");
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err: any) {
      if (err?.message?.includes("429")) {
        toast.error("Rate limited. Please try again in a moment.");
      } else if (err?.message?.includes("402")) {
        toast.error("AI credits exhausted. Please add funds in Settings > Workspace > Usage.");
      } else {
        toast.error("Failed to generate insights");
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2"><Brain className="h-5 w-5" />AI Insights</h2>
          <p className="text-sm text-muted-foreground">AI-powered analysis of your training</p>
        </div>
        <Button onClick={generateInsight} disabled={generating}>
          {generating ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Analyzing...</> : <><Sparkles className="mr-1 h-4 w-4" />Get Insights</>}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : insights.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No insights yet. Log some workouts, then click "Get Insights" for AI analysis.</p>
          </CardContent>
        </Card>
      ) : (
        insights.map((insight) => (
          <Card key={insight.id}>
            <CardHeader>
              <CardDescription>{format(parseISO(insight.created_at), "MMM d, yyyy 'at' h:mm a")}</CardDescription>
              <CardTitle className="text-base">Training Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-1">Summary</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{insight.summary}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Suggestions</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{insight.suggestions}</p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default Insights;
