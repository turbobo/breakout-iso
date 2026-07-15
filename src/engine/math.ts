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

export interface SweptCollisionResult {
  normal: Vector2
  hitPosition: Vector2
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function clampPaddleCenterX(centerX: number, paddleWidth: number, boardWidth: number): number {
  if (boardWidth <= paddleWidth) {
    return boardWidth / 2
  }

  const halfPaddleWidth = paddleWidth / 2
  return clamp(centerX, halfPaddleWidth, boardWidth - halfPaddleWidth)
}

export function getResponsiveSegmentWidth(
  boardWidth: number,
  desktopWidth: number,
  mobileBreakpoint: number,
  mobileWidthRatio: number,
  mobileMinWidth: number,
  mobileMaxWidth: number,
): number {
  if (boardWidth >= mobileBreakpoint) {
    return desktopWidth
  }

  const safeMobileMaxWidth = Math.min(mobileMaxWidth, boardWidth)
  const safeMobileMinWidth = Math.min(mobileMinWidth, safeMobileMaxWidth)

  return clamp(boardWidth * mobileWidthRatio, safeMobileMinWidth, safeMobileMaxWidth)
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

export interface StabilizeVelocityAxesOptions {
  minHorizontalRatio: number
  minVerticalRatio: number
  fallbackHorizontalDirection?: number
  fallbackVerticalDirection?: number
}

export function reflectVelocity(velocity: Vector2, normal: Vector2): Vector2 {
  const dotProduct = velocity.x * normal.x + velocity.y * normal.y

  return {
    x: velocity.x - 2 * dotProduct * normal.x,
    y: velocity.y - 2 * dotProduct * normal.y,
  }
}

export function stabilizeVelocityAxes(
  velocity: Vector2,
  options: StabilizeVelocityAxesOptions,
): Vector2 {
  const speed = getSpeed(velocity)

  if (speed <= 0) {
    return { ...velocity }
  }

  const minHorizontalRatio = clamp(options.minHorizontalRatio, 0, 0.95)
  const minVerticalRatio = clamp(options.minVerticalRatio, 0, 0.95)
  let horizontalRatio = Math.abs(velocity.x) / speed
  let verticalRatio = Math.abs(velocity.y) / speed

  if (horizontalRatio >= minHorizontalRatio && verticalRatio >= minVerticalRatio) {
    return { ...velocity }
  }

  if (horizontalRatio < minHorizontalRatio) {
    horizontalRatio = minHorizontalRatio
    verticalRatio = Math.sqrt(Math.max(0, 1 - horizontalRatio * horizontalRatio))
  }

  if (verticalRatio < minVerticalRatio) {
    verticalRatio = minVerticalRatio
    horizontalRatio = Math.sqrt(Math.max(0, 1 - verticalRatio * verticalRatio))
  }

  if (horizontalRatio < minHorizontalRatio) {
    const minRatioLength = Math.hypot(minHorizontalRatio, minVerticalRatio)
    horizontalRatio = minHorizontalRatio / minRatioLength
    verticalRatio = minVerticalRatio / minRatioLength
  }

  const horizontalDirection = getDirection(velocity.x, options.fallbackHorizontalDirection ?? 1)
  const verticalDirection = getDirection(velocity.y, options.fallbackVerticalDirection ?? -1)

  return {
    x: horizontalDirection * horizontalRatio * speed,
    y: verticalDirection * verticalRatio * speed,
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

export function resolveSweptCircleRectCollision(
  previousPosition: Vector2,
  currentPosition: Vector2,
  radius: number,
  rect: Rect,
): CollisionResult | null {
  const deltaX = currentPosition.x - previousPosition.x
  const deltaY = currentPosition.y - previousPosition.y
  const distanceMoved = Math.hypot(deltaX, deltaY)

  if (distanceMoved < 0.001) {
    return resolveCircleRectCollision({ position: currentPosition, radius }, rect)
  }

  const steps = Math.ceil(distanceMoved / (radius * 0.5))
  const stepX = deltaX / steps
  const stepY = deltaY / steps

  for (let stepIndex = 0; stepIndex <= steps; stepIndex += 1) {
    const testPosition = {
      x: previousPosition.x + stepX * stepIndex,
      y: previousPosition.y + stepY * stepIndex,
    }

    const collision = resolveCircleRectCollision({ position: testPosition, radius }, rect)

    if (collision) {
      return collision
    }
  }

  return null
}

export function resolveSweptCircleTopRectCollision(
  previousPosition: Vector2,
  currentPosition: Vector2,
  radius: number,
  rect: Rect,
): SweptCollisionResult | null {
  if (currentPosition.y <= previousPosition.y) {
    return null
  }

  const expandedTopY = rect.y - radius

  if (previousPosition.y > expandedTopY || currentPosition.y < expandedTopY) {
    return null
  }

  const travelY = currentPosition.y - previousPosition.y
  const hitProgress = (expandedTopY - previousPosition.y) / travelY
  const hitX = previousPosition.x + (currentPosition.x - previousPosition.x) * hitProgress
  const expandedLeftX = rect.x - radius
  const expandedRightX = rect.x + rect.width + radius

  if (hitX < expandedLeftX || hitX > expandedRightX) {
    return null
  }

  return {
    normal: { x: 0, y: -1 },
    hitPosition: { x: hitX, y: expandedTopY },
  }
}

function getDirection(value: number, fallbackDirection: number): number {
  if (value < 0) {
    return -1
  }

  if (value > 0) {
    return 1
  }

  return fallbackDirection < 0 ? -1 : 1
}
