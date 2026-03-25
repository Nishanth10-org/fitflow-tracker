import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    // Fetch last 14 days of workouts
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data: workouts } = await supabase
      .from("workouts")
      .select("*, workout_exercises(*, exercises(name, category))")
      .eq("user_id", userId)
      .gte("date", twoWeeksAgo)
      .order("date", { ascending: false });

    if (!workouts || workouts.length === 0) {
      return new Response(JSON.stringify({ error: "Log some workouts first to get AI insights!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build summary
    const categoryCount: Record<string, number> = {};
    let totalSets = 0, totalReps = 0, totalVolume = 0;
    const exerciseFreq: Record<string, number> = {};

    for (const w of workouts) {
      for (const we of (w.workout_exercises || [])) {
        const cat = we.exercises?.category || "other";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        exerciseFreq[we.exercises?.name || "unknown"] = (exerciseFreq[we.exercises?.name || "unknown"] || 0) + 1;
        totalSets += we.sets || 0;
        totalReps += (we.sets || 0) * (we.reps || 0);
        totalVolume += (we.sets || 0) * (we.reps || 0) * (we.weight || 0);
      }
    }

    const summary = `Last 14 days: ${workouts.length} workouts, ${totalSets} total sets, ${totalReps} total reps, ${Math.round(totalVolume)}kg total volume.
Muscle groups: ${Object.entries(categoryCount).map(([k, v]) => `${k}: ${v} exercises`).join(", ")}.
Most frequent exercises: ${Object.entries(exerciseFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v}x)`).join(", ")}.`;

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an expert fitness coach. Analyze the workout data and provide actionable insights. Be specific and constructive. Format your response in two sections: SUMMARY (2-3 sentences analyzing their training) and SUGGESTIONS (3-5 bullet points with specific advice about imbalances, improvements, and recovery)." },
          { role: "user", content: summary },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI request failed");
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || "";

    // Parse into summary and suggestions
    const parts = aiText.split(/SUGGESTIONS?:?/i);
    const aiSummary = (parts[0] || "").replace(/SUMMARY:?/i, "").trim();
    const aiSuggestions = (parts[1] || aiText).trim();

    // Store insight
    const { data: insight, error: insertError } = await supabase
      .from("insights")
      .insert({ user_id: userId, summary: aiSummary || aiText, suggestions: aiSuggestions })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
