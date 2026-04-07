export const PROGRAM = {
  "Day 1 — Push (Strength)": [
    { id: "d1e1", name: "Barbell Bench Press", sets: 4, reps: "5-6", rest: "3 min", note: "Heavy — work up to top set", increment: 5 },
    { id: "d1e2", name: "Incline Dumbbell Press", sets: 4, reps: "6-8", rest: "2 min", note: "30° incline, upper chest focus", increment: 5 },
    { id: "d1e3", name: "Weighted Dips", sets: 3, reps: "6-8", rest: "2 min", note: "Lean forward for chest bias", increment: 5 },
    { id: "d1e4", name: "Overhead Press", sets: 4, reps: "6-8", rest: "2 min", note: "Standing, strict form", increment: 5 },
    { id: "d1e5", name: "Lateral Raises", sets: 4, reps: "12-15", rest: "60s", note: "Slow eccentric, slight lean", increment: 2.5 },
    { id: "d1e6", name: "Tricep Pushdowns", sets: 3, reps: "10-12", rest: "60s", note: "Rope attachment", increment: 5 },
  ],
  "Day 2 — Pull (Strength)": [
    { id: "d2e1", name: "Barbell Rows", sets: 4, reps: "5-6", rest: "3 min", note: "Overhand grip, chest to bar", increment: 5 },
    { id: "d2e2", name: "Weighted Pull-Ups", sets: 4, reps: "6-8", rest: "2 min", note: "Wide grip for lat width", increment: 2.5 },
    { id: "d2e3", name: "Chest-Supported T-Bar Row", sets: 3, reps: "8-10", rest: "90s", note: "Squeeze at top", increment: 5 },
    { id: "d2e4", name: "Straight-Arm Pulldowns", sets: 3, reps: "12-15", rest: "60s", note: "Lat stretch & squeeze", increment: 5 },
    { id: "d2e5", name: "Face Pulls", sets: 4, reps: "15-20", rest: "60s", note: "Rear delt & posture", increment: 2.5 },
    { id: "d2e6", name: "Barbell Curls", sets: 3, reps: "8-10", rest: "60s", note: "Strict, no swing", increment: 2.5 },
  ],
  "Day 3 — Legs (Strength)": [
    { id: "d3e1", name: "Barbell Back Squat", sets: 4, reps: "5-6", rest: "3 min", note: "Below parallel", increment: 5 },
    { id: "d3e2", name: "Romanian Deadlift", sets: 4, reps: "6-8", rest: "2 min", note: "Hamstring stretch at bottom", increment: 5 },
    { id: "d3e3", name: "Leg Press", sets: 3, reps: "8-10", rest: "2 min", note: "High & wide foot placement", increment: 10 },
    { id: "d3e4", name: "Walking Lunges", sets: 3, reps: "10-10", rest: "90s", note: "Dumbbells at sides, 10/leg", increment: 5 },
    { id: "d3e5", name: "Leg Curls", sets: 3, reps: "10-12", rest: "60s", note: "Controlled tempo", increment: 5 },
    { id: "d3e6", name: "Standing Calf Raises", sets: 4, reps: "12-15", rest: "60s", note: "Full stretch at bottom", increment: 5 },
  ],
  "Day 4 — Push (Hypertrophy)": [
    { id: "d4e1", name: "Incline Barbell Bench", sets: 4, reps: "8-10", rest: "2 min", note: "Upper chest priority", increment: 5 },
    { id: "d4e2", name: "Flat Dumbbell Press", sets: 3, reps: "10-12", rest: "90s", note: "Deep stretch at bottom", increment: 5 },
    { id: "d4e3", name: "Cable Flyes (Low-to-High)", sets: 3, reps: "12-15", rest: "60s", note: "Upper chest squeeze", increment: 2.5 },
    { id: "d4e4", name: "Dumbbell Lateral Raises", sets: 5, reps: "15-20", rest: "45s", note: "High volume — build width", increment: 2.5 },
    { id: "d4e5", name: "Machine Shoulder Press", sets: 3, reps: "10-12", rest: "90s", note: "Controlled reps", increment: 5 },
    { id: "d4e6", name: "Overhead Tricep Extension", sets: 3, reps: "12-15", rest: "60s", note: "Cable or dumbbell", increment: 5 },
    { id: "d4e7", name: "Pec Deck / Machine Flye", sets: 3, reps: "12-15", rest: "60s", note: "Chest finisher — squeeze hard", increment: 5 },
  ],
  "Day 5 — Pull (Hypertrophy)": [
    { id: "d5e1", name: "Lat Pulldowns (Wide)", sets: 4, reps: "10-12", rest: "90s", note: "Lean back slightly, full stretch", increment: 5 },
    { id: "d5e2", name: "Seated Cable Row (Close Grip)", sets: 4, reps: "10-12", rest: "90s", note: "Drive elbows back", increment: 5 },
    { id: "d5e3", name: "Dumbbell Rows", sets: 3, reps: "10-12", rest: "60s", note: "Stretch at bottom, per arm", increment: 5 },
    { id: "d5e4", name: "Lat-Focused Pullover", sets: 3, reps: "12-15", rest: "60s", note: "Cable or dumbbell", increment: 5 },
    { id: "d5e5", name: "Rear Delt Flyes", sets: 4, reps: "15-20", rest: "45s", note: "Machine or cable", increment: 2.5 },
    { id: "d5e6", name: "Incline Dumbbell Curls", sets: 3, reps: "10-12", rest: "60s", note: "Long head stretch", increment: 2.5 },
    { id: "d5e7", name: "Hammer Curls", sets: 3, reps: "10-12", rest: "60s", note: "Brachialis for arm width", increment: 2.5 },
  ],
  "Day 6 — Legs (Hypertrophy)": [
    { id: "d6e1", name: "Front Squats", sets: 4, reps: "8-10", rest: "2 min", note: "Upright torso, quad focus", increment: 5 },
    { id: "d6e2", name: "Bulgarian Split Squats", sets: 3, reps: "10-12", rest: "90s", note: "Dumbbells, deep stretch, per leg", increment: 5 },
    { id: "d6e3", name: "Leg Extensions", sets: 3, reps: "12-15", rest: "60s", note: "Squeeze at top", increment: 5 },
    { id: "d6e4", name: "Stiff-Leg Deadlift", sets: 3, reps: "10-12", rest: "90s", note: "Dumbbells, slow negative", increment: 5 },
    { id: "d6e5", name: "Seated Leg Curls", sets: 3, reps: "12-15", rest: "60s", note: "Hold squeeze 1s", increment: 5 },
    { id: "d6e6", name: "Seated Calf Raises", sets: 4, reps: "15-20", rest: "45s", note: "Soleus focus", increment: 5 },
  ],
};

