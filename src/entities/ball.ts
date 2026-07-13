import type { Vector2 } from '../engine/math'

export class Ball {
  public position: Vector2
  public velocity: Vector2
  public radius: number
  public active = true
  public fireballTimer = 0
  public trail: Vector2[] = []

  public constructor(position: Vector2, velocity: Vector2, radius = 8) {
    this.position = { ...position }
    this.velocity = { ...velocity }
    this.radius = radius
  }

  public update(deltaSeconds: number): void {
    this.position.x += this.velocity.x * deltaSeconds
    this.position.y += this.velocity.y * deltaSeconds
    this.fireballTimer = Math.max(0, this.fireballTimer - deltaSeconds)
    this.trail.unshift({ ...this.position })

    if (this.trail.length > 18) {
      this.trail.pop()
    }
  }

  public get isFireball(): boolean {
    return this.fireballTimer > 0
  }
}
