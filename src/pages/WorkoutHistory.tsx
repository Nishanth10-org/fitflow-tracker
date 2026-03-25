import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Trash2, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

const WorkoutHistory = () => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const loadWorkouts = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("workouts")
      .select("*, workout_exercises(*, exercises(name, category))")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (dateFrom) query = query.gte("date", new Date(dateFrom).toISOString());
    if (dateTo) query = query.lte("date", new Date(dateTo + "T23:59:59").toISOString());

    const { data } = await query;
    let filtered = data || [];

    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(w =>
        w.workout_exercises?.some((we: any) => we.exercises?.category === categoryFilter)
      );
    }

    setWorkouts(filtered);
    setLoading(false);
  };

  useEffect(() => { loadWorkouts(); }, [user, dateFrom, dateTo, categoryFilter]);

  const deleteWorkout = async (id: string) => {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Workout deleted");
    setWorkouts(workouts.filter(w => w.id !== id));
  };

  // Group by date
  const grouped: Record<string, any[]> = workouts.reduce((acc: Record<string, any[]>, w) => {
    const key = format(parseISO(w.date), "yyyy-MM-dd");
    (acc[key] = acc[key] || []).push(w);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            <span className="text-muted-foreground">to</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Constants.public.Enums.exercise_category.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Workout list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No workouts found</CardContent></Card>
      ) : (
        Object.entries(grouped).map(([date, dayWorkouts]) => (
          <div key={date}>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">{format(parseISO(date), "EEEE, MMMM d, yyyy")}</h3>
            {dayWorkouts.map((w: any) => (
              <Collapsible key={w.id}>
                <Card className="mb-2">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-sm">{format(parseISO(w.date), "h:mm a")}</CardTitle>
                        <span className="text-xs text-muted-foreground">{w.duration_minutes}min • {w.workout_exercises?.length || 0} exercises</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-2 pt-0">
                      {w.workout_exercises?.map((we: any) => (
                        <div key={we.id} className="flex items-center justify-between rounded-md bg-muted p-2 text-sm">
                          <span className="font-medium">{we.exercises?.name}</span>
                          <span className="text-muted-foreground">
                            {we.duration_minutes ? `${we.duration_minutes}min` : `${we.sets}×${we.reps} @ ${we.weight}kg`}
                          </span>
                        </div>
                      ))}
                      {w.notes && <p className="text-sm text-muted-foreground italic">{w.notes}</p>}
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteWorkout(w.id)}>
                        <Trash2 className="mr-1 h-3 w-3" />Delete
                      </Button>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default WorkoutHistory;
