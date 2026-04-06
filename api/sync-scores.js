import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'

// Masters 2026: April 9 (Thu) – April 12 (Sun), 8am–8pm ET each day
function isWithinTournamentWindow() {
  const etNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const year  = etNow.getFullYear()
  const month = etNow.getMonth() + 1
  const day   = etNow.getDate()
  const hour  = etNow.getHours()
  if (year !== 2026 || month !== 4) return false
  if (day < 9 || day > 12) return false
  if (hour < 8 || hour >= 20) return false
  return true
}

/** Case-insensitive surname match — strips non-alpha, requires last name >= 4 chars */
function fuzzyMatch(dbName, espnName) {
  const norm = s => s.toLowerCase().replace(/[^a-z]/g, '')
  if (norm(dbName) === norm(espnName)) return true
  const lastName = s => s.trim().split(/\s+/).pop().toLowerCase().replace(/[^a-z]/g, '')
  const dbSurname   = lastName(dbName)
  const espnSurname = lastName(espnName)
  return dbSurname.length >= 4 && dbSurname === espnSurname
}

function parseScore(scoreStr) {
  if (!scoreStr || scoreStr === 'E' || scoreStr === 'Even') return 0
  const n = parseInt(scoreStr, 10)
  return isNaN(n) ? 0 : n
}

async function syncScores() {
  const resp = await fetch(ESPN_URL, { headers: { 'User-Agent': 'masters-pool-app/1.0' } })
  if (!resp.ok) throw new Error(`ESPN API returned ${resp.status}`)
  const data = await resp.json()

  const event = data.events?.[0]
  if (!event) return { updated: 0, skipped: 0, note: 'No active event found on ESPN' }

  const competitors = event.competitions?.[0]?.competitors || []
  if (!competitors.length) return { updated: 0, skipped: 0, note: 'No competitors in event' }

  const { data: golfers, error: gErr } = await supabase.from('golfers').select('id, name')
  if (gErr) throw gErr

  let updated = 0
  let skipped = 0
  const unmatched = []

  for (const comp of competitors) {
    const espnName = comp.athlete?.displayName || comp.athlete?.fullName || ''
    if (!espnName) continue

    const statusName = (comp.status?.type?.name || '').toUpperCase()
    const missedCut  = statusName.includes('MISSED_CUT') || statusName.includes('CUT')

    const scoreStr     = comp.score ?? comp.statistics?.find(s => s.name === 'scoreToPar')?.displayValue ?? '0'
    const totalStrokes = parseScore(String(scoreStr))

    const matched = golfers.find(g => fuzzyMatch(g.name, espnName))
    if (!matched) {
      unmatched.push(espnName)
      skipped++
      continue
    }

    const { error: uErr } = await supabase.from('scores').upsert(
      { golfer_id: matched.id, total_strokes: totalStrokes, missed_cut: missedCut, last_updated: new Date().toISOString() },
      { onConflict: 'golfer_id' }
    )
    if (!uErr) updated++
  }

  return { updated, skipped, unmatched }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret    = process.env.CRON_SECRET
  const authHeader    = req.headers.authorization || ''
  const secretHeader  = req.headers['x-cron-secret'] || ''
  const isVercelCron  = authHeader === `Bearer ${cronSecret}`
  const isAdminTrigger = cronSecret && secretHeader === cronSecret

  if (cronSecret && !isVercelCron && !isAdminTrigger) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Outside tournament window? Skip automated cron but allow manual triggers
  if (req.method === 'GET' && !isAdminTrigger && !isWithinTournamentWindow()) {
    return res.status(200).json({ skipped: true, reason: 'Outside tournament window' })
  }

  try {
    const result = await syncScores()
    return res.status(200).json(result)
  } catch (err) {
    console.error('sync-scores error:', err)
    return res.status(500).json({ error: err.message })
  }
}
