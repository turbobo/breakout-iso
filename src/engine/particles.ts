import type { Vector2 } from './math'
import { randomBetween } from './math'

export interface Particle {
  position: Vector2
  velocity: Vector2
  radius: number
  color: string
  life: number
  maxLife: number
}

export class ParticleSystem {
  private readonly particles: Particle[] = []
  private readonly maxParticles = 500

  public burst(position: Vector2, color: string, amount: number): void {
    const remainingCapacity = this.maxParticles - this.particles.length
    if (remainingCapacity <= 0) return

    const actualAmount = Math.min(amount, remainingCapacity)
    for (let particleIndex = 0; particleIndex < actualAmount; particleIndex += 1) {
      this.particles.push({
        position: { ...position },
        velocity: {
          x: randomBetween(-260, 260),
          y: randomBetween(-260, 180),
        },
        radius: randomBetween(2, 6),
        color,
        life: randomBetween(0.32, 0.8),
        maxLife: randomBetween(0.42, 0.9),
      })
    }
  }

  public update(deltaSeconds: number): void {
    let activeParticleCount = 0

    for (const particle of this.particles) {
      particle.position.x += particle.velocity.x * deltaSeconds
      particle.position.y += particle.velocity.y * deltaSeconds
      particle.velocity.y += 420 * deltaSeconds
      particle.life -= deltaSeconds

      if (particle.life > 0) {
        this.particles[activeParticleCount] = particle
        activeParticleCount += 1
      }
    }

    this.particles.length = activeParticleCount
  }

  public hasActiveParticles(): boolean {
    return this.particles.length > 0
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.save()
    context.globalCompositeOperation = 'lighter'

    for (const particle of this.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife)
      context.globalAlpha = alpha
      context.fillStyle = particle.color
      context.shadowColor = particle.color
      context.shadowBlur = 14
      context.beginPath()
      context.arc(particle.position.x, particle.position.y, particle.radius, 0, Math.PI * 2)
      context.fill()
    }

    context.restore()
  }
}
