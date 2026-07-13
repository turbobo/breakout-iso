export interface Vector2 {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Circle {
  position: Vector2
  radius: number
}

export interface CollisionResult {
  normal: Vector2
  penetration: number
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function normalize(vector: Vector2): Vector2 {
  const length = Math.hypot(vector.x, vector.y)

  if (length === 0) {
    return { x: 0, y: -1 }
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}

export function scaleToLength(vector: Vector2, targetLength: number): Vector2 {
  const normalizedVector = normalize(vector)

  return {
    x: normalizedVector.x * targetLength,
    y: normalizedVector.y * targetLength,
  }
}

export function getSpeed(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y)
}

export function reflectVelocity(velocity: Vector2, normal: Vector2): Vector2 {
  const dotProduct = velocity.x * normal.x + velocity.y * normal.y

  return {
    x: velocity.x - 2 * dotProduct * normal.x,
    y: velocity.y - 2 * dotProduct * normal.y,
  }
}

export function resolveCircleRectCollision(circle: Circle, rect: Rect): CollisionResult | null {
  const closestX = clamp(circle.position.x, rect.x, rect.x + rect.width)
  const closestY = clamp(circle.position.y, rect.y, rect.y + rect.height)
  const differenceX = circle.position.x - closestX
  const differenceY = circle.position.y - closestY
  const distanceSquared = differenceX * differenceX + differenceY * differenceY

  if (distanceSquared > circle.radius * circle.radius) {
    return null
  }

  if (distanceSquared > 0.0001) {
    const distance = Math.sqrt(distanceSquared)

    return {
      normal: {
        x: differenceX / distance,
        y: differenceY / distance,
      },
      penetration: circle.radius - distance,
    }
  }

  const distanceToLeft = Math.abs(circle.position.x - rect.x)
  const distanceToRight = Math.abs(rect.x + rect.width - circle.position.x)
  const distanceToTop = Math.abs(circle.position.y - rect.y)
  const distanceToBottom = Math.abs(rect.y + rect.height - circle.position.y)
  const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom)

  if (minDistance === distanceToLeft) {
    return { normal: { x: -1, y: 0 }, penetration: circle.radius }
  }

  if (minDistance === distanceToRight) {
    return { normal: { x: 1, y: 0 }, penetration: circle.radius }
  }

  if (minDistance === distanceToTop) {
    return { normal: { x: 0, y: -1 }, penetration: circle.radius }
  }

  return { normal: { x: 0, y: 1 }, penetration: circle.radius }
}
