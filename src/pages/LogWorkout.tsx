import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, Smile, Frown, Zap, Brain } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";

type Exercise = Tables<"exercises">;

interface ExerciseEntry {
  exercise_id: string;
  sets: number;
  reps: number;
  weight: number;
  duration_minutes: number | null;
}

const MOOD_OPTIONS = Constants.public.Enums.mood_type;
const MOOD_ICONS: Record<string, any> = { happy: Smile, tired: Frown, stressed: Zap, motivated: Brain };

const LogWorkout = () => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [entries, setEntries] = useState<ExerciseEntry[]>([{ exercise_id: "", sets: 3, reps: 10, weight: 0, duration_minutes: null }]);
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [moodNote, setMoodNote] = useState("");
  const [showMood, setShowMood] = useState(false);
  const [customExercise, setCustomExercise] = useState("");
  const [customCategory, setCustomCategory] = useState<string>("other");

  useEffect(() => {
    supabase.from("exercises").select("*").order("name").then(({ data }) => {
      if (data) setExercises(data);
    });
  }, []);

  const addEntry = () => setEntries([...entries, { exercise_id: "", sets: 3, reps: 10, weight: 0, duration_minutes: null }]);
  const removeEntry = (i: number) => setEntries(entries.filter((_, idx) => idx !== i));
  const updateEntry = (i: number, field: string, value: any) => {
    const next = [...entries];
    (next[i] as any)[field] = value;
    setEntries(next);
  };

  const repeatLast = async () => {
    if (!user) return;
    const { data: lastWorkout } = await supabase
      .from("workouts").select("id, duration_minutes, notes")
      .eq("user_id", user.id).order("date", { ascending: false }).limit(1).single();
    
    if (!lastWorkout) { toast.info("No previous workout found"); return; }

    const { data: lastExercises } = await supabase
      .from("workout_exercises").select("*").eq("workout_id", lastWorkout.id);

    if (lastExercises && lastExercises.length > 0) {
      setEntries(lastExercises.map(e => ({
        exercise_id: e.exercise_id, sets: e.sets, reps: e.reps, weight: e.weight, duration_minutes: e.duration_minutes,
      })));
      setDuration(lastWorkout.duration_minutes || 30);
      setNotes(lastWorkout.notes || "");
      toast.success("Previous workout loaded!");
    }
  };

  const addCustomExercise = async () => {
    if (!customExercise.trim()) return;
    const { data, error } = await supabase.from("exercises")
      .insert({ name: customExercise.trim(), category: customCategory as any, is_custom: true, created_by: user?.id })
      .select().single();
    if (error) { toast.error("Failed to add exercise"); return; }
    if (data) {
      setExercises([...exercises, data]);
      setCustomExercise("");
      toast.success("Exercise added!");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const validEntries = entries.filter(e => e.exercise_id);
    if (validEntries.length === 0) { toast.error("Add at least one exercise"); return; }

    setSaving(true);
    try {
      const { data: workout, error } = await supabase
        .from("workouts")
        .insert({ user_id: user.id, duration_minutes: duration, notes: notes || null })
        .select().single();

      if (error || !workout) throw error || new Error("Failed to create workout");

      const { error: exError } = await supabase
        .from("workout_exercises")
        .insert(validEntries.map(e => ({ workout_id: workout.id, exercise_id: e.exercise_id, sets: e.sets, reps: e.reps, weight: e.weight, duration_minutes: e.duration_minutes })));

      if (exError) throw exError;

      // Check achievements
      await checkAchievements(user.id, workout.id, validEntries);

      setShowMood(true);
      toast.success("Workout saved! 💪");

      // Save mood if selected
      if (mood) {
        await supabase.from("mood_entries").insert({
          user_id: user.id, workout_id: workout.id, mood: mood as any, note: moodNote || null,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  const saveMood = async (workoutId?: string) => {
    if (!user || !mood) return;
    await supabase.from("mood_entries").insert({
      user_id: user.id, workout_id: workoutId || null, mood: mood as any, note: moodNote || null,
    });
    toast.success("Mood logged!");
    resetForm();
  };

  const resetForm = () => {
    setEntries([{ exercise_id: "", sets: 3, reps: 10, weight: 0, duration_minutes: null }]);
    setNotes("");
    setDuration(30);
    setMood(null);
    setMoodNote("");
    setShowMood(false);
  };

  const checkAchievements = async (userId: string, _workoutId: string, validEntries: ExerciseEntry[]) => {
    const badges: string[] = [];

    // First workout
    const { count: wCount } = await supabase.from("workouts").select("*", { count: "exact", head: true }).eq("user_id", userId);
    if (wCount === 1) badges.push("first_workout");
    if (wCount && wCount >= 10) badges.push("10_workouts");

    // 50+ reps in session
    const totalReps = validEntries.reduce((s, e) => s + e.sets * e.reps, 0);
    if (totalReps >= 50) badges.push("50_reps_session");

    // Cardio check
    const cardioExercises = exercises.filter(e => e.category === "cardio").map(e => e.id);
    if (validEntries.some(e => cardioExercises.includes(e.exercise_id))) badges.push("first_cardio");

    for (const badge of badges) {
      await supabase.from("achievements").insert({ user_id: userId, badge_type: badge }).select().maybeSingle();
    }
    if (badges.length > 0) toast("🏆 Achievement unlocked!", { description: badges.join(", ").replace(/_/g, " ") });
  };

  if (showMood) {
    return (
      <div className="mx-auto max-w-lg animate-fade-in space-y-6">
        <Card>
          <CardHeader><CardTitle>How are you feeling?</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {MOOD_OPTIONS.map((m) => {
                const Icon = MOOD_ICONS[m] || Smile;
                return (
                  <Button key={m} variant={mood === m ? "default" : "outline"} className="h-16 flex-col gap-1" onClick={() => setMood(m)}>
                    <Icon className="h-5 w-5" />
                    <span className="capitalize text-xs">{m}</span>
                  </Button>
                );
              })}
            </div>
            <Textarea placeholder="Any notes about how you feel?" value={moodNote} onChange={(e) => setMoodNote(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => saveMood()} disabled={!mood} className="flex-1">Save Mood</Button>
              <Button variant="ghost" onClick={resetForm}>Skip</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getExerciseCategory = (exerciseId: string) => exercises.find(e => e.id === exerciseId)?.category;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">New Workout</h2>
        <Button variant="outline" size="sm" onClick={repeatLast}><RotateCcw className="mr-1 h-4 w-4" />Repeat Last</Button>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Duration (min)</label>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
          </div>

          {entries.map((entry, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Exercise {i + 1}</span>
                {entries.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeEntry(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                )}
              </div>
              <Select value={entry.exercise_id} onValueChange={(v) => updateEntry(i, "exercise_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select exercise" /></SelectTrigger>
                <SelectContent>
                  {exercises.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>{ex.name} <span className="text-muted-foreground ml-1">({ex.category})</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getExerciseCategory(entry.exercise_id) === "cardio" ? (
                <div>
                  <label className="text-sm text-muted-foreground">Duration (min)</label>
                  <Input type="number" value={entry.duration_minutes || ""} onChange={(e) => updateEntry(i, "duration_minutes", Number(e.target.value) || null)} />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-sm text-muted-foreground">Sets</label><Input type="number" value={entry.sets} onChange={(e) => updateEntry(i, "sets", Number(e.target.value))} /></div>
                  <div><label className="text-sm text-muted-foreground">Reps</label><Input type="number" value={entry.reps} onChange={(e) => updateEntry(i, "reps", Number(e.target.value))} /></div>
                  <div><label className="text-sm text-muted-foreground">Weight (kg)</label><Input type="number" value={entry.weight} onChange={(e) => updateEntry(i, "weight", Number(e.target.value))} /></div>
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addEntry} className="w-full"><Plus className="mr-1 h-4 w-4" />Add Exercise</Button>

          {/* Custom exercise */}
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Can't find your exercise?</p>
            <div className="flex gap-2">
              <Input placeholder="Exercise name" value={customExercise} onChange={(e) => setCustomExercise(e.target.value)} />
              <Select value={customCategory} onValueChange={setCustomCategory}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.exercise_category.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={addCustomExercise} size="sm">Add</Button>
            </div>
          </div>

          <Textarea placeholder="Workout notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
            {saving ? "Saving..." : "Save Workout 💪"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogWorkout;
