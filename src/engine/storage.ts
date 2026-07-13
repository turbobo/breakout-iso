const highScoreKey = 'neon-breakout-best-score'
let cachedBestScore: number | null = null

export function readBestScore(): number {
  if (cachedBestScore !== null) return cachedBestScore
  const storedScore = window.localStorage.getItem(highScoreKey)
  const parsedScore = Number(storedScore)
  cachedBestScore = Number.isFinite(parsedScore) ? parsedScore : 0
  return cachedBestScore
}

export function saveBestScore(score: number): void {
  const currentBest = readBestScore()
  if (score <= currentBest) return
  cachedBestScore = score
  window.localStorage.setItem(highScoreKey, String(score))
}
