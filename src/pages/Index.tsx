import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Timer, Zap, Trophy, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { startOfWeek, endOfWeek, format, subDays, eachDayOfInterval, isSameDay, parseISO } from "date-fns";

const COLORS = ["hsl(153,60%,40%)", "hsl(38,92%,55%)", "hsl(210,80%,55%)", "hsl(0,72%,55%)", "hsl(270,60%,55%)", "hsl(180,50%,45%)"];

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalWorkouts: 0, totalDuration: 0, calories: 0, streak: 0 });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [exerciseDist, setExerciseDist] = useState<any[]>([]);
  const [weightData, setWeightData] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Weekly workouts
      const { data: workouts } = await supabase
        .from("workouts").select("*")
        .eq("user_id", user.id)
        .gte("date", weekStart.toISOString())
        .lte("date", weekEnd.toISOString());

      const totalWorkouts = workouts?.length || 0;
      const totalDuration = workouts?.reduce((s, w) => s + (w.duration_minutes || 0), 0) || 0;
      const calories = Math.round(totalDuration * 7.5); // rough estimate

      // Streak
      const { data: allWorkouts } = await supabase
        .from("workouts").select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(60);

      let streak = 0;
      if (allWorkouts && allWorkouts.length > 0) {
        let checkDate = new Date();
        // Check if today has a workout, if not start from yesterday
        const todayHasWorkout = allWorkouts.some(w => isSameDay(parseISO(w.date), checkDate));
        if (!todayHasWorkout) checkDate = subDays(checkDate, 1);
        
        for (let i = 0; i < 60; i++) {
          const d = subDays(checkDate, i);
          if (allWorkouts.some(w => isSameDay(parseISO(w.date), d))) {
            streak++;
          } else break;
        }
      }

      setStats({ totalWorkouts, totalDuration, calories, streak });

      // Weekly chart
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      setWeeklyData(days.map(d => ({
        day: format(d, "EEE"),
        workouts: workouts?.filter(w => isSameDay(parseISO(w.date), d)).length || 0,
      })));

      // Exercise distribution
      const { data: we } = await supabase
        .from("workout_exercises").select("exercise_id, exercises(category)")
        .in("workout_id", (workouts || []).map(w => w.id));

      if (we && we.length > 0) {
        const catCount: Record<string, number> = {};
        we.forEach((item: any) => {
          const cat = item.exercises?.category || "other";
          catCount[cat] = (catCount[cat] || 0) + 1;
        });
        setExerciseDist(Object.entries(catCount).map(([name, value]) => ({ name, value })));
      }

      // Weight logs
      const { data: wl } = await supabase
        .from("weight_logs").select("*")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: true })
        .limit(30);

      setWeightData((wl || []).map(w => ({ date: format(parseISO(w.logged_at), "MMM d"), weight: w.weight })));

      // Achievements
      const { data: ach } = await supabase
        .from("achievements").select("*")
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false })
        .limit(5);

      setAchievements(ach || []);
    };
    load();
  }, [user]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Zap} label="Workouts This Week" value={stats.totalWorkouts} color="text-primary" />
        <StatCard icon={Timer} label="Total Duration" value={`${stats.totalDuration}m`} color="text-info" />
        <StatCard icon={Flame} label="Calories Burned" value={stats.calories} color="text-accent" />
        <StatCard icon={Trophy} label="Current Streak" value={`${stats.streak} days`} color="text-warning" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Weekly Activity</CardTitle></CardHeader>
          <CardContent className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="workouts" fill="hsl(153,60%,40%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Exercise Distribution</CardTitle></CardHeader>
          <CardContent className="h-52">
            {exerciseDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={exerciseDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                    {exerciseDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No data yet</div>}
          </CardContent>
        </Card>
      </div>

      {/* Weight Progress */}
      {weightData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" />Weight Progress</CardTitle></CardHeader>
          <CardContent className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="hsl(210,80%,55%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Recent Achievements</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {achievements.map((a) => (
                <Badge key={a.id} variant="secondary" className="gap-1">
                  <Trophy className="h-3 w-3" />{a.badge_type.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) => (
  <Card>
    <CardContent className="flex items-center gap-3 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold font-display">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default Dashboard;
