import type { Ball } from '../entities/ball'
import type { Brick } from '../entities/brick'
import type { Paddle } from '../entities/paddle'
import type { PowerUp } from '../entities/powerup'
import type { ParticleSystem } from './particles'

export interface RenderFrame {
  balls: Ball[]
  bricks: Brick[]
  paddle: Paddle
  powerUps: PowerUp[]
  particles: ParticleSystem
  score: number
  combo: number
  shieldActive: boolean
  shake: number
}

export class Renderer {
  private readonly context: CanvasRenderingContext2D

  public constructor(context: CanvasRenderingContext2D) {
    this.context = context
  }

  public draw(frame: RenderFrame): void {
    const width = this.context.canvas.clientWidth
    const height = this.context.canvas.clientHeight

    this.context.clearRect(0, 0, width, height)
    this.drawBackground(width, height)

    this.context.save()

    if (frame.shake > 0) {
      this.context.translate(
        (Math.random() - 0.5) * frame.shake,
        (Math.random() - 0.5) * frame.shake,
      )
    }

    this.drawBricks(frame.bricks)
    this.drawPowerUps(frame.powerUps)
    this.drawPaddle(frame.paddle)
    this.drawShield(width, height, frame.shieldActive)
    this.drawBallTrails(frame.balls)
    this.drawBalls(frame.balls)
    frame.particles.draw(this.context)
    this.drawComboGhost(width, frame.score, frame.combo)
    this.context.restore()
  }

  private drawBackground(width: number, height: number): void {
    const gradient = this.context.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#080A1F')
    gradient.addColorStop(0.5, '#15122E')
    gradient.addColorStop(1, '#2A1435')

    this.context.fillStyle = gradient
    this.context.fillRect(0, 0, width, height)

    this.context.save()
    this.context.globalAlpha = 0.14
    this.context.strokeStyle = '#7CDBFF'
    this.context.lineWidth = 1

    for (let x = 0; x <= width; x += 42) {
      this.context.beginPath()
      this.context.moveTo(x, 0)
      this.context.lineTo(x, height)
      this.context.stroke()
    }

    for (let y = 0; y <= height; y += 42) {
      this.context.beginPath()
      this.context.moveTo(0, y)
      this.context.lineTo(width, y)
      this.context.stroke()
    }

    this.context.restore()
  }

  private drawBricks(bricks: Brick[]): void {
    for (const brick of bricks) {
      if (!brick.alive) {
        continue
      }

      this.drawBrick(brick)
    }
  }

  private drawBrick(brick: Brick): void {
    const radius = 9
    const rect = brick.rect
    const flashAlpha = brick.flash * 0.65
    const healthRatio = Number.isFinite(brick.maxHealth) ? brick.health / brick.maxHealth : 1
    const color = brick.kind === 'steel' ? '#A8B0C2' : brick.color
    const gradient = this.context.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height)

    gradient.addColorStop(0, lighten(color, brick.kind === 'steel' ? 0.32 : 0.22))
    gradient.addColorStop(1, darken(color, brick.kind === 'steel' ? 0.32 : 0.18))

    this.context.save()
    this.context.shadowColor = brick.kind === 'steel' ? 'rgba(180, 190, 210, 0.34)' : color
    this.context.shadowBlur = brick.kind === 'steel' ? 6 : 12
    this.context.fillStyle = gradient
    roundRect(this.context, rect.x, rect.y, rect.width, rect.height, radius)
    this.context.fill()

    this.context.shadowBlur = 0
    this.context.strokeStyle = 'rgba(255, 255, 255, 0.26)'
    this.context.lineWidth = 1
    this.context.stroke()

    if (brick.kind === 'reinforced' || brick.kind === 'boss') {
      this.context.fillStyle = `rgba(255, 255, 255, ${0.12 + (1 - healthRatio) * 0.18})`
      roundRect(
        this.context,
        rect.x + 7,
        rect.y + rect.height * 0.56,
        rect.width * Math.max(0.16, healthRatio) - 14,
        4,
        3,
      )
      this.context.fill()
    }

    if (brick.kind === 'steel') {
      this.context.fillStyle = 'rgba(255, 255, 255, 0.2)'
      this.context.fillRect(rect.x + 8, rect.y + 7, rect.width - 16, 2)
    }

    if (brick.kind === 'explosive') {
      this.context.fillStyle = 'rgba(255, 255, 255, 0.82)'
      this.context.font = '700 12px system-ui, sans-serif'
      this.context.textAlign = 'center'
      this.context.textBaseline = 'middle'
      this.context.fillText('×', rect.x + rect.width / 2, rect.y + rect.height / 2)
    }

