import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
export const supabaseEnabled = !!supabase;

// Convert a logData entry { weight, reps, ts } + key "date::eid::sn" into a row
function keyToRow(key, value, userId) {
  const [date, exercise_id, set_num] = key.split("::");
  return {
    user_id: userId,
    date,
    exercise_id,
    set_num: Number(set_num),
    weight: Number(value.weight),
    reps: Number(value.reps),
    ts: new Date(value.ts || Date.now()).toISOString(),
  };
}

function rowToKey(row) {
  return `${row.date}::${row.exercise_id}::${row.set_num}`;
}

// Fetch all rows for the current user, return as logData object keyed by composite key
export async function fetchAllSets(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("sets")
    .select("date, exercise_id, set_num, weight, reps, ts")
    .eq("user_id", userId);
  if (error) {
    console.error("Supabase fetch error:", error);
    return null;
  }
  const out = {};
  data.forEach((r) => {
    out[rowToKey(r)] = { weight: Number(r.weight), reps: Number(r.reps), ts: new Date(r.ts).getTime() };
  });
  return out;
}

// Diff prev vs next logData and push the changes to Supabase
export async function syncDiff(prev, next, userId) {
  if (!supabase || !userId) return;
  const prevKeys = new Set(Object.keys(prev || {}));
  const nextKeys = new Set(Object.keys(next || {}));

  const upserts = [];
  const deletes = [];

  // Added or modified
  nextKeys.forEach((k) => {
    const p = prev?.[k];
    const n = next[k];
    if (!p || p.weight !== n.weight || p.reps !== n.reps || p.ts !== n.ts) {
      upserts.push(keyToRow(k, n, userId));
    }
  });

  // Removed
  prevKeys.forEach((k) => {
    if (!nextKeys.has(k)) {
      const [date, exercise_id, set_num] = k.split("::");
      deletes.push({ date, exercise_id, set_num: Number(set_num) });
    }
  });

  const ops = [];
  if (upserts.length > 0) {
    ops.push(
      supabase.from("sets").upsert(upserts, { onConflict: "user_id,date,exercise_id,set_num" })
    );
  }
  for (const d of deletes) {
    ops.push(
      supabase
        .from("sets")
        .delete()
        .eq("user_id", userId)
        .eq("date", d.date)
        .eq("exercise_id", d.exercise_id)
        .eq("set_num", d.set_num)
    );
  }

  const results = await Promise.allSettled(ops);
  const failed = results.filter((r) => r.status === "rejected" || (r.value && r.value.error));
  if (failed.length > 0) {
    console.error("Supabase sync errors:", failed);
    return false;
  }
  return true;
}

// Merge cloud data into local data using newer-ts-wins
export function mergeLogData(local, cloud) {
  const merged = { ...local };
  Object.keys(cloud || {}).forEach((k) => {
    const l = merged[k];
    const c = cloud[k];
    if (!l || (c.ts || 0) >= (l.ts || 0)) {
      merged[k] = c;
    }
  });
  return merged;
}

export async function signInWithEmail(email) {
  if (!supabase) return { error: "Supabase not configured" };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href.split("#")[0] },
  });
  return { error };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user || null);
  });
  // Also check current session
  supabase.auth.getSession().then(({ data: s }) => cb(s.session?.user || null));
  return () => data.subscription.unsubscribe();
}
