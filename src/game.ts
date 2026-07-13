import { SynthAudio } from './audio/synth'
import { Ball } from './entities/ball'
import type { Brick } from './entities/brick'
import { Paddle } from './entities/paddle'
import { PowerUp, pickPowerUp, type PowerUpKind } from './entities/powerup'
import {
  clamp,
  getSpeed,
  reflectVelocity,
  resolveCircleRectCollision,
  scaleToLength,
} from './engine/math'
import { ParticleSystem } from './engine/particles'
import { Renderer } from './engine/renderer'
import { readBestScore, saveBestScore } from './engine/storage'
import {
  createLevelBricks,
  getLevelCount,
  getLevelDefinition,
  getLevelName,
  getLevelPowerUpDropRate,
  getLevelSummaries,
} from './levels/level-data'
import { HudController } from './ui/hud'

type GamePhase = 'start' | 'playing' | 'paused' | 'result'

const initialLives = 3
const initialBallSpeed = 430
const maxBallSpeed = 760
const speedIncreaseEveryDestroyedBricks = 8

export class Game {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly renderer: Renderer
  private readonly particles = new ParticleSystem()
  private readonly audio = new SynthAudio()
  private readonly hud = new HudController()
  private readonly pressedKeys = new Set<string>()
  private boardWidth = 960
  private boardHeight = 640
  private devicePixelRatio = 1
  private phase: GamePhase = 'start'
  private balls: Ball[] = []
  private bricks: Brick[] = []
  private powerUps: PowerUp[] = []
  private paddle = new Paddle({ x: 480, y: 590 })
  private targetPaddleX = 480
  private lastFrameTime = 0
  private score = 0
  private bestScore = readBestScore()
  private lives = initialLives
  private levelIndex = 0
  private combo = 0
  private maxCombo = 0
  private destroyedBrickCount = 0
  private shieldCharges = 0
  private shake = 0
  private activePointerId: number | null = null
  private pointerStartClientX = 0
  private pointerStartTargetX = 0
  private selectedLevelIndex = 0
  private levelTimeRemainingSeconds: number | null = null
  private bossSkillCooldownSeconds = 0

