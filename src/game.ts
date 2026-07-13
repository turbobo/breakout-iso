import { SynthAudio } from './audio/synth'
import { Ball } from './entities/ball'
import { isBossBrick, isDestructibleBrick, isSteelBrick, type Brick } from './entities/brick'
import { Paddle } from './entities/paddle'
import { PowerUp, pickPowerUp, type PowerUpKind } from './entities/powerup'
import {
  clamp,
  clampPaddleCenterX,
  getSpeed,
  reflectVelocity,
  resolveCircleRectCollision,
  resolveSweptCircleTopRectCollision,
  scaleToLength,
} from './engine/math'
import { ParticleSystem } from './engine/particles'
import { Renderer } from './engine/renderer'
import { readBestScore, saveBestScore } from './engine/storage'
import {
  createLevelBricks,
  getLevelChanceCount,
  getLevelCount,
  getLevelDefinition,
  getLevelName,
  getLevelPowerUpDropRate,
  getLevelSummaries,
} from './levels/level-data'
import { HudController } from './ui/hud'

type GamePhase = 'start' | 'playing' | 'transition' | 'paused' | 'result'
type HudScreen = 'start' | 'transition' | 'pause' | 'result' | 'none'

const gameConfig = {
  initialBallSpeed: 430,
  maxBallSpeed: 760,
  speedIncreaseEveryDestroyedBricks: 8,
  initialPaddleX: 480,
  initialPaddleY: 590,
  initialBallSpawnOffsetY: 36,
  initialBallVelocityRatioX: 0.42,
  paddleHitAngleRange: 0.92,
  maxComboMultiplier: 8,
  explosiveBlastRadius: 78,
  ballSpeedIncreaseMultiplier: 1.03,
  maxBalls: 5,
  multiBallAngleOffsets: [-0.48, 0.48],
  widePowerUpDurationSeconds: 15,
  fireballPowerUpDurationSeconds: 10,
  shieldBounceOffsetY: 22,
  maxDevicePixelRatio: 2,
  minBoardWidth: 320,
  minBoardHeight: 520,
  mobileBreakpoint: 720,
  mobileBottomDockHeight: 212,
  desktopBottomDockHeight: 144,
  mobileControlDockHeight: 252,
  desktopControlDockHeight: 144,
  bossPulseSpeedMultiplier: 1.08,
  defaultBossSkillIntervalSeconds: 8,
  brickCollisionCellSize: 96,
} as const

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
  private paddle = new Paddle({ x: gameConfig.initialPaddleX, y: gameConfig.initialPaddleY })
  private targetPaddleX: number = gameConfig.initialPaddleX
  private lastFrameTime = 0
  private score = 0
  private bestScore = readBestScore()
  private lives = getLevelChanceCount(0)
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
  private animationFrameId: number | null = null
  private disposed = false
  private readonly eventCleanups: Array<() => void> = []
  private readonly brickCollisionBuckets = new Map<number, Brick[]>()
  private readonly brickCollisionCandidates: Brick[] = []
  private brickCollisionBucketColumnCount = 1

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
    this.setPhase('start')
    this.updateHud()
  }

  public start(): void {
    if (this.disposed || this.animationFrameId !== null) {
      return
    }

    this.lastFrameTime = performance.now()
    this.animationFrameId = window.requestAnimationFrame((time) => this.tick(time))
  }

  public dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true

    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    if (this.activePointerId !== null && this.canvas.hasPointerCapture(this.activePointerId)) {
      this.canvas.releasePointerCapture(this.activePointerId)
    }

    this.activePointerId = null
    this.pressedKeys.clear()
    this.eventCleanups.splice(0).forEach((cleanup) => cleanup())
    this.audio.dispose()
  }

  private tick(currentTime: number): void {
    if (this.disposed) {
      this.animationFrameId = null
      return
    }

    const deltaSeconds = Math.min(1 / 30, (currentTime - this.lastFrameTime) / 1000)
    this.lastFrameTime = currentTime

    if (this.phase === 'playing') {
      this.update(deltaSeconds)
    }

    this.draw()

    if (!this.disposed) {
      this.animationFrameId = window.requestAnimationFrame((time) => this.tick(time))
    } else {
      this.animationFrameId = null
    }
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
    const handleResize = (): void => this.resize()
    const handleKeyDown = (event: KeyboardEvent): void => this.handleKeyDown(event)
    const handleKeyUp = (event: KeyboardEvent): void => {
      this.pressedKeys.delete(event.key)
    }
    const handlePointerDown = (event: PointerEvent): void => this.handlePointerDown(event)
    const handlePointerMove = (event: PointerEvent): void => this.handlePointerMove(event)
    const handlePointerEnd = (event: PointerEvent): void => this.handlePointerEnd(event)

    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    this.canvas.addEventListener('pointerdown', handlePointerDown)
    this.canvas.addEventListener('pointermove', handlePointerMove)
    this.canvas.addEventListener('pointerup', handlePointerEnd)
    this.canvas.addEventListener('pointercancel', handlePointerEnd)

    this.eventCleanups.push(
      () => window.removeEventListener('resize', handleResize),
      () => window.removeEventListener('keydown', handleKeyDown),
      () => window.removeEventListener('keyup', handleKeyUp),
      () => this.canvas.removeEventListener('pointerdown', handlePointerDown),
      () => this.canvas.removeEventListener('pointermove', handlePointerMove),
      () => this.canvas.removeEventListener('pointerup', handlePointerEnd),
      () => this.canvas.removeEventListener('pointercancel', handlePointerEnd),
    )

    this.registerActionHandlers('[data-action="start"], [data-action="resume"]', () => this.startOrResume())
    this.registerActionHandlers('[data-action="restart"]', () => this.restart())
    this.registerActionHandlers('[data-action="menu"]', () => this.returnToMenu())
    this.registerActionHandler('[data-action="next-level"]', () => this.continueToNextLevel())
    this.registerActionHandler('[data-action="pause"]', () => this.togglePause())
  }

  private registerActionHandlers(selector: string, listener: () => void): void {
    document.querySelectorAll<HTMLElement>(selector).forEach((button) => {
      button.addEventListener('click', listener)
      this.eventCleanups.push(() => button.removeEventListener('click', listener))
    })
  }

  private registerActionHandler(selector: string, listener: () => void): void {
    const button = document.querySelector<HTMLElement>(selector)

    if (!button) {
      return
    }

    button.addEventListener('click', listener)
    this.eventCleanups.push(() => button.removeEventListener('click', listener))
  }

  private renderLevelSelect(): void {
    this.hud.renderLevelSelect(getLevelSummaries(), this.selectedLevelIndex, (levelIndex) => this.selectLevel(levelIndex))
  }

  private setPhase(nextPhase: GamePhase): void {
    this.phase = nextPhase
    this.hud.showScreen(this.getHudScreen(nextPhase))
  }

  private getHudScreen(phase: GamePhase): HudScreen {
    if (phase === 'start' || phase === 'transition' || phase === 'result') {
      return phase
    }

    if (phase === 'paused') {
      return 'pause'
    }

    return 'none'
  }

  private selectLevel(levelIndex: number): void {
    this.selectedLevelIndex = clamp(levelIndex, 0, getLevelCount() - 1)
    this.levelIndex = this.selectedLevelIndex
    this.resetRun()
    this.renderLevelSelect()
    this.setPhase('start')
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
    this.targetPaddleX = clampPaddleCenterX(
      this.pointerStartTargetX + dragOffset,
      this.paddle.width,
      this.boardWidth,
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
    this.targetPaddleX = clampPaddleCenterX(event.clientX - rect.left, this.paddle.width, this.boardWidth)
  }

  private updateKeyboardPaddle(deltaSeconds: number): void {
    const movingLeft = this.pressedKeys.has('ArrowLeft') || this.pressedKeys.has('a') || this.pressedKeys.has('A')
    const movingRight = this.pressedKeys.has('ArrowRight') || this.pressedKeys.has('d') || this.pressedKeys.has('D')

    if (movingLeft === movingRight) {
      return
    }

    const direction = movingLeft ? -1 : 1
    this.targetPaddleX = clampPaddleCenterX(
      this.targetPaddleX + direction * this.paddle.speed * deltaSeconds,
      this.paddle.width,
      this.boardWidth,
    )
  }

  private startOrResume(): void {
    if (this.phase === 'result') {
      this.restart()
      return
    }

    if (this.phase === 'transition') {
      this.continueToNextLevel()
      return
    }

    if (this.phase === 'start') {
      this.levelIndex = this.selectedLevelIndex
      this.resetRun()
    }

    this.setPhase('playing')
    this.resumeAudio()
  }

  private resumeAudio(): void {
    void this.audio.resume().catch(() => {
      // SynthAudio 已统一记录错误，这里只吞掉启动链路中的异步失败。
    })
  }

  private continueToNextLevel(): void {
    if (this.phase !== 'transition') {
      return
    }

    this.loadLevel(this.levelIndex)
    this.renderLevelSelect()
    this.setPhase('playing')
    this.resumeAudio()
    this.updateHud()
  }

  private togglePause(): void {
    if (this.phase === 'start' || this.phase === 'transition' || this.phase === 'result') {
      return
    }

    if (this.phase === 'paused') {
      this.setPhase('playing')
      return
    }

    this.setPhase('paused')
  }

  private restart(): void {
    this.levelIndex = this.selectedLevelIndex
    this.resetRun()
    this.setPhase('playing')
    this.hud.showToast('新的挑战开始')
  }

  private returnToMenu(): void {
    this.selectedLevelIndex = clamp(this.levelIndex, 0, getLevelCount() - 1)
    this.levelIndex = this.selectedLevelIndex
    this.resetRun()
    this.renderLevelSelect()
    this.setPhase('start')
    this.updateHud()
  }

  private resetRun(): void {
    this.score = 0
    this.combo = 0
    this.maxCombo = 0
    this.destroyedBrickCount = 0
    this.shieldCharges = 0
    this.loadLevel(this.levelIndex)
  }

  private loadLevel(levelIndex: number): void {
    const levelDefinition = getLevelDefinition(levelIndex)

    this.bricks = createLevelBricks(levelIndex, this.boardWidth)
    this.rebuildBrickCollisionBuckets()
    this.powerUps = []
    this.lives = getLevelChanceCount(levelIndex)
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
        { x: this.paddle.position.x, y: this.paddle.position.y - gameConfig.initialBallSpawnOffsetY },
        { x: baseBallSpeed * gameConfig.initialBallVelocityRatioX, y: -baseBallSpeed },
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
      if (ball.velocity.y <= 0) {
        continue
      }

      const paddleRect = this.paddle.rect
      const collision = resolveCircleRectCollision(ball, paddleRect)
      const sweptCollision = collision
        ? null
        : resolveSweptCircleTopRectCollision(ball.previousPosition, ball.position, ball.radius, paddleRect)

      if (!collision && !sweptCollision) {
        continue
      }

      const impactX = sweptCollision?.hitPosition.x ?? ball.position.x
      const hitRatio = clamp(
        (impactX - this.paddle.position.x) / (this.paddle.width / 2),
        -1,
        1,
      )
      const speed = clamp(getSpeed(ball.velocity), this.getCurrentBaseBallSpeed(), gameConfig.maxBallSpeed)
      const angle = -Math.PI / 2 + hitRatio * gameConfig.paddleHitAngleRange

      ball.position.x = impactX
      ball.position.y = sweptCollision?.hitPosition.y ?? ball.position.y - collision!.penetration - 1
      ball.velocity.x = Math.cos(angle) * speed
      ball.velocity.y = Math.sin(angle) * speed
      this.audio.play('paddle')
    }
  }

  private handleBrickCollisions(): void {
    for (const ball of this.balls) {
      const candidateBricks = this.collectBrickCollisionCandidates(ball)

      for (const brick of candidateBricks) {
        const collision = resolveCircleRectCollision(ball, brick.rect)

        if (!collision) {
          continue
        }

        const destroyed = brick.hit()

        if (!ball.isFireball || isSteelBrick(brick)) {
          ball.position.x += collision.normal.x * collision.penetration
          ball.position.y += collision.normal.y * collision.penetration
          ball.velocity = reflectVelocity(ball.velocity, collision.normal)
        }

        if (destroyed) {
          this.destroyBrick(brick, ball)
        } else if (isBossBrick(brick)) {
          this.hitBossBrick(brick)
        } else {
          this.audio.play('brick', 0.82)
          this.shake = Math.max(this.shake, isSteelBrick(brick) ? 5 : 2)
        }

        break
      }
    }
  }

  private collectBrickCollisionCandidates(ball: Ball): Brick[] {
    this.brickCollisionCandidates.length = 0

    const minColumn = Math.max(0, Math.floor((ball.position.x - ball.radius) / gameConfig.brickCollisionCellSize))
    const maxColumn = Math.min(
      this.brickCollisionBucketColumnCount - 1,
      Math.floor((ball.position.x + ball.radius) / gameConfig.brickCollisionCellSize),
    )
    const minRow = Math.max(0, Math.floor((ball.position.y - ball.radius) / gameConfig.brickCollisionCellSize))
    const maxRow = Math.max(minRow, Math.floor((ball.position.y + ball.radius) / gameConfig.brickCollisionCellSize))

    for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex += 1) {
      for (let columnIndex = minColumn; columnIndex <= maxColumn; columnIndex += 1) {
        const bucket = this.brickCollisionBuckets.get(this.getBrickCollisionBucketKey(columnIndex, rowIndex))

        if (!bucket) {
          continue
        }

        for (const brick of bucket) {
          if (!brick.alive || this.brickCollisionCandidates.includes(brick)) {
            continue
          }

          this.brickCollisionCandidates.push(brick)
        }
      }
    }

    return this.brickCollisionCandidates
  }

  private rebuildBrickCollisionBuckets(): void {
    this.brickCollisionBuckets.clear()
    this.brickCollisionBucketColumnCount = Math.max(
      1,
      Math.ceil(this.boardWidth / gameConfig.brickCollisionCellSize),
    )

    for (const brick of this.bricks) {
      const rect = brick.rect
      const minColumn = Math.max(0, Math.floor(rect.x / gameConfig.brickCollisionCellSize))
      const maxColumn = Math.min(
        this.brickCollisionBucketColumnCount - 1,
        Math.floor((rect.x + rect.width) / gameConfig.brickCollisionCellSize),
      )
      const minRow = Math.max(0, Math.floor(rect.y / gameConfig.brickCollisionCellSize))
      const maxRow = Math.max(minRow, Math.floor((rect.y + rect.height) / gameConfig.brickCollisionCellSize))

      for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex += 1) {
        for (let columnIndex = minColumn; columnIndex <= maxColumn; columnIndex += 1) {
          const bucketKey = this.getBrickCollisionBucketKey(columnIndex, rowIndex)
          const bucket = this.brickCollisionBuckets.get(bucketKey)

          if (bucket) {
            bucket.push(brick)
            continue
          }

          this.brickCollisionBuckets.set(bucketKey, [brick])
        }
      }
    }
  }

  private getBrickCollisionBucketKey(columnIndex: number, rowIndex: number): number {
    return rowIndex * this.brickCollisionBucketColumnCount + columnIndex
  }

  private hitBossBrick(brick: Brick): void {
    this.audio.play('explosion', 0.34)
    this.shake = Math.max(this.shake, 7)
    this.particles.burst(brick.center, brick.color, 12)
    this.hud.showToast(`首领血量 ${brick.health}/${brick.maxHealth}`)
  }

  private destroyBrick(brick: Brick, ball: Ball): void {
    this.combo += 1
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    this.destroyedBrickCount += 1
    this.score += brick.score * Math.min(gameConfig.maxComboMultiplier, Math.max(1, this.combo))
    this.particles.burst(brick.center, brick.color, brick.kind === 'explosive' ? 30 : 15)
    this.audio.play(brick.kind === 'explosive' ? 'explosion' : 'brick', 1 + Math.min(1, this.combo * 0.06))
    this.shake = Math.max(this.shake, brick.kind === 'explosive' ? 12 : 4)

    brick.alive = false
    this.removeFromCollisionBuckets(brick)

    if (brick.kind === 'explosive') {
      this.explodeAround(brick)
    }

    if (Math.random() < getLevelPowerUpDropRate(this.levelIndex)) {
      this.powerUps.push(new PowerUp(pickPowerUp(), brick.center))
    }

    if (this.destroyedBrickCount % gameConfig.speedIncreaseEveryDestroyedBricks === 0) {
      this.increaseBallSpeed(ball)
    }
  }

  private removeFromCollisionBuckets(brick: Brick): void {
    const rect = brick.rect
    const minColumn = Math.max(0, Math.floor(rect.x / gameConfig.brickCollisionCellSize))
    const maxColumn = Math.min(
      this.brickCollisionBucketColumnCount - 1,
      Math.floor((rect.x + rect.width) / gameConfig.brickCollisionCellSize),
    )
    const minRow = Math.max(0, Math.floor(rect.y / gameConfig.brickCollisionCellSize))
    const maxRow = Math.max(minRow, Math.floor((rect.y + rect.height) / gameConfig.brickCollisionCellSize))

    for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex += 1) {
      for (let columnIndex = minColumn; columnIndex <= maxColumn; columnIndex += 1) {
        const bucketKey = this.getBrickCollisionBucketKey(columnIndex, rowIndex)
        const bucket = this.brickCollisionBuckets.get(bucketKey)
        if (bucket) {
          const index = bucket.indexOf(brick)
          if (index !== -1) bucket.splice(index, 1)
        }
      }
    }
  }

  private explodeAround(sourceBrick: Brick): void {
    for (const brick of this.bricks) {
      if (!brick.alive || isSteelBrick(brick) || isBossBrick(brick)) {
        continue
      }

      const distance = Math.hypot(brick.center.x - sourceBrick.center.x, brick.center.y - sourceBrick.center.y)

      if (distance > gameConfig.explosiveBlastRadius || brick === sourceBrick) {
        continue
      }

      brick.alive = false
      this.score += brick.score
      this.particles.burst(brick.center, brick.color, 10)
    }
  }

  private increaseBallSpeed(ball: Ball): void {
    const nextSpeed = Math.min(gameConfig.maxBallSpeed, getSpeed(ball.velocity) * gameConfig.ballSpeedIncreaseMultiplier)
    ball.velocity = scaleToLength(ball.velocity, nextSpeed)
    this.hud.showToast('速度提升')
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
      this.paddle.wideTimer = gameConfig.widePowerUpDurationSeconds
    }

    if (kind === 'fireball') {
      this.balls.forEach((ball) => {
        ball.fireballTimer = gameConfig.fireballPowerUpDurationSeconds
      })
    }

    if (kind === 'shield') {
      this.shieldCharges += 1
    }

    this.audio.play('powerup')
    this.hud.showToast(getPowerUpLabel(kind))
  }

  private applyMultiBall(): void {
    const sourceBall = this.balls[0]

    if (!sourceBall || this.balls.length >= gameConfig.maxBalls) {
      return
    }

    const speed = getSpeed(sourceBall.velocity)

    for (const angleOffset of gameConfig.multiBallAngleOffsets) {
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
        ball.position.y = playBottomY - gameConfig.shieldBounceOffsetY
        ball.velocity.y = -Math.abs(ball.velocity.y)
        this.audio.play('paddle')
        this.hud.showToast('护盾抵挡')
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
    this.setPhase('paused')
    this.hud.showToast('失去一次机会')
  }

  private checkLevelComplete(): void {
    const hasDestructibleBricks = this.bricks.some((brick) => brick.alive && isDestructibleBrick(brick))

    if (hasDestructibleBricks) {
      return
    }

    const lifeBonus = this.lives * 1000
    const timeBonus = this.levelTimeRemainingSeconds === null ? 0 : Math.ceil(this.levelTimeRemainingSeconds) * 20
    const bonusScore = lifeBonus + timeBonus
    const completedLevelIndex = this.levelIndex
    const nextLevelIndex = completedLevelIndex + 1

    this.score += bonusScore
    this.levelTimeRemainingSeconds = null

    if (nextLevelIndex >= getLevelCount()) {
      this.levelIndex = getLevelCount() - 1
      this.selectedLevelIndex = this.levelIndex
      this.finish(true)
      return
    }

    this.levelIndex = nextLevelIndex
    this.selectedLevelIndex = nextLevelIndex
    this.audio.play('win', 0.68)
    this.renderLevelSelect()

    const nextLevelDefinition = getLevelDefinition(nextLevelIndex)

    this.hud.showLevelTransition({
      completedLevel: completedLevelIndex + 1,
      nextLevel: nextLevelIndex + 1,
      nextName: getLevelName(nextLevelIndex),
      nextMode: nextLevelDefinition.mode,
      nextDescription: nextLevelDefinition.description,
      nextChanceCount: getLevelChanceCount(nextLevelIndex),
      bonusScore,
    })
    this.setPhase('transition')
  }

  private finish(won: boolean): void {
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
    this.setPhase('result')
  }

  private resize(): void {
    this.devicePixelRatio = Math.min(window.devicePixelRatio || 1, gameConfig.maxDevicePixelRatio)
    this.boardWidth = Math.max(gameConfig.minBoardWidth, window.innerWidth)
    this.boardHeight = Math.max(gameConfig.minBoardHeight, window.innerHeight)
    this.canvas.width = Math.floor(this.boardWidth * this.devicePixelRatio)
    this.canvas.height = Math.floor(this.boardHeight * this.devicePixelRatio)
    this.canvas.style.width = `${this.boardWidth}px`
    this.canvas.style.height = `${this.boardHeight}px`
    this.context.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0)
    this.paddle.position.y = this.getPaddleY()
    this.paddle.position.x = clampPaddleCenterX(this.paddle.position.x, this.paddle.width, this.boardWidth)
    this.targetPaddleX = clampPaddleCenterX(this.targetPaddleX, this.paddle.width, this.boardWidth)

    if (this.bricks.length > 0) {
      const resizedBricks = createLevelBricks(this.levelIndex, this.boardWidth)

      resizedBricks.forEach((resizedBrick, brickIndex) => {
        const previousBrick = this.bricks[brickIndex]

        if (!previousBrick || previousBrick.kind !== resizedBrick.kind) {
          return
        }

        resizedBrick.alive = previousBrick.alive
        resizedBrick.health = Math.min(previousBrick.health, resizedBrick.maxHealth)
        resizedBrick.flash = previousBrick.flash
      })

      this.bricks = resizedBricks
      this.rebuildBrickCollisionBuckets()
    }
  }

  private getPlayBottomY(): number {
    const mobileBottomDockHeight = this.boardWidth < gameConfig.mobileBreakpoint
      ? gameConfig.mobileBottomDockHeight
      : gameConfig.desktopBottomDockHeight
    return this.boardHeight - mobileBottomDockHeight
  }

  private getPaddleY(): number {
    const mobileControlDockHeight = this.boardWidth < gameConfig.mobileBreakpoint
      ? gameConfig.mobileControlDockHeight
      : gameConfig.desktopControlDockHeight
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
        this.hud.showToast('时间到')
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
    this.bossSkillCooldownSeconds = levelDefinition.bossSkillIntervalSeconds ?? gameConfig.defaultBossSkillIntervalSeconds
  }

  private triggerBossSkill(): void {
    this.balls.forEach((ball) => {
      const nextSpeed = Math.min(gameConfig.maxBallSpeed, getSpeed(ball.velocity) * gameConfig.bossPulseSpeedMultiplier)
      ball.velocity = scaleToLength(ball.velocity, nextSpeed)
    })
    this.shake = Math.max(this.shake, 10)
    this.audio.play('explosion', 0.72)
    this.hud.showToast('首领脉冲')
  }

  private hasActiveBossBrick(): boolean {
    return this.bricks.some((brick) => brick.alive && isBossBrick(brick))
  }

  private getCurrentBaseBallSpeed(): number {
    return Math.min(
      gameConfig.maxBallSpeed,
      gameConfig.initialBallSpeed * (getLevelDefinition(this.levelIndex).ballSpeedMultiplier ?? 1),
    )
  }

  private getLevelModeLabel(levelIndex = this.levelIndex): string {
    const mode = getLevelDefinition(levelIndex).mode

    if (mode === 'timed') {
      return '限时'
    }

    if (mode === 'boss') {
      return '首领'
    }

    return '常规'
  }

  private getTimerText(): string {
    if (this.levelTimeRemainingSeconds !== null) {
      return `${Math.ceil(this.levelTimeRemainingSeconds)} 秒`
    }

    if (getLevelDefinition(this.levelIndex).mode === 'boss') {
      return `${Math.ceil(this.bossSkillCooldownSeconds)} 秒`
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

function getPowerUpLabel(kind: PowerUpKind): string {
  if (kind === 'multiball') {
    return '多球道具'
  }

  if (kind === 'wide') {
    return '挡板加宽'
  }

  if (kind === 'fireball') {
    return '火球道具'
  }

  return '护盾道具'
}
