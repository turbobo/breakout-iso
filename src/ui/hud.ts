export interface HudState {
  score: number
  bestScore: number
  levelLabel: string
  lives: number
  mode: string
  timerText: string
  activePowerUps: Set<string>
}

export interface HudLevelOption {
  index: number
  name: string
  mode: string
  difficulty: number
  description: string
  timeLimitSeconds?: number
  chanceCount: number
}

export interface LevelTransitionState {
  completedLevel: number
  nextLevel: number
  nextName: string
  nextMode: string
  nextDescription: string
  nextChanceCount: number
  bonusScore: number
}

export interface ResultState {
  won: boolean
  score: number
  bestScore: number
  level: number
  mode: string
  combo: number
}

export class HudController {
  private readonly scoreElement = this.requireElement('[data-hud="score"]')
  private readonly bestElement = this.requireElement('[data-hud="best"]')
  private readonly levelElement = this.requireElement('[data-hud="level"]')
  private readonly modeElement = this.requireElement('[data-hud="mode"]')
  private readonly timerElement = this.requireElement('[data-hud="timer"]')
  private readonly livesElement = this.requireElement('[data-hud="lives"]')
  private readonly toastElement = this.requireElement('[data-hud="toast"]')
  private readonly levelListElement = this.requireElement('[data-level-list]')
  private readonly startScreen = this.requireElement('[data-screen="start"]')
  private readonly transitionScreen = this.requireElement('[data-screen="transition"]')
  private readonly pauseScreen = this.requireElement('[data-screen="pause"]')
  private readonly resultScreen = this.requireElement('[data-screen="result"]')
  private readonly transitionEyebrow = this.requireElement('[data-transition="eyebrow"]')
  private readonly transitionTitle = this.requireElement('[data-transition="title"]')
  private readonly transitionSummary = this.requireElement('[data-transition="summary"]')
  private readonly transitionStats = this.requireElement('[data-transition="stats"]')
  private readonly resultLabel = this.requireElement('[data-result="label"]')
  private readonly resultTitle = this.requireElement('[data-result="title"]')
  private readonly resultSummary = this.requireElement('[data-result="summary"]')
  private readonly gameCanvas = this.requireElement('[data-game-canvas]')
  private toastTimer = 0

  public update(state: HudState): void {
    this.scoreElement.textContent = String(state.score)
    this.bestElement.textContent = String(state.bestScore)
    this.levelElement.textContent = state.levelLabel
    this.modeElement.textContent = state.mode
    this.timerElement.textContent = state.timerText
    this.livesElement.textContent = String(state.lives)

    document.querySelectorAll<HTMLElement>('[data-powerup]').forEach((element) => {
      const powerUpName = element.dataset.powerup ?? ''
      element.classList.toggle('is-active', state.activePowerUps.has(powerUpName))
    })
  }

  public renderLevelSelect(
    levels: HudLevelOption[],
    selectedLevelIndex: number,
    onSelectLevel: (levelIndex: number) => void,
  ): void {
    const levelButtons = levels.map((level) => {
      const levelButton = document.createElement('button')
      const timerText = level.timeLimitSeconds ? `${level.timeLimitSeconds} 秒` : level.mode === 'boss' ? '脉冲' : '不限时'
      const chanceText = level.chanceCount === 1 ? '1 次机会' : `${level.chanceCount} 次机会`

      levelButton.type = 'button'
      levelButton.className = 'level-card'
      levelButton.classList.toggle('is-selected', level.index === selectedLevelIndex)
      levelButton.dataset.levelIndex = String(level.index)
      levelButton.innerHTML = `
        <span class="level-card-meta">${formatModeLabel(level.mode)} · 难度 ${level.difficulty} · ${timerText} · ${chanceText}</span>
        <strong>${level.index + 1}. ${level.name}</strong>
        <small>${level.description}</small>
      `
      levelButton.addEventListener('click', () => onSelectLevel(level.index))

      return levelButton
    })

    this.levelListElement.replaceChildren(...levelButtons)
  }

  public showScreen(screenName: 'start' | 'transition' | 'pause' | 'result' | 'none'): void {
    this.setScreenVisibility(this.startScreen, screenName === 'start')
    this.setScreenVisibility(this.transitionScreen, screenName === 'transition')
    this.setScreenVisibility(this.pauseScreen, screenName === 'pause')
    this.setScreenVisibility(this.resultScreen, screenName === 'result')
    this.focusActiveScreen(screenName)
  }

  public showToast(message: string): void {
    window.clearTimeout(this.toastTimer)
    this.toastElement.textContent = message
    this.toastElement.classList.add('is-visible')
    this.toastTimer = window.setTimeout(() => {
      this.toastElement.classList.remove('is-visible')
    }, 1300)
  }

  public showLevelTransition(state: LevelTransitionState): void {
    window.clearTimeout(this.toastTimer)
    this.transitionEyebrow.textContent = `第 ${state.completedLevel} 关完成`
    this.transitionTitle.textContent = `确认进入第 ${state.nextLevel} 关？`
    this.transitionSummary.textContent = `下一关：${state.nextName} · ${formatModeLabel(state.nextMode)}模式 · ${state.nextDescription}`
    this.transitionStats.textContent = `奖励 +${state.bonusScore} · 第 ${state.nextLevel} 关 · ${state.nextChanceCount} 次机会`
    this.showScreen('transition')
  }

  public showResult(state: ResultState): void {
    window.clearTimeout(this.toastTimer)
    this.resultLabel.textContent = state.won ? '胜利' : '游戏结束'
    this.resultTitle.textContent = state.won ? '通关成功' : '再来一局'
    this.resultSummary.textContent = `得分 ${state.score} · 最高分 ${state.bestScore} · 到达第 ${state.level} 关 · ${state.mode} · 最大连击 x${Math.max(1, state.combo)}`
    this.showScreen('result')
  }

  private setScreenVisibility(screen: HTMLElement, visible: boolean): void {
    screen.classList.toggle('is-visible', visible)
    screen.setAttribute('aria-hidden', String(!visible))
    screen.toggleAttribute('inert', !visible)
  }

  private focusActiveScreen(screenName: 'start' | 'transition' | 'pause' | 'result' | 'none'): void {
    if (screenName === 'none') {
      this.gameCanvas.focus({ preventScroll: true })
      return
    }

    const activeScreen = this.getScreenElement(screenName)
    const primaryControl = activeScreen.querySelector<HTMLElement>('.primary-button, button')
    primaryControl?.focus({ preventScroll: true })
  }

  private getScreenElement(screenName: 'start' | 'transition' | 'pause' | 'result'): HTMLElement {
    if (screenName === 'start') {
      return this.startScreen
    }

    if (screenName === 'transition') {
      return this.transitionScreen
    }

    if (screenName === 'pause') {
      return this.pauseScreen
    }

    return this.resultScreen
  }

  private requireElement(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector)

    if (!element) {
      throw new Error(`Missing HUD element: ${selector}`)
    }

    return element
  }
}

function formatModeLabel(mode: string): string {
  if (mode === 'timed') {
    return '限时'
  }

  if (mode === 'boss') {
    return '首领'
  }

  return '常规'
}