    if (flashAlpha > 0) {
      this.context.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`
      roundRect(this.context, rect.x, rect.y, rect.width, rect.height, radius)
      this.context.fill()
    }

    this.context.restore()
  }

  private drawPowerUps(powerUps: PowerUp[]): void {
    for (const powerUp of powerUps) {
      if (!powerUp.active) {
        continue
      }

      const label = powerUp.kind === 'multiball' ? 'M' : powerUp.kind === 'wide' ? 'W' : powerUp.kind === 'fireball' ? 'F' : 'S'
      const color = powerUp.kind === 'fireball' ? '#FF6B35' : powerUp.kind === 'shield' ? '#48BB78' : '#7CDBFF'

      this.context.save()
      this.context.shadowColor = color
      this.context.shadowBlur = 18
      this.context.fillStyle = color
      this.context.beginPath()
      this.context.arc(powerUp.position.x, powerUp.position.y, powerUp.size / 2, 0, Math.PI * 2)
      this.context.fill()
      this.context.shadowBlur = 0
      this.context.fillStyle = '#07101F'
      this.context.font = '800 13px system-ui, sans-serif'
      this.context.textAlign = 'center'
      this.context.textBaseline = 'middle'
      this.context.fillText(label, powerUp.position.x, powerUp.position.y + 0.5)
      this.context.restore()
    }
  }

  private drawPaddle(paddle: Paddle): void {
    const rect = paddle.rect
    const gradient = this.context.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.72)')
    gradient.addColorStop(0.5, 'rgba(124, 219, 255, 0.58)')
    gradient.addColorStop(1, 'rgba(255, 113, 206, 0.52)')

    this.context.save()
    this.context.shadowColor = 'rgba(124, 219, 255, 0.62)'
    this.context.shadowBlur = 24
    this.context.fillStyle = gradient
    roundRect(this.context, rect.x, rect.y, rect.width, rect.height, rect.height / 2)
    this.context.fill()
    this.context.strokeStyle = 'rgba(255, 255, 255, 0.78)'
    this.context.lineWidth = 1.5
    this.context.stroke()
    this.context.restore()
  }

  private drawShield(width: number, height: number, shieldActive: boolean): void {
    if (!shieldActive) {
      return
    }

    this.context.save()
    this.context.globalCompositeOperation = 'lighter'
    this.context.strokeStyle = 'rgba(72, 187, 120, 0.86)'
    this.context.shadowColor = '#48BB78'
    this.context.shadowBlur = 18
    this.context.lineWidth = 4
    this.context.beginPath()
    this.context.moveTo(28, height - 34)
    this.context.lineTo(width - 28, height - 34)
    this.context.stroke()
    this.context.restore()
  }

  private drawBallTrails(balls: Ball[]): void {
    this.context.save()
    this.context.globalCompositeOperation = 'lighter'

    for (const ball of balls) {
      ball.trail.forEach((position, index) => {
        const alpha = Math.max(0, 1 - index / ball.trail.length) * 0.26
        this.context.fillStyle = ball.isFireball
          ? `rgba(255, 107, 53, ${alpha})`
          : `rgba(124, 219, 255, ${alpha})`
        this.context.beginPath()
        this.context.arc(position.x, position.y, ball.radius * (1.3 - index / ball.trail.length), 0, Math.PI * 2)
        this.context.fill()
      })
    }

    this.context.restore()
  }

  private drawBalls(balls: Ball[]): void {
    for (const ball of balls) {
      const color = ball.isFireball ? '#FF6B35' : '#FFFFFF'
      const glow = ball.isFireball ? '#FF3B3B' : '#7CDBFF'

      this.context.save()
      this.context.globalCompositeOperation = 'lighter'
      this.context.shadowColor = glow
      this.context.shadowBlur = 28
      this.context.fillStyle = color
      this.context.beginPath()
      this.context.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2)
      this.context.fill()
      this.context.restore()
    }
  }

  private drawComboGhost(width: number, score: number, combo: number): void {
    this.context.save()
    this.context.globalAlpha = 0.06
    this.context.fillStyle = '#FFFFFF'
    this.context.font = '900 86px system-ui, sans-serif'
    this.context.textAlign = 'right'
    this.context.fillText(`${score} · x${Math.max(1, combo)}`, width - 26, 120)
    this.context.restore()
  }
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

function lighten(hexColor: string, amount: number): string {
  return shade(hexColor, amount)
}

function darken(hexColor: string, amount: number): string {
  return shade(hexColor, -amount)
}

function shade(hexColor: string, amount: number): string {
  const normalized = hexColor.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  const nextRed = Math.round(red + (amount > 0 ? 255 - red : red) * amount)
  const nextGreen = Math.round(green + (amount > 0 ? 255 - green : green) * amount)
  const nextBlue = Math.round(blue + (amount > 0 ? 255 - blue : blue) * amount)

  return `rgb(${nextRed}, ${nextGreen}, ${nextBlue})`
}