  public constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas 2D context is unavailable')
    }

    this.canvas = canvas
    this.context = context
    this.renderer = new Renderer(context)
    this.registerEvents()
    this.resize()
    this.resetRun()
    this.renderLevelSelect()
    this.hud.showScreen('start')
    this.updateHud()
  }

  public start(): void {
    this.lastFrameTime = performance.now()
    window.requestAnimationFrame((time) => this.tick(time))
  }

  private tick(currentTime: number): void {
    const deltaSeconds = Math.min(1 / 30, (currentTime - this.lastFrameTime) / 1000)
    this.lastFrameTime = currentTime

    if (this.phase === 'playing') {
      this.update(deltaSeconds)
    }

    this.draw()
    window.requestAnimationFrame((time) => this.tick(time))
  }

  private update(deltaSeconds: number): void {
    this.updateLevelRules(deltaSeconds)

    if (this.phase !== 'playing') {
      this.updateHud()
      return
    }

    this.updateKeyboardPaddle(deltaSeconds)
    this.paddle.update(deltaSeconds, this.targetPaddleX, this.boardWidth)
    this.balls.forEach((ball) => ball.update(deltaSeconds))
    this.updatePowerUps(deltaSeconds)
    this.handleWallCollisions()
    this.handlePaddleCollisions()
    this.handleBrickCollisions()
    this.removeDroppedBalls()
    this.bricks.forEach((brick) => brick.update(deltaSeconds))
    this.particles.update(deltaSeconds)
    this.shake = Math.max(0, this.shake - deltaSeconds * 28)
    this.checkLevelComplete()
    this.updateHud()
  }

  private draw(): void {
    this.renderer.draw({
      balls: this.balls,
      bricks: this.bricks,
      paddle: this.paddle,
      powerUps: this.powerUps,
      particles: this.particles,
      score: this.score,
      combo: this.combo,
      shieldActive: this.shieldCharges > 0,
      shieldY: this.getPlayBottomY(),
      shake: this.shake,
    })
  }

  private registerEvents(): void {
    window.addEventListener('resize', () => this.resize())
    window.addEventListener('keydown', (event) => this.handleKeyDown(event))
    window.addEventListener('keyup', (event) => this.pressedKeys.delete(event.key))
    this.canvas.addEventListener('pointerdown', (event) => this.handlePointerDown(event))
    this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event))
    this.canvas.addEventListener('pointerup', (event) => this.handlePointerEnd(event))
    this.canvas.addEventListener('pointercancel', (event) => this.handlePointerEnd(event))
    document.querySelectorAll<HTMLElement>('[data-action="start"], [data-action="resume"]').forEach((button) => {
      button.addEventListener('click', () => this.startOrResume())
    })
    document.querySelectorAll<HTMLElement>('[data-action="restart"]').forEach((button) => {
      button.addEventListener('click', () => this.restart())
    })
    document.querySelectorAll<HTMLElement>('[data-action="menu"]').forEach((button) => {
      button.addEventListener('click', () => this.returnToMenu())
    })
    document.querySelector<HTMLElement>('[data-action="pause"]')?.addEventListener('click', () => this.togglePause())
  }

  private renderLevelSelect(): void {
    this.hud.renderLevelSelect(getLevelSummaries(), this.selectedLevelIndex, (levelIndex) => this.selectLevel(levelIndex))
  }

  private selectLevel(levelIndex: number): void {
    this.selectedLevelIndex = clamp(levelIndex, 0, getLevelCount() - 1)
    this.levelIndex = this.selectedLevelIndex
    this.resetRun()
    this.renderLevelSelect()
    this.phase = 'start'
    this.hud.showScreen('start')
    this.updateHud()
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.pressedKeys.add(event.key)

    if (event.code === 'Space') {
      event.preventDefault()
      this.startOrResume()
      return
    }

    if (event.key.toLowerCase() === 'p') {
      this.togglePause()
      return
    }

    if (event.key.toLowerCase() === 'r') {
      this.restart()
    }
  }

  private handlePointerDown(event: PointerEvent): void {
    event.preventDefault()
    this.activePointerId = event.pointerId
    this.pointerStartClientX = event.clientX
    this.pointerStartTargetX = this.targetPaddleX
    this.canvas.setPointerCapture(event.pointerId)

    if (event.pointerType !== 'touch') {
      this.updatePaddleTargetFromAbsolutePointer(event)
    }

    this.startOrResume()
  }

  private handlePointerMove(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      this.updatePaddleTargetFromAbsolutePointer(event)
      return
    }

    if (this.activePointerId !== event.pointerId) {
      return
    }

    const dragSensitivity = 1.35
    const dragOffset = (event.clientX - this.pointerStartClientX) * dragSensitivity
    this.targetPaddleX = clamp(
      this.pointerStartTargetX + dragOffset,
      this.paddle.width / 2,
      this.boardWidth - this.paddle.width / 2,
    )
  }

  private handlePointerEnd(event: PointerEvent): void {
    if (this.activePointerId !== event.pointerId) {
      return
    }

    this.activePointerId = null

    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId)
    }
  }

  private updatePaddleTargetFromAbsolutePointer(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    this.targetPaddleX = clamp(event.clientX - rect.left, this.paddle.width / 2, this.boardWidth - this.paddle.width / 2)
  }

  private updateKeyboardPaddle(deltaSeconds: number): void {
    const movingLeft = this.pressedKeys.has('ArrowLeft') || this.pressedKeys.has('a') || this.pressedKeys.has('A')
    const movingRight = this.pressedKeys.has('ArrowRight') || this.pressedKeys.has('d') || this.pressedKeys.has('D')

    if (movingLeft === movingRight) {
      return
    }

    const direction = movingLeft ? -1 : 1
    this.targetPaddleX = clamp(
      this.targetPaddleX + direction * this.paddle.speed * deltaSeconds,
      this.paddle.width / 2,
      this.boardWidth - this.paddle.width / 2,
    )
  }

  private startOrResume(): void {
    if (this.phase === 'result') {
      this.restart()
      return
    }

    if (this.phase === 'start') {
      this.levelIndex = this.selectedLevelIndex
      this.resetRun()
    }

    this.phase = 'playing'
    this.hud.showScreen('none')
    void this.audio.resume()
  }

  private togglePause(): void {
    if (this.phase === 'start' || this.phase === 'result') {
      return
    }

    if (this.phase === 'paused') {
      this.phase = 'playing'
      this.hud.showScreen('none')
      return
    }

    this.phase = 'paused'
    this.hud.showScreen('pause')
  }

  private restart(): void {
    this.levelIndex = this.selectedLevelIndex
    this.resetRun()
    this.phase = 'playing'
    this.hud.showScreen('none')
    this.hud.showToast('New Run')
  }

  private returnToMenu(): void {
    this.selectedLevelIndex = clamp(this.levelIndex, 0, getLevelCount() - 1)
    this.levelIndex = this.selectedLevelIndex
    this.resetRun()
    this.renderLevelSelect()
    this.phase = 'start'
    this.hud.showScreen('start')
    this.updateHud()
  }

  private resetRun(): void {
    this.score = 0
    this.lives = initialLives
    this.combo = 0
    this.maxCombo = 0
    this.destroyedBrickCount = 0
    this.shieldCharges = 0
    this.loadLevel(this.levelIndex)
  }

  private loadLevel(levelIndex: number): void {
    const levelDefinition = getLevelDefinition(levelIndex)

    this.bricks = createLevelBricks(levelIndex, this.boardWidth)
    this.powerUps = []
    this.levelTimeRemainingSeconds = levelDefinition.timeLimitSeconds ?? null
    this.bossSkillCooldownSeconds = levelDefinition.bossSkillIntervalSeconds ?? 0
    this.paddle = new Paddle({ x: this.boardWidth / 2, y: this.getPaddleY() })
    this.targetPaddleX = this.paddle.position.x
    this.spawnPrimaryBall()
    this.hud.showToast(`${getLevelName(levelIndex)} · ${this.getLevelModeLabel()}`)
  }

  private spawnPrimaryBall(): void {
    const baseBallSpeed = this.getCurrentBaseBallSpeed()

    this.balls = [
      new Ball(
        { x: this.paddle.position.x, y: this.paddle.position.y - 36 },
        { x: baseBallSpeed * 0.42, y: -baseBallSpeed },
      ),
    ]
  }

  private handleWallCollisions(): void {
    for (const ball of this.balls) {
      if (ball.position.x - ball.radius < 0) {
        ball.position.x = ball.radius
        ball.velocity.x = Math.abs(ball.velocity.x)
        this.audio.play('wall', 0.72)
      }

      if (ball.position.x + ball.radius > this.boardWidth) {
        ball.position.x = this.boardWidth - ball.radius
        ball.velocity.x = -Math.abs(ball.velocity.x)
        this.audio.play('wall', 0.72)
      }

      if (ball.position.y - ball.radius < 0) {
        ball.position.y = ball.radius
        ball.velocity.y = Math.abs(ball.velocity.y)
        this.audio.play('wall', 0.72)
      }
    }
  }

  private handlePaddleCollisions(): void {
    for (const ball of this.balls) {
      const collision = resolveCircleRectCollision(ball, this.paddle.rect)

      if (!collision || ball.velocity.y <= 0) {
        continue
      }

      const hitRatio = clamp(
        (ball.position.x - this.paddle.position.x) / (this.paddle.width / 2),
        -1,
        1,
      )
      const speed = clamp(getSpeed(ball.velocity), this.getCurrentBaseBallSpeed(), maxBallSpeed)
      const angle = -Math.PI / 2 + hitRatio * 0.92

      ball.position.y -= collision.penetration + 1
      ball.velocity.x = Math.cos(angle) * speed
      ball.velocity.y = Math.sin(angle) * speed
      this.audio.play('paddle')
    }
  }

  private handleBrickCollisions(): void {
    for (const ball of this.balls) {
      for (const brick of this.bricks) {
        if (!brick.alive) {
          continue
        }

        const collision = resolveCircleRectCollision(ball, brick.rect)

        if (!collision) {
          continue
        }

        const destroyed = brick.hit()

        if (!ball.isFireball || brick.kind === 'steel') {
          ball.position.x += collision.normal.x * collision.penetration
          ball.position.y += collision.normal.y * collision.penetration
          ball.velocity = reflectVelocity(ball.velocity, collision.normal)
        }

        if (destroyed) {
          this.destroyBrick(brick, ball)
        } else {
          this.audio.play('brick', 0.82)
          this.shake = Math.max(this.shake, brick.kind === 'steel' ? 5 : 2)
        }

        return
      }
    }
  }

  private destroyBrick(brick: Brick, ball: Ball): void {
    this.combo += 1
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    this.destroyedBrickCount += 1
    this.score += brick.score * Math.min(8, Math.max(1, this.combo))
    this.particles.burst(brick.center, brick.color, brick.kind === 'explosive' ? 30 : 15)
    this.audio.play(brick.kind === 'explosive' ? 'explosion' : 'brick', 1 + Math.min(1, this.combo * 0.06))
    this.shake = Math.max(this.shake, brick.kind === 'explosive' ? 12 : 4)

    if (brick.kind === 'explosive') {
      this.explodeAround(brick)
    }

    if (Math.random() < getLevelPowerUpDropRate(this.levelIndex)) {
      this.powerUps.push(new PowerUp(pickPowerUp(), brick.center))
    }

    if (this.destroyedBrickCount % speedIncreaseEveryDestroyedBricks === 0) {
      this.increaseBallSpeed(ball)
    }
  }

  private explodeAround(sourceBrick: Brick): void {
    for (const brick of this.bricks) {
      if (!brick.alive || brick.kind === 'steel' || brick.kind === 'boss') {
        continue
      }

      const distance = Math.hypot(brick.center.x - sourceBrick.center.x, brick.center.y - sourceBrick.center.y)

      if (distance > 78 || brick === sourceBrick) {
        continue
      }

      brick.alive = false
      this.score += brick.score
      this.particles.burst(brick.center, brick.color, 10)
    }
  }

  private increaseBallSpeed(ball: Ball): void {
    const nextSpeed = Math.min(maxBallSpeed, getSpeed(ball.velocity) * 1.03)
    ball.velocity = scaleToLength(ball.velocity, nextSpeed)
    this.hud.showToast('Speed Up')
  }

  private updatePowerUps(deltaSeconds: number): void {
    for (const powerUp of this.powerUps) {
      powerUp.update(deltaSeconds)

      const collision = resolveCircleRectCollision(
        { position: powerUp.position, radius: powerUp.size / 2 },
        this.paddle.rect,
      )

      if (collision && powerUp.active) {
        powerUp.active = false
        this.applyPowerUp(powerUp.kind)
        this.score += 100
      }

      if (powerUp.position.y > this.boardHeight + powerUp.size) {
        powerUp.active = false
      }
    }

    this.powerUps = this.powerUps.filter((powerUp) => powerUp.active)
  }

  private applyPowerUp(kind: PowerUpKind): void {
    if (kind === 'multiball') {
      this.applyMultiBall()
    }

    if (kind === 'wide') {
      this.paddle.wideTimer = 15
    }

    if (kind === 'fireball') {
      this.balls.forEach((ball) => {
        ball.fireballTimer = 10
      })
    }

    if (kind === 'shield') {
      this.shieldCharges += 1
    }

    this.audio.play('powerup')
    this.hud.showToast(kind.toUpperCase())
  }

  private applyMultiBall(): void {
    const sourceBall = this.balls[0]

    if (!sourceBall || this.balls.length >= 5) {
      return
    }

    const speed = getSpeed(sourceBall.velocity)
    const angles = [-0.48, 0.48]

    for (const angleOffset of angles) {
      const baseAngle = Math.atan2(sourceBall.velocity.y, sourceBall.velocity.x)
      this.balls.push(
        new Ball(
          { ...sourceBall.position },
          {
            x: Math.cos(baseAngle + angleOffset) * speed,
            y: Math.sin(baseAngle + angleOffset) * speed,
          },
          sourceBall.radius,
        ),
      )
    }
  }

  private removeDroppedBalls(): void {
    const playBottomY = this.getPlayBottomY()

    for (const ball of this.balls) {
      if (ball.position.y - ball.radius <= playBottomY) {
        continue
      }

      if (this.shieldCharges > 0) {
        this.shieldCharges -= 1
        ball.position.y = playBottomY - 22
        ball.velocity.y = -Math.abs(ball.velocity.y)
        this.audio.play('paddle')
        this.hud.showToast('Shield Save')
        continue
      }

      ball.active = false
    }

    this.balls = this.balls.filter((ball) => ball.active)

    if (this.balls.length > 0) {
      return
    }

    this.lives -= 1
    this.combo = 0
    this.audio.play('lose')
    this.shake = 14

    if (this.lives <= 0) {
      this.finish(false)
      return
    }

    this.spawnPrimaryBall()
    this.phase = 'paused'
    this.hud.showScreen('pause')
    this.hud.showToast('Life Lost')
  }

  private checkLevelComplete(): void {
    const hasDestructibleBricks = this.bricks.some((brick) => brick.alive && brick.kind !== 'steel')

    if (hasDestructibleBricks) {
      return
    }

    const timeBonus = this.levelTimeRemainingSeconds === null ? 0 : Math.ceil(this.levelTimeRemainingSeconds) * 20
    this.score += this.lives * 1000 + timeBonus
    this.levelTimeRemainingSeconds = null
    this.levelIndex += 1
    this.selectedLevelIndex = Math.min(this.levelIndex, getLevelCount() - 1)

    if (this.levelIndex >= getLevelCount()) {
      this.levelIndex = getLevelCount() - 1
      this.selectedLevelIndex = this.levelIndex
      this.finish(true)
      return
    }

    this.loadLevel(this.levelIndex)
    this.renderLevelSelect()
  }

  private finish(won: boolean): void {
    this.phase = 'result'
    saveBestScore(this.score)
    this.bestScore = readBestScore()
    this.audio.play(won ? 'win' : 'lose')
    const resultLevelIndex = Math.min(this.levelIndex, getLevelCount() - 1)

    this.hud.showResult({
      won,
      score: this.score,
      bestScore: this.bestScore,
      level: resultLevelIndex + 1,
      mode: this.getLevelModeLabel(resultLevelIndex),
      combo: this.maxCombo,
    })
  }

  private resize(): void {
    this.devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    this.boardWidth = Math.max(320, window.innerWidth)
    this.boardHeight = Math.max(520, window.innerHeight)
    this.canvas.width = Math.floor(this.boardWidth * this.devicePixelRatio)
    this.canvas.height = Math.floor(this.boardHeight * this.devicePixelRatio)
    this.canvas.style.width = `${this.boardWidth}px`
    this.canvas.style.height = `${this.boardHeight}px`
    this.context.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0)
    this.paddle.position.y = this.getPaddleY()
    this.paddle.position.x = clamp(this.paddle.position.x, this.paddle.width / 2, this.boardWidth - this.paddle.width / 2)
    this.targetPaddleX = clamp(this.targetPaddleX, this.paddle.width / 2, this.boardWidth - this.paddle.width / 2)

    if (this.bricks.length > 0) {
      this.bricks = createLevelBricks(this.levelIndex, this.boardWidth)
    }
  }

  private getPlayBottomY(): number {
    const mobileBottomDockHeight = this.boardWidth < 720 ? 184 : 0
    return this.boardHeight - mobileBottomDockHeight
  }

  private getPaddleY(): number {
    const mobileControlDockHeight = this.boardWidth < 720 ? 228 : 68
    return this.boardHeight - mobileControlDockHeight
  }

  private updateHud(): void {
    this.bestScore = Math.max(this.bestScore, this.score)
    const displayLevelIndex = Math.min(this.levelIndex, getLevelCount() - 1)

    this.hud.update({
      score: this.score,
      bestScore: this.bestScore,
      levelLabel: `${displayLevelIndex + 1}/${getLevelCount()}`,
      lives: this.lives,
      mode: this.getLevelModeLabel(displayLevelIndex),
      timerText: this.getTimerText(),
      activePowerUps: this.getActivePowerUps(),
    })
  }

  private updateLevelRules(deltaSeconds: number): void {
    const levelDefinition = getLevelDefinition(this.levelIndex)

    if (this.levelTimeRemainingSeconds !== null) {
      this.levelTimeRemainingSeconds = Math.max(0, this.levelTimeRemainingSeconds - deltaSeconds)

      if (this.levelTimeRemainingSeconds <= 0) {
        this.hud.showToast('Time Up')
        this.finish(false)
        return
      }
    }

    if (levelDefinition.mode !== 'boss' || !this.hasActiveBossBrick()) {
      return
    }

    this.bossSkillCooldownSeconds -= deltaSeconds

    if (this.bossSkillCooldownSeconds > 0) {
      return
    }

    this.triggerBossSkill()
    this.bossSkillCooldownSeconds = levelDefinition.bossSkillIntervalSeconds ?? 8
  }

  private triggerBossSkill(): void {
    const targetSpeedMultiplier = 1.08

    this.balls.forEach((ball) => {
      const nextSpeed = Math.min(maxBallSpeed, getSpeed(ball.velocity) * targetSpeedMultiplier)
      ball.velocity = scaleToLength(ball.velocity, nextSpeed)
    })
    this.shake = Math.max(this.shake, 10)
    this.audio.play('explosion', 0.72)
    this.hud.showToast('Boss Pulse')
  }

  private hasActiveBossBrick(): boolean {
    return this.bricks.some((brick) => brick.alive && brick.kind === 'boss')
  }

  private getCurrentBaseBallSpeed(): number {
    return Math.min(maxBallSpeed, initialBallSpeed * (getLevelDefinition(this.levelIndex).ballSpeedMultiplier ?? 1))
  }

  private getLevelModeLabel(levelIndex = this.levelIndex): string {
    const mode = getLevelDefinition(levelIndex).mode

    if (mode === 'timed') {
      return 'Timed'
    }

    if (mode === 'boss') {
      return 'Boss'
    }

    return 'Classic'
  }

  private getTimerText(): string {
    if (this.levelTimeRemainingSeconds !== null) {
      return `${Math.ceil(this.levelTimeRemainingSeconds)}s`
    }

    if (getLevelDefinition(this.levelIndex).mode === 'boss') {
      return `${Math.ceil(this.bossSkillCooldownSeconds)}s`
    }

    return '∞'
  }

  private getActivePowerUps(): Set<string> {
    const activePowerUps = new Set<string>()

    if (this.balls.length > 1) {
      activePowerUps.add('multiball')
    }

    if (this.paddle.wideTimer > 0) {
      activePowerUps.add('wide')
    }

    if (this.balls.some((ball) => ball.isFireball)) {
      activePowerUps.add('fireball')
    }

    if (this.shieldCharges > 0) {
      activePowerUps.add('shield')
    }

    return activePowerUps
  }
}
