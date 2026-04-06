import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import { calcEntry, getBestAmScore, getAmScore, fmtScore, scoreClass } from './lib/scoring.js'

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --green-deep: #1c3829; --green-mid: #245c3a; --green-light: #2e7d4f;
    --green-pale: #e8f0eb; --yellow: #f5d66e; --yellow-dark: #c9a227;
    --white: #ffffff; --off-white: #f7f5f0;
    --text-dark: #1a2e20; --text-mid: #3d5c47;
    --red: #c0392b; --am-blue: #1a3a5c; --am-blue-light: #e8f0f8;
    --mc-brown: #7f3b00;
  }
  body { background: var(--off-white); }
  .app { min-height: 100vh; font-family: 'EB Garamond', serif; background: var(--off-white); }

  .header { background: var(--green-deep); position: relative; overflow: hidden; }
  .header::before { content:''; position:absolute; inset:0; background:repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,0.015) 60px,rgba(255,255,255,0.015) 61px); }
  .header-inner { position:relative; z-index:1; padding:28px 20px 0; text-align:center; }
  .header-eyebrow { font-size:11px; letter-spacing:4px; color:var(--yellow); text-transform:uppercase; font-style:italic; margin-bottom:8px; }
  .header-title { font-family:'Playfair Display',serif; font-size:34px; font-weight:700; color:var(--white); letter-spacing:-0.5px; display:flex; align-items:center; justify-content:center; gap:14px; }
  .header-title span { color:var(--white); }
  .flag-icon { width:3px; height:28px; background:var(--yellow); position:relative; display:inline-block; flex-shrink:0; }
  .flag-icon::after { content:''; position:absolute; top:0; left:3px; border-left:14px solid var(--yellow); border-top:9px solid transparent; border-bottom:9px solid transparent; }
  .flag-icon.flip { transform:scaleX(-1); }
  .header-sub { font-size:12px; color:rgba(255,255,255,0.45); margin-top:8px; font-style:italic; }
  .header-nav { display:flex; margin-top:20px; border-top:1px solid rgba(255,255,255,0.12); position:relative; z-index:1; }
  .nav-btn { flex:1; padding:14px 8px; background:none; border:none; color:rgba(255,255,255,0.5); font-family:'EB Garamond',serif; font-size:14px; letter-spacing:1px; cursor:pointer; text-transform:uppercase; transition:all 0.2s; border-bottom:3px solid transparent; }
  .nav-btn.active { color:var(--yellow); border-bottom-color:var(--yellow); }
  .nav-btn:hover:not(.active) { color:rgba(255,255,255,0.8); }

  .refresh-bar { background:var(--green-deep); color:rgba(255,255,255,0.4); font-size:11px; text-align:center; padding:6px; font-style:italic; letter-spacing:0.5px; border-top:1px solid rgba(255,255,255,0.08); }
  .content { max-width:720px; margin:0 auto; padding:20px 16px 40px; }
  .green-divider { height:3px; background:linear-gradient(90deg,var(--green-deep),var(--green-light),var(--green-deep)); margin-bottom:20px; border-radius:2px; }

  .loading { text-align:center; padding:60px 20px; color:var(--text-mid); font-style:italic; font-size:16px; }
  .error-bar { background:#fee; border:1px solid #fcc; border-radius:4px; padding:12px 16px; color:var(--red); font-size:13px; margin-bottom:16px; }

  .rules-bar { display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap; }
  .rule-chip { background:var(--white); border:1px solid rgba(0,0,0,0.1); border-radius:3px; padding:7px 12px; font-size:12px; color:var(--text-mid); font-style:italic; display:flex; align-items:center; gap:6px; flex:1; min-width:160px; }
  .rule-chip .dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

  .lb-header { display:grid; grid-template-columns:40px 1fr 64px; padding:8px 16px; margin-bottom:4px; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--text-mid); }
  .entry-card { background:var(--white); border:1px solid rgba(0,0,0,0.08); border-radius:4px; margin-bottom:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06); transition:box-shadow 0.2s; }
  .entry-card.first { border-color:var(--yellow-dark); box-shadow:0 2px 8px rgba(201,162,39,0.2); }
  .entry-top { display:flex; align-items:center; padding:14px 16px; cursor:pointer; }
  .entry-card.first .entry-top { background:#fffdf2; }
  .entry-pos { font-family:'Playfair Display',serif; font-size:18px; font-weight:700; color:var(--text-mid); width:36px; flex-shrink:0; }
  .entry-card.first .entry-pos { color:var(--yellow-dark); }
  .entry-name { flex:1; font-size:18px; font-family:'Playfair Display',serif; color:var(--text-dark); font-weight:600; }
  .expand-hint { font-size:11px; color:var(--text-mid); margin-left:8px; font-style:italic; }
  .entry-total { font-family:'EB Garamond',serif; font-size:20px; font-weight:600; min-width:52px; text-align:right; }
  .score-under { color:#1a5c2e; } .score-over { color:var(--red); } .score-even { color:var(--text-dark); }

  .entry-picks { border-top:1px solid #f0ede6; padding:12px 16px; background:#fafaf8; }
  .picks-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .pick-row { display:flex; justify-content:space-between; align-items:center; padding:7px 10px; border-radius:3px; font-size:13px; }
  .pick-row.counting  { background:rgba(46,125,79,0.06); }
  .pick-row.dropped   { background:rgba(0,0,0,0.03); opacity:0.55; }
  .pick-row.am-row    { background:var(--am-blue-light); border:1px solid rgba(26,58,92,0.15); }
  .pick-row.am-winner { background:rgba(26,58,92,0.1); border:1px solid rgba(26,58,92,0.3); }
  .pick-row.penalized { background:rgba(127,59,0,0.07); border:1px solid rgba(127,59,0,0.2); }
  .pick-name { color:var(--text-dark); font-size:13px; display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
  .pick-row.dropped .pick-name { color:#999; }
  .pick-score { font-size:13px; font-weight:500; white-space:nowrap; }

  .badge { font-size:9px; letter-spacing:0.5px; text-transform:uppercase; padding:2px 5px; border-radius:2px; font-family:'EB Garamond',serif; white-space:nowrap; }
  .badge-drop   { background:#ddd; color:#666; }
  .badge-mc     { background:var(--mc-brown); color:white; }
  .badge-pen    { background:var(--mc-brown); color:white; }
  .badge-am     { background:var(--am-blue); color:white; }
  .badge-bonus  { background:var(--green-deep); color:var(--yellow); }

  .score-breakdown { border-top:1px solid #eee; margin-top:10px; padding-top:10px; display:flex; justify-content:flex-end; gap:16px; font-size:12px; color:var(--text-mid); font-style:italic; flex-wrap:wrap; }
  .bd-final { font-weight:700; color:var(--text-dark); font-style:normal; }
  .bd-bonus { color:var(--am-blue); font-weight:600; }

  .section-title { font-family:'Playfair Display',serif; font-size:22px; color:var(--green-deep); margin-bottom:4px; }
  .section-sub { font-size:13px; color:var(--text-mid); font-style:italic; margin-bottom:24px; }
  .input-label { font-size:10px; letter-spacing:3px; text-transform:uppercase; color:var(--text-mid); display:block; margin-bottom:8px; }
  .text-input { width:100%; padding:13px 16px; border:1px solid rgba(0,0,0,0.15); border-radius:4px; font-family:'Playfair Display',serif; font-size:16px; color:var(--text-dark); background:var(--white); margin-bottom:24px; outline:none; transition:border-color 0.2s; }
  .text-input:focus { border-color:var(--green-mid); }
  .locked-banner { background:var(--green-deep); color:var(--yellow); text-align:center; padding:24px 20px; border-radius:4px; font-family:'Playfair Display',serif; font-size:18px; }
  .locked-banner p { font-family:'EB Garamond',serif; color:rgba(255,255,255,0.7); font-size:14px; margin-top:8px; font-style:italic; }
  .tier-block { margin-bottom:22px; }
  .tier-label { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
  .tier-pill { background:var(--green-deep); color:var(--yellow); font-size:10px; letter-spacing:2px; text-transform:uppercase; padding:4px 10px; border-radius:2px; }
  .tier-pill.am { background:var(--am-blue); }
  .tier-name-text { font-size:13px; color:var(--text-mid); font-style:italic; }
  .tier-note { font-size:12px; color:var(--am-blue); background:var(--am-blue-light); border:1px solid rgba(26,58,92,0.2); border-radius:3px; padding:8px 12px; margin-bottom:10px; font-style:italic; }
  .golfer-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .golfer-btn { padding:12px 14px; border-radius:4px; border:1px solid rgba(0,0,0,0.12); background:var(--white); color:var(--text-dark); font-family:'EB Garamond',serif; font-size:14px; text-align:left; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; gap:8px; }
  .golfer-btn:hover { border-color:var(--green-mid); background:var(--green-pale); }
  .golfer-btn.selected { border-color:var(--green-mid); background:var(--green-deep); color:var(--white); }
  .golfer-btn.am-btn:hover { border-color:var(--am-blue); background:var(--am-blue-light); }
  .golfer-btn.am-btn.selected { border-color:var(--am-blue); background:var(--am-blue); color:var(--white); }
  .check-circle { width:16px; height:16px; border-radius:50%; border:1.5px solid rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; font-size:9px; flex-shrink:0; }
  .golfer-btn.selected .check-circle,.golfer-btn.am-btn.selected .check-circle { background:var(--yellow); border-color:var(--yellow); color:var(--green-deep); font-weight:700; }
  .golfer-btn-inner { display:flex; flex-direction:column; flex:1; min-width:0; }
  .golfer-btn-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .odds-chip { font-size:11px; color:var(--text-mid); font-style:italic; margin-top:1px; }
  .golfer-btn.selected .odds-chip { color:rgba(255,255,255,0.6); }
  .golfer-btn.am-btn.selected .odds-chip { color:rgba(255,255,255,0.6); }
  .submit-btn { width:100%; padding:16px; background:var(--green-deep); color:var(--yellow); border:none; border-radius:4px; cursor:pointer; font-family:'Playfair Display',serif; font-size:17px; letter-spacing:0.5px; margin-top:8px; transition:background 0.2s; }
  .submit-btn:hover:not(:disabled) { background:var(--green-mid); }
  .submit-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .success-card { text-align:center; padding:52px 24px; background:var(--white); border-radius:4px; border:1px solid rgba(0,0,0,0.08); }
  .flag-large { display:inline-block; width:3px; height:44px; background:var(--green-deep); position:relative; margin-bottom:20px; }
  .flag-large::after { content:''; position:absolute; top:0; left:3px; border-left:22px solid var(--yellow-dark); border-top:14px solid transparent; border-bottom:14px solid transparent; }

  .admin-gate { max-width:360px; margin:60px auto; text-align:center; }
  .admin-card { background:var(--white); border:1px solid rgba(0,0,0,0.08); border-radius:4px; padding:22px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
  .admin-title { font-size:10px; letter-spacing:3px; text-transform:uppercase; color:var(--green-deep); font-weight:700; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #eee; }
  .score-row { display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid #f5f2eb; gap:8px; }
  .score-row:last-child { border-bottom:none; }
  .score-controls { display:flex; gap:6px; align-items:center; flex-shrink:0; }
  .score-stepper { width:28px; height:28px; border-radius:3px; background:var(--green-pale); border:1px solid rgba(0,0,0,0.1); color:var(--green-deep); cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; }
  .score-stepper:hover { background:var(--green-mid); color:white; }
  .mc-toggle { font-size:11px; padding:4px 8px; border-radius:3px; border:1px solid rgba(0,0,0,0.15); background:var(--off-white); cursor:pointer; font-family:'EB Garamond',serif; color:var(--text-mid); }
  .mc-toggle.on { background:var(--mc-brown); color:white; border-color:var(--mc-brown); }
  .action-btn { padding:10px 18px; border-radius:3px; border:1px solid rgba(0,0,0,0.15); background:var(--white); color:var(--text-dark); font-family:'EB Garamond',serif; font-size:13px; cursor:pointer; transition:all 0.15s; }
  .action-btn:hover { background:var(--green-pale); border-color:var(--green-mid); }
  .action-btn.danger { color:var(--red); border-color:var(--red); }
  .action-btn.danger:hover { background:#fee; }
  .action-btn.primary { background:var(--green-deep); color:var(--yellow); border-color:var(--green-deep); }
  .action-btn.primary:hover { background:var(--green-mid); }
  .entry-admin-row { padding:12px 0; border-bottom:1px solid #f5f2eb; }
  .entry-admin-row:last-child { border-bottom:none; }
  .entry-admin-name { font-family:'Playfair Display',serif; font-size:15px; color:var(--text-dark); margin-bottom:6px; }
  .entry-admin-picks { font-size:12px; color:var(--text-mid); font-style:italic; line-height:1.6; }
`

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Master2026!!'

export default function App() {
  const [view, setView] = useState('leaderboard')
  const [tiers, setTiers] = useState([])
  const [golfers, setGolfers] = useState([])
  const [entries, setEntries] = useState([])
  const [picks, setPicks] = useState([])
  const [scores, setScores] = useState([])
  const [picksLocked, setPicksLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Picks form state
  const [newName, setNewName] = useState('')
  const [newPicks, setNewPicks] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Admin state
  const [adminAuthed, setAdminAuthed] = useState(false)
  const [adminPwInput, setAdminPwInput] = useState('')
  const [adminPwError, setAdminPwError] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [expanded, setExpanded] = useState(new Set())

  // ── Load all data ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [
        { data: tiersData,    error: e1 },
        { data: golfersData,  error: e2 },
        { data: entriesData,  error: e3 },
        { data: picksData,    error: e4 },
        { data: scoresData,   error: e5 },
        { data: settingsData, error: e6 },
      ] = await Promise.all([
        supabase.from('tiers').select('*').order('sort_order'),
        supabase.from('golfers').select('*'),
        supabase.from('entries').select('*').order('created_at'),
        supabase.from('picks').select('*'),
        supabase.from('scores').select('*'),
        supabase.from('settings').select('*'),
      ])

      const firstError = e1 || e2 || e3 || e4 || e5 || e6
      if (firstError) throw firstError

      setTiers(tiersData || [])
      setGolfers(golfersData || [])
      setEntries(entriesData || [])
      setPicks(picksData || [])
      setScores(scoresData || [])

      const lockedSetting = (settingsData || []).find(s => s.key === 'picks_locked')
      setPicksLocked(lockedSetting?.value === 'true')

      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadData])

  // ── Derived data ────────────────────────────────────────────────────────────
  const scoreData = useMemo(() => {
    const map = {}
    scores.forEach(s => {
      const golfer = golfers.find(g => g.id === s.golfer_id)
      if (golfer) map[golfer.name] = { total: s.total_strokes, missedCut: s.missed_cut }
    })
    return map
  }, [scores, golfers])

  const tiersWithGolfers = useMemo(() =>
    tiers.map(tier => ({
      ...tier,
      golfers: golfers.filter(g => g.tier_id === tier.id).map(g => g.name),
    })),
  [tiers, golfers])

  const golferOddsMap = useMemo(() => {
    const map = {}
    golfers.forEach(g => { if (g.odds) map[g.name] = g.odds })
    return map
  }, [golfers])

  const entriesWithPicks = useMemo(() =>
    entries.map(entry => {
      const picksArr = tiersWithGolfers.map(tier => {
        const pick = picks.find(p => p.entry_id === entry.id && p.tier_id === tier.id)
        const golfer = pick ? golfers.find(g => g.id === pick.golfer_id) : null
        return golfer?.name || null
      })
      return { ...entry, name: entry.participant_name, picks: picksArr }
    }),
  [entries, picks, tiersWithGolfers, golfers])

  // ── Scoring ─────────────────────────────────────────────────────────────────
  const bestAmScore = useMemo(
    () => getBestAmScore(entriesWithPicks, tiersWithGolfers, scoreData),
    [entriesWithPicks, tiersWithGolfers, scoreData]
  )

  const ranked = useMemo(() => {
    if (!tiersWithGolfers.length) return []
    return entriesWithPicks
      .filter(e => e.picks.every(p => p !== null))
      .map(e => {
        const result = calcEntry(e.picks, tiersWithGolfers, scoreData)
        const amScore = result.amateurPick ? getAmScore(result.amateurPick, scoreData) : null
        const isTopAm = amScore !== null && amScore === bestAmScore
        const amateurBonus = isTopAm ? -3 : 0
        const total = result.subtotal + amateurBonus
        return { ...e, ...result, isTopAm, amateurBonus, total }
      })
      .sort((a, b) => a.total - b.total)
  }, [entriesWithPicks, tiersWithGolfers, scoreData, bestAmScore])

  // ── Picks submission ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!newName.trim()) return alert('Please enter your name')
    if (Object.keys(newPicks).length < tiersWithGolfers.length) return alert('Pick one golfer from every tier')
    setSubmitting(true)
    try {
      const { data: entry, error: entryErr } = await supabase
        .from('entries')
        .insert({ participant_name: newName.trim() })
        .select()
        .single()
      if (entryErr) throw entryErr

      const pickRows = tiersWithGolfers.map(tier => {
        const golferName = newPicks[tier.id]
        const golfer = golfers.find(g => g.name === golferName && g.tier_id === tier.id)
        return { entry_id: entry.id, tier_id: tier.id, golfer_id: golfer.id }
      })
      const { error: picksErr } = await supabase.from('picks').insert(pickRows)
      if (picksErr) throw picksErr

      await loadData()
      setSubmitted(true)
    } catch (err) {
      alert('Error saving picks: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Admin actions ────────────────────────────────────────────────────────────
  const handleAdminLogin = () => {
    if (adminPwInput === ADMIN_PASSWORD) {
      setAdminAuthed(true)
      setAdminPwError(false)
    } else {
      setAdminPwError(true)
    }
  }

  const handleScoreUpdate = async (golferId, field, value) => {
    await supabase
      .from('scores')
      .update({ [field]: value, last_updated: new Date().toISOString() })
      .eq('golfer_id', golferId)
    await loadData()
  }

  const handleToggleLock = async () => {
    const newVal = picksLocked ? 'false' : 'true'
    await supabase.from('settings').update({ value: newVal }).eq('key', 'picks_locked')
    setPicksLocked(!picksLocked)
  }

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync-scores', {
        method: 'POST',
        headers: { 'x-cron-secret': import.meta.env.VITE_CRON_SECRET || '' },
      })
      const json = await res.json()
      alert(`Sync complete. Updated: ${json.updated ?? '?'} golfer(s).`)
      await loadData()
    } catch (err) {
      alert('Sync failed: ' + err.message)
    } finally {
      setSyncing(false)
    }
  }

  const toggleExpand = (id) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* Header */}
        <div className="header">
          <div className="header-inner">
            <div className="header-eyebrow">Augusta National · 2026</div>
            <div className="header-title">
              <span className="flag-icon" />
              JB's Masters Pool
              <span className="flag-icon flip" />
            </div>
            <div className="header-sub">7 tiers · best 5 of 7 scores count · low amateur earns −3</div>
          </div>
          <nav className="header-nav">
            {[['leaderboard','Leaderboard'],['picks','Enter Picks'],['admin','Admin']].map(([v,l]) => (
              <button key={v} className={`nav-btn${view===v?' active':''}`} onClick={() => setView(v)}>{l}</button>
            ))}
          </nav>
        </div>

        <div className="refresh-bar">
          Updated {lastRefresh.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · Auto-refreshes every 5 minutes
        </div>

        <div className="content">
          {error && <div className="error-bar">⚠ {error}</div>}

          {/* ── LEADERBOARD ── */}
          {view === 'leaderboard' && (
            loading ? <div className="loading">Loading scores…</div> : <>
              <div className="green-divider" />
              <div className="rules-bar">
                <div className="rule-chip"><span className="dot" style={{background:'var(--green-mid)'}} />Best 5 of 7 scores count</div>
                <div className="rule-chip"><span className="dot" style={{background:'var(--am-blue)'}} />Low amateur pick: −3 bonus</div>
                <div className="rule-chip"><span className="dot" style={{background:'var(--mc-brown)'}} />3rd+ MC forced in: 80/80 penalty</div>
              </div>

              {ranked.length === 0 ? (
                <div style={{textAlign:'center',padding:'40px 20px',color:'var(--text-mid)',fontStyle:'italic'}}>
                  No entries yet. Be the first to submit your picks!
                </div>
              ) : <>
                <div className="lb-header"><span>Pos</span><span>Participant</span><span style={{textAlign:'right'}}>Total</span></div>
                {ranked.map((e, i) => {
                  const open = expanded.has(e.id)
                  return (
                    <div key={e.id} className={`entry-card${i===0?' first':''}`}>
                      <div className="entry-top" onClick={() => toggleExpand(e.id)}>
                        <div className="entry-pos">{i+1}</div>
                        <div className="entry-name">
                          {e.name}
                          {e.isTopAm && <span className="badge badge-bonus" style={{marginLeft:8,fontSize:10}}>★ −3</span>}
                          <span className="expand-hint">{open ? '▲' : '▼'}</span>
                        </div>
                        <div className={`entry-total ${scoreClass(e.total)}`}>{fmtScore(e.total)}</div>
                      </div>
                      {open && (
                        <div className="entry-picks">
                          <div className="picks-grid">
                            {e.scored.map(({ golfer, effectiveScore, rawTotal, missedCut, hasPenalty, dropped, isAmateur }) => {
                              const isWinningAm = isAmateur && e.isTopAm && golfer === e.amateurPick
                              const rowClass = dropped ? 'dropped' : isWinningAm ? 'am-winner' : isAmateur ? 'am-row' : hasPenalty ? 'penalized' : 'counting'
                              return (
                                <div key={golfer} className={`pick-row ${rowClass}`}>
                                  <span className="pick-name">
                                    {golfer}
                                    {isAmateur && <span className="badge badge-am">Am</span>}
                                    {missedCut && <span className="badge badge-mc">MC</span>}
                                    {hasPenalty && <span className="badge badge-pen">+16</span>}
                                    {dropped && <span className="badge badge-drop">dropped</span>}
                                    {isWinningAm && <span className="badge badge-bonus">−3</span>}
                                  </span>
                                  <span className={`pick-score ${scoreClass(effectiveScore)}`}>
                                    {fmtScore(effectiveScore)}
                                    {hasPenalty && rawTotal !== null && (
                                      <span style={{fontSize:10,color:'#999',marginLeft:4}}>({fmtScore(rawTotal)})</span>
                                    )}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                          <div className="score-breakdown">
                            {e.amateurBonus !== 0 && <>
                              <span>Subtotal: {fmtScore(e.subtotal)}</span>
                              <span className="bd-bonus">Am bonus: −3</span>
                            </>}
                            <span className="bd-final">Total: {fmtScore(e.total)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>}
              <div style={{fontSize:11,color:'var(--text-mid)',fontStyle:'italic',textAlign:'center',marginTop:12}}>
                Dropped = 2 worst scores per entry. MC penalty (80×2) only applies to 3rd+ missed-cut golfer forced into counting 5.
              </div>
            </>
          )}

          {/* ── PICKS ── */}
          {view === 'picks' && (
            loading ? <div className="loading">Loading…</div> :
            picksLocked ? (
              <div className="locked-banner">
                🔒 Picks are locked
                <p>The tournament has begun. The leaderboard is live.</p>
              </div>
            ) : submitted ? (
              <div className="success-card">
                <div className="flag-large" />
                <div className="section-title" style={{fontSize:26,marginBottom:8}}>Good luck, {newName}!</div>
                <div className="section-sub" style={{marginBottom:28}}>Your picks are in. May the best 5 carry you.</div>
                <button className="submit-btn" style={{maxWidth:240,margin:'0 auto',display:'block'}}
                  onClick={() => { setSubmitted(false); setNewName(''); setNewPicks({}); setView('leaderboard') }}>
                  View Leaderboard
                </button>
              </div>
            ) : <>
              <div className="green-divider" />
              <div className="section-title">Enter Your Picks</div>
              <div className="section-sub">One golfer per tier — your best 5 of 7 scores will count</div>
              <label className="input-label">Your Name</label>
              <input className="text-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="First Last" />
              {tiersWithGolfers.map(t => (
                <div key={t.id} className="tier-block">
                  <div className="tier-label">
                    <span className={`tier-pill${t.is_amateur?' am':''}`}>{t.name}</span>
                    <span className="tier-name-text">{t.label}</span>
                  </div>
                  {t.is_amateur && (
                    <div className="tier-note">★ Pick the low amateur — if your pick leads all amateurs at tournament end, your team earns 3 bonus strokes off the final score.</div>
                  )}
                  <div className="golfer-grid">
                    {t.golfers.map(g => {
                      const sel = newPicks[t.id] === g
                      const odds = golferOddsMap[g]
                      return (
                        <button key={g} className={`golfer-btn${t.is_amateur?' am-btn':''}${sel?' selected':''}`}
                          onClick={() => setNewPicks(p => ({...p,[t.id]:g}))}>
                          <span className="check-circle">{sel ? '✓' : ''}</span>
                          <span className="golfer-btn-inner">
                            <span className="golfer-btn-name">{g}</span>
                            {odds && <span className="odds-chip">+{odds.toLocaleString()}</span>}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving…' : 'Submit Picks'}
              </button>
            </>
          )}

          {/* ── ADMIN ── */}
          {view === 'admin' && (
            !adminAuthed ? (
              <div className="admin-gate">
                <div className="green-divider" />
                <div className="section-title">Admin Access</div>
                <div className="section-sub">Enter the admin password to continue</div>
                <input
                  className="text-input"
                  type="password"
                  placeholder="Password"
                  value={adminPwInput}
                  onChange={e => setAdminPwInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                />
                {adminPwError && <div style={{color:'var(--red)',fontSize:13,marginTop:-16,marginBottom:16}}>Incorrect password</div>}
                <button className="submit-btn" onClick={handleAdminLogin}>Enter</button>
              </div>
            ) : loading ? <div className="loading">Loading…</div> : <>
              <div className="green-divider" />

              {/* Controls */}
              <div className="admin-card">
                <div className="admin-title">Controls</div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  <button className={`action-btn${picksLocked?' danger':' primary'}`} onClick={handleToggleLock}>
                    {picksLocked ? '🔓 Unlock Picks' : '🔒 Lock Picks'}
                  </button>
                  <button className="action-btn primary" onClick={handleManualSync} disabled={syncing}>
                    {syncing ? 'Syncing…' : '↻ Sync Scores Now'}
                  </button>
                  <button className="action-btn" onClick={loadData}>↺ Refresh Data</button>
                </div>
              </div>

              {/* Entries */}
              <div className="admin-card">
                <div className="admin-title">Entries ({entries.length})</div>
                {entriesWithPicks.length === 0 ? (
                  <div style={{color:'var(--text-mid)',fontStyle:'italic',fontSize:13}}>No entries yet.</div>
                ) : entriesWithPicks.map(e => (
                  <div key={e.id} className="entry-admin-row">
                    <div className="entry-admin-name">{e.participant_name}</div>
                    <div className="entry-admin-picks">
                      {tiersWithGolfers.map((tier, idx) => (
                        <span key={tier.id}>{tier.name}: {e.picks[idx] || '—'}  </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Score overrides */}
              <div className="admin-card">
                <div className="admin-title">Scores & Missed Cuts</div>
                <div style={{fontSize:12,color:'var(--text-mid)',fontStyle:'italic',marginBottom:14}}>
                  Toggle MC to mark a missed cut. The 80/80 penalty (+16) only applies if that golfer is the 3rd+ MC forced into a team's counting 5.
                </div>
                {golfers.map(golfer => {
                  const score = scores.find(s => s.golfer_id === golfer.id)
                  if (!score) return null
                  const tier = tiers.find(t => t.id === golfer.tier_id)
                  return (
                    <div key={golfer.id} className="score-row">
                      <span style={{fontSize:13,fontFamily:"'EB Garamond',serif",color:'var(--text-dark)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {golfer.name}
                        {tier?.is_amateur && <span className="badge badge-am" style={{marginLeft:6}}>Am</span>}
                      </span>
                      <div className="score-controls">
                        <button className={`mc-toggle${score.missed_cut?' on':''}`}
                          onClick={() => handleScoreUpdate(golfer.id, 'missed_cut', !score.missed_cut)}>
                          {score.missed_cut ? 'MC ✓' : 'MC'}
                        </button>
                        <button className="score-stepper" onClick={() => handleScoreUpdate(golfer.id, 'total_strokes', score.total_strokes - 1)}>−</button>
                        <span className={`entry-total ${scoreClass(score.total_strokes)}`} style={{fontSize:15,minWidth:40,textAlign:'center'}}>
                          {fmtScore(score.total_strokes)}
                        </span>
                        <button className="score-stepper" onClick={() => handleScoreUpdate(golfer.id, 'total_strokes', score.total_strokes + 1)}>+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
