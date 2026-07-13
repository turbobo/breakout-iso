export interface HudState {
  score: number
  bestScore: number
  level: number
  lives: number
  activePowerUps: Set<string>
}

export interface ResultState {
  won: boolean
  score: number
  bestScore: number
  level: number
  combo: number
}

export class HudController {
  private readonly scoreElement = this.requireElement('[data-hud="score"]')
  private readonly bestElement = this.requireElement('[data-hud="best"]')
  private readonly levelElement = this.requireElement('[data-hud="level"]')
  private readonly livesElement = this.requireElement('[data-hud="lives"]')
  private readonly toastElement = this.requireElement('[data-hud="toast"]')
  private readonly startScreen = this.requireElement('[data-screen="start"]')
  private readonly pauseScreen = this.requireElement('[data-screen="pause"]')
  private readonly resultScreen = this.requireElement('[data-screen="result"]')
  private readonly resultLabel = this.requireElement('[data-result="label"]')
  private readonly resultTitle = this.requireElement('[data-result="title"]')
  private readonly resultSummary = this.requireElement('[data-result="summary"]')
  private toastTimer = 0

  public update(state: HudState): void {
    this.scoreElement.textContent = String(state.score)
    this.bestElement.textContent = String(state.bestScore)
    this.levelElement.textContent = String(state.level)
    this.livesElement.textContent = String(state.lives)

    document.querySelectorAll<HTMLElement>('[data-powerup]').forEach((element) => {
      const powerUpName = element.dataset.powerup ?? ''
      element.classList.toggle('is-active', state.activePowerUps.has(powerUpName))
    })
  }

  public showScreen(screenName: 'start' | 'pause' | 'result' | 'none'): void {
    this.startScreen.classList.toggle('is-visible', screenName === 'start')
    this.pauseScreen.classList.toggle('is-visible', screenName === 'pause')
    this.resultScreen.classList.toggle('is-visible', screenName === 'result')
  }

  public showToast(message: string): void {
    this.toastElement.textContent = message
    this.toastElement.classList.add('is-visible')
    this.toastTimer = window.setTimeout(() => {
      this.toastElement.classList.remove('is-visible')
    }, 1300)
  }

  public showResult(state: ResultState): void {
    window.clearTimeout(this.toastTimer)
    this.resultLabel.textContent = state.won ? 'Victory' : 'Game Over'
    this.resultTitle.textContent = state.won ? '通关成功' : '再来一局'
    this.resultSummary.textContent = `得分 ${state.score} · 最高分 ${state.bestScore} · 到达第 ${state.level} 关 · 最大连击 x${Math.max(1, state.combo)}`
    this.showScreen('result')
  }

  private requireElement(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector)

    if (!element) {
      throw new Error(`Missing HUD element: ${selector}`)
    }

    return element
  }
}
