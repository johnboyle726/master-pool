// Exact port of calcEntry / getBestAmScore from masters-pool.jsx prototype

export const MC_PENALTY = (80 - 72) * 2  // +16

export const fmtScore = (s) =>
  s === null ? String.fromCharCode(8212) : s === 0 ? "E" : s > 0 ? "+" + s : String(s)

export const scoreClass = (s) =>
  s === null ? "" : s < 0 ? "score-under" : s > 0 ? "score-over" : "score-even"

export function calcEntry(picks, tiers, scoreData) {
  const amateurTierIdx = tiers.findIndex(t => t.is_amateur)
  const amateurPick = amateurTierIdx >= 0 ? picks[amateurTierIdx] : null

  const scored = picks.map((g, i) => {
    const tier = tiers[i]
    const data = scoreData[g]
    return {
      golfer: g,
      rawTotal: data ? data.total : null,
      missedCut: data?.missedCut || false,
      isAmateur: tier?.is_amateur || false,
    }
  })

  const madeIdx   = scored.map((x, i) => ({ ...x, idx: i })).filter(x => !x.missedCut && x.rawTotal !== null)
  const missedIdx = scored.map((x, i) => ({ ...x, idx: i })).filter(x =>  x.missedCut && x.rawTotal !== null)

  const sortedMade = [...madeIdx].sort((a, b) => a.rawTotal - b.rawTotal)
  const needFromMissed = Math.max(0, 5 - sortedMade.length)
  const forcedMissedCount = needFromMissed
  const sortedMissed = [...missedIdx].sort((a, b) => a.rawTotal - b.rawTotal)

  const counting5Indices = new Set([
    ...sortedMade.slice(0, 5).map(x => x.idx),
    ...sortedMissed.slice(0, needFromMissed).map(x => x.idx),
  ])

  const penaltyMissedIndices = new Set(
    sortedMissed.slice(2).slice(0, Math.max(0, forcedMissedCount - 2)).map(x => x.idx)
  )

  const finalScored = scored.map((x, i) => {
    const inCounting = counting5Indices.has(i)
    const hasPenalty = x.missedCut && inCounting && penaltyMissedIndices.has(i)
    const effectiveScore = x.rawTotal !== null
      ? x.rawTotal + (hasPenalty ? MC_PENALTY : 0)
      : null
    return { ...x, effectiveScore, hasPenalty, dropped: !inCounting }
  })

  const countingScores = finalScored.filter(x => !x.dropped && x.effectiveScore !== null)
  const subtotal = countingScores.reduce((a, x) => a + x.effectiveScore, 0)

  return { scored: finalScored, subtotal, total: subtotal, amateurPick, forcedMissedCount }
}

export function getBestAmScore(entriesWithPicks, tiers, scoreData) {
  const amateurTierIdx = tiers.findIndex(t => t.is_amateur)
  if (amateurTierIdx < 0) return null
  const picks = entriesWithPicks.map(e => e.picks[amateurTierIdx]).filter(Boolean)
  const scores = picks.map(g => {
    const d = scoreData[g]
    return d && !d.missedCut ? d.total : d ? d.total + MC_PENALTY : null
  }).filter(s => s !== null)
  return scores.length ? Math.min(...scores) : null
}

export function getAmScore(golfer, scoreData) {
  const d = scoreData[golfer]
  if (!d) return null
  return d.missedCut ? d.total + MC_PENALTY : d.total
}
