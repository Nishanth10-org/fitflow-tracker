
# FitTrack — Fitness Tracking Web App

## Overview
A full-stack fitness tracking application with workout logging, dashboard analytics, AI-powered insights, gamification, and mood tracking. Built with React + Supabase.

---

## Phase 1: Database & Auth Setup

### Database Schema (Supabase PostgreSQL)
- **profiles** — name, age, weight, height, goal (enum: lose_fat, gain_muscle, maintain), linked to auth.users
- **exercises** — id, name, category (enum: chest, back, legs, arms, cardio, other). Seeded with common exercises.
- **workouts** — id, user_id, date, duration_minutes, notes
- **workout_exercises** — id, workout_id, exercise_id, sets, reps, weight, duration (for cardio)
- **mood_entries** — id, user_id, workout_id (optional), mood (enum: happy, tired, stressed, motivated), note
- **insights** — id, user_id, summary, suggestions, created_at
- **achievements** — id, user_id, badge_type, unlocked_at
- Row Level Security on all tables so users only access their own data.

### Authentication
- Supabase Auth with email/password signup and login
- Auto-create profile on signup via database trigger
- Persistent sessions via Supabase client

---

## Phase 2: Core Pages & Navigation

### Layout
- Responsive sidebar navigation (collapsible on mobile)
- Pages: Dashboard, Log Workout, Workout History, Profile, Insights

### Profile Page
- Edit name, age, weight, height, fitness goal
- Weight history log for tracking progress over time

---

## Phase 3: Workout Tracking

### Log Workout Page
- Select exercises from dropdown (with search) or add custom exercise
- For each exercise: input sets, reps, weight (or duration for cardio)
- Add multiple exercises per session
- Optional notes field
- "Repeat last workout" button that pre-fills from most recent session
- Post-workout mood prompt (happy/tired/stressed/motivated + optional note)

### Workout History Page
- Workouts grouped by date, expandable to see full session details
- Filters: date range picker, exercise type dropdown
- Edit and delete workouts

---

## Phase 4: Dashboard

### Stats Cards
- Total workouts this week
- Total duration this week
- Estimated calories burned (based on exercise type & duration)
- Current workout streak (consecutive days)

### Charts (Recharts)
- **Weekly Activity** — bar chart showing workouts per day
- **Weight Progress** — line chart from weight log entries
- **Exercise Distribution** — pie chart by muscle group category
- **Mood Correlation** — small chart showing mood trends alongside workout frequency

### Recent Achievements
- Display recently unlocked badges on dashboard

---

## Phase 5: AI Insights

### Edge Function
- Collects last 7–14 days of workout data for the user
- Builds a structured summary (exercise frequency, volume, muscle groups hit)
- Sends summary to Lovable AI Gateway (Gemini) with a prompt for fitness analysis
- Returns: training imbalances, improvement suggestions, recovery advice
- Stores result in insights table

### Insights Section (Dashboard)
- "Get AI Insights" button (with loading state)
- Display latest insight with summary and suggestions
- History of past insights accessible

---

## Phase 6: Gamification

### Achievement Badges
- First workout logged
- 7-day streak, 30-day streak
- 50 total reps in a session
- 10 workouts completed
- First cardio workout
- Badges unlock automatically and show toast notifications
- Badge gallery on profile page

### Streak Tracking
- Calculate consecutive workout days
- Display streak prominently on dashboard
- Streak freeze visual when broken

---

## Phase 7: Mood Tracking

- Post-workout mood selection (integrated into workout logging flow)
- Mood history view
- Correlation visualization: mood vs. workout intensity/frequency over time

---

## UI/UX Design
- Clean, minimal design with a fitness-oriented color palette (energetic accent colors)
- Mobile-first responsive layout
- Smooth loading skeletons for all data-fetching states
- Toast notifications for actions (workout saved, badge unlocked, etc.)
- Reusable card, form, and chart components
