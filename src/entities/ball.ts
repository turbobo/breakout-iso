import type { Vector2 } from '../engine/math'

const trailCapacity = 18

export class Ball {
  public position: Vector2
  public velocity: Vector2
  public radius: number
  public active = true
  public fireballTimer = 0
  private readonly trailPositions: Vector2[] = Array.from({ length: trailCapacity }, () => ({ x: 0, y: 0 }))
  private trailHeadIndex = 0
  private trailPointCount = 0

  public constructor(position: Vector2, velocity: Vector2, radius = 8) {
    this.position = { ...position }
    this.velocity = { ...velocity }
    this.radius = radius
  }

  public update(deltaSeconds: number): void {
    this.position.x += this.velocity.x * deltaSeconds
    this.position.y += this.velocity.y * deltaSeconds
    this.fireballTimer = Math.max(0, this.fireballTimer - deltaSeconds)
    this.recordTrailPosition()
  }

  public get trailLength(): number {
    return this.trailPointCount
  }

  public getTrailPosition(index: number): Vector2 | null {
    if (index < 0 || index >= this.trailPointCount) {
      return null
    }

    return this.trailPositions[(this.trailHeadIndex + index) % trailCapacity]
  }

  public get isFireball(): boolean {
    return this.fireballTimer > 0
  }

  private recordTrailPosition(): void {
    this.trailHeadIndex = (this.trailHeadIndex - 1 + trailCapacity) % trailCapacity

    const latestTrailPosition = this.trailPositions[this.trailHeadIndex]
    latestTrailPosition.x = this.position.x
    latestTrailPosition.y = this.position.y
    this.trailPointCount = Math.min(trailCapacity, this.trailPointCount + 1)
  }
}
