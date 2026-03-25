import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trophy, Scale } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

const BADGE_LABELS: Record<string, string> = {
  first_workout: "🏋️ First Workout",
  "10_workouts": "🔟 10 Workouts",
  "50_reps_session": "💯 50 Reps Session",
  first_cardio: "🏃 First Cardio",
  "7_day_streak": "🔥 7-Day Streak",
  "30_day_streak": "⚡ 30-Day Streak",
};

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [goal, setGoal] = useState("maintain");
  const [saving, setSaving] = useState(false);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAge(profile.age ?? "");
      setWeight(profile.weight ?? "");
      setHeight(profile.height ?? "");
      setGoal(profile.goal || "maintain");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from("achievements").select("*").eq("user_id", user.id).order("unlocked_at", { ascending: false })
      .then(({ data }) => setAchievements(data || []));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      name, age: age || null, weight: weight || null, height: height || null, goal: goal as any,
    }).eq("user_id", user.id);

    if (error) { toast.error("Failed to save"); setSaving(false); return; }

    // Log weight if changed
    if (weight && weight !== profile?.weight) {
      await supabase.from("weight_logs").insert({ user_id: user.id, weight: Number(weight) });
    }

    await refreshProfile();
    toast.success("Profile updated!");
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-lg animate-fade-in space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Update your details and fitness goal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><label className="text-sm text-muted-foreground">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-sm text-muted-foreground">Age</label><Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value) || "")} /></div>
            <div><label className="text-sm text-muted-foreground flex items-center gap-1"><Scale className="h-3 w-3" />Weight (kg)</label><Input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value) || "")} /></div>
            <div><label className="text-sm text-muted-foreground">Height (cm)</label><Input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value) || "")} /></div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Fitness Goal</label>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.fitness_goal.map(g => (
                  <SelectItem key={g} value={g}>{g.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "Saving..." : "Save Profile"}</Button>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" />Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No achievements yet. Start working out!</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {achievements.map(a => (
                <Badge key={a.id} variant="outline" className="justify-start py-2 text-sm">
                  {BADGE_LABELS[a.badge_type] || a.badge_type.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