export const DAYS = Object.keys(PROGRAM);

export const WARMUPS = {
  push: {
    label: "PUSH WARM-UP",
    time: "5-7 min",
    moves: [
      { name: "Arm Circles", detail: "20 forward, 20 backward — small to big", icon: "\u{1F504}" },
      { name: "Band Pull-Aparts", detail: "2 \u00D7 15 — chest height, squeeze shoulder blades", icon: "\u{1F7E1}" },
      { name: "Band Dislocates", detail: "2 \u00D7 10 — slow, wide grip, full range overhead", icon: "\u{1F7E1}" },
      { name: "Scapular Push-Ups", detail: "2 \u00D7 10 — protract/retract only, arms locked", icon: "\u{1F4AA}" },
      { name: "Incline Push-Ups", detail: "1 \u00D7 12 — bench height, controlled tempo", icon: "\u{1F4AA}" },
      { name: "Band Shoulder External Rotation", detail: "2 \u00D7 12/arm — elbow pinned at 90\u00B0", icon: "\u{1F7E1}" },
      { name: "Cat-Cow", detail: "8 reps — open up thoracic spine", icon: "\u{1F431}" },
    ],
  },
  pull: {
    label: "PULL WARM-UP",
    time: "5-7 min",
    moves: [
      { name: "Band Pull-Aparts", detail: "2 \u00D7 15 — activate rear delts & rhomboids", icon: "\u{1F7E1}" },
      { name: "Band Face Pulls", detail: "2 \u00D7 15 — high pull, external rotate at top", icon: "\u{1F7E1}" },
      { name: "Scapular Pull-Ups (Dead Hang)", detail: "2 \u00D7 8 — depress & retract scaps only", icon: "\u{1F4AA}" },
      { name: "Band Straight-Arm Pulldowns", detail: "2 \u00D7 12 — light band, feel the lats engage", icon: "\u{1F7E1}" },
      { name: "Arm Circles", detail: "15 forward, 15 backward — loosen shoulders", icon: "\u{1F504}" },
      { name: "Thoracic Rotations", detail: "8/side — on all fours, hand behind head", icon: "\u{1F504}" },
      { name: "Light Bicep Band Curls", detail: "1 \u00D7 15 — get blood into elbows", icon: "\u{1F7E1}" },
    ],
  },
  legs: {
    label: "LEGS WARM-UP",
    time: "6-8 min",
    moves: [
      { name: "Bodyweight Squats", detail: "2 \u00D7 12 — full depth, controlled", icon: "\u{1F4AA}" },
      { name: "Walking Knee Hugs", detail: "10/leg — pull knee to chest, stand tall", icon: "\u{1F6B6}" },
      { name: "Leg Swings (Front-Back)", detail: "12/leg — hold wall, loosen hip flexors", icon: "\u{1F9B5}" },
      { name: "Leg Swings (Lateral)", detail: "12/leg — open up adductors & abductors", icon: "\u{1F9B5}" },
      { name: "Glute Bridges", detail: "2 \u00D7 12 — squeeze hard at top, 1s hold", icon: "\u{1F4AA}" },
      { name: "Band Lateral Walks", detail: "12/direction — mini band above knees", icon: "\u{1F7E1}" },
      { name: "Ankle Circles & Calf Pumps", detail: "10/foot — prep for squats & calf work", icon: "\u{1F504}" },
      { name: "Hip 90/90 Stretch", detail: "30s/side — internal & external rotation", icon: "\u{1F9D8}" },
    ],
  },
};

