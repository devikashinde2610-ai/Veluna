import supabase from './supabase.js'

/**
 * Updates the user's streak in the `streaks` table.
 * Call this after any successful log (period, symptoms, diet, mood).
 *
 * Logic:
 *  - If the user logged something yesterday → increment current_streak
 *  - If the user already logged today → no change
 *  - Otherwise → reset current_streak to 1
 *  - If current_streak > longest_streak → update longest_streak
 *  - Always increment total_days_logged (only once per day)
 *
 * Returns { streak, milestone } where milestone is 3, 7, 14, or 30 if just hit.
 */
export async function updateStreak(profileId) {
  if (!profileId) return { streak: null, milestone: null }

  const today = new Date().toISOString().split('T')[0]

  // Fetch existing streak row
  const { data: existing, error: fetchError } = await supabase
    .from('streaks')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (fetchError) {
    console.error('Streak fetch error:', fetchError)
    return { streak: null, milestone: null }
  }

  if (!existing) {
    // First-ever log — create streak row
    const { data: created, error: createError } = await supabase
      .from('streaks')
      .insert({
        profile_id: profileId,
        current_streak: 1,
        longest_streak: 1,
        last_active_date: today,
        total_days_logged: 1,
      })
      .select()
      .single()

    if (createError) {
      console.error('Streak create error:', createError)
      return { streak: null, milestone: null }
    }

    return { streak: created, milestone: null }
  }

  // Already logged today — no change
  if (existing.last_active_date === today) {
    return { streak: existing, milestone: null }
  }

  // Calculate day difference
  const lastActive = new Date(existing.last_active_date + 'T00:00:00')
  const todayDate = new Date(today + 'T00:00:00')
  const diffMs = todayDate - lastActive
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  let newStreak
  if (diffDays === 1) {
    // Consecutive day — increment
    newStreak = (existing.current_streak || 0) + 1
  } else {
    // Missed a day — reset to 1
    newStreak = 1
  }

  const newLongest = Math.max(newStreak, existing.longest_streak || 0)
  const newTotalDays = (existing.total_days_logged || 0) + 1

  const { data: updated, error: updateError } = await supabase
    .from('streaks')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
      total_days_logged: newTotalDays,
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (updateError) {
    console.error('Streak update error:', updateError)
    return { streak: existing, milestone: null }
  }

  // Check for milestone
  const milestones = [30, 14, 7, 3]
  let milestone = null
  for (const m of milestones) {
    if (newStreak === m) {
      milestone = m
      break
    }
  }

  return { streak: updated, milestone }
}

/**
 * Fetch the current streak data for a user.
 */
export async function fetchStreak(profileId) {
  if (!profileId) return null

  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    console.error('Streak fetch error:', error)
    return null
  }

  return data
}

/**
 * Return the badge tier based on streak count.
 */
export function getStreakBadge(streak) {
  if (streak >= 30) return { tier: 'gold', label: '🥇 Gold', color: '#FFD700' }
  if (streak >= 7) return { tier: 'silver', label: '🥈 Silver', color: '#C0C0C0' }
  if (streak >= 3) return { tier: 'bronze', label: '🥉 Bronze', color: '#CD7F32' }
  return null
}