export const DAY_WARMUP_MAP = {
  0: "push", 1: "pull", 2: "legs", 3: "push", 4: "pull", 5: "legs",
};

export const STORAGE_KEY = "workout-log-v3";

export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function getWeekStart() {
  const today = getToday();
  const d = new Date(today + "T00:00:00Z");
  const day = d.getUTCDay(); // 0 Sun..6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDaysISO(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function parseRepRange(reps) {
  const clean = reps.replace(/\/leg|\/arm/g, "");
  const parts = clean.split("-").map(Number);
  if (parts.length === 2) return { min: parts[0], max: parts[1] };
  return { min: parts[0], max: parts[0] };
}

export const MUSCLE_MAP = {
  Chest: ["d1e1", "d1e2", "d1e3", "d4e1", "d4e2", "d4e3", "d4e7"],
  Shoulders: ["d1e4", "d1e5", "d4e4", "d4e5"],
  Triceps: ["d1e6", "d4e6"],
  Back: ["d2e1", "d2e2", "d2e3", "d2e4", "d5e1", "d5e2", "d5e3", "d5e4"],
  "Rear Delts": ["d2e5", "d5e5"],
  Biceps: ["d2e6", "d5e6", "d5e7"],
  Quads: ["d3e1", "d3e3", "d3e4", "d6e1", "d6e2", "d6e3"],
  Hamstrings: ["d3e2", "d3e5", "d6e4", "d6e5"],
  Calves: ["d3e6", "d6e6"],
};

export const ALL_EXERCISES = Object.entries(PROGRAM).flatMap(([day, exercises]) =>
  exercises.map((ex) => ({ ...ex, day }))
);
