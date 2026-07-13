import { Brick, type BrickKind } from '../entities/brick'

export interface LevelDefinition {
  name: string
  pattern: string[]
}

const brickColors: Record<string, string> = {
  R: '#FF6B35',
  Y: '#F7C948',
  G: '#48BB78',
  B: '#4299E1',
  P: '#9F7AEA',
  H: '#FF9F1C',
  S: '#8A94A6',
  X: '#FF3B3B',
  O: '#FF71CE',
}

const levelDefinitions: LevelDefinition[] = [
  {
    name: 'Warm Up',
    pattern: ['RRRRRRRRRR', 'YYYYYYYYYY', 'GGGGGGGGGG'],
  },
  {
    name: 'First Armor',
    pattern: ['RRRRRRRRRR', 'YHYYYYYYHY', 'GGGGGGGGGG', 'BBBBBBBBBB'],
  },
  {
    name: 'Steel Gate',
    pattern: ['RRRRRRRRRR', 'YSSYYYYSSY', 'GGGGHHGGGG', 'BBBBBBBBBB'],
  },
  {
    name: 'Chain Blast',
    pattern: ['RRXRRRRXRR', 'YHYYYYYYHY', 'GGGGXXGGGG', 'BBBBBBBBBB'],
  },
  {
    name: 'Neon Steps',
    pattern: ['R........R', 'RR......RR', 'HHH....HHH', 'BBBB..BBBB', 'PPPPPPPPPP'],
  },
  {
    name: 'Metal Garden',
    pattern: ['GGGGGGGGGG', 'GSSGHHGSSG', 'GXGGGGGGXG', 'BBBBBBBBBB', 'PPPPPPPPPP'],
  },
  {
    name: 'Cross Fire',
    pattern: ['RRRXXRRRXX', 'YHYYYYYYHY', '..SSHHSS..', 'BBBBXXBBBB', 'PPPPPPPPPP'],
  },
  {
    name: 'Tight Lane',
    pattern: ['SSSRRRRSSS', 'RHHHXXHHHR', 'YYYYSSYYYY', 'GGGGGGGGGG', 'BBBBBBBBBB'],
  },
  {
    name: 'Neon Heart',
    pattern: ['.RR..RR...', 'RHHRRHHR..', 'RXXHHXXR..', '.PPHHPP...', '..BBBB....'],
  },
  {
    name: 'Final Grid',
    pattern: ['RXHSSSHXR', 'YHYXXYHY.', 'GGSSHHGGG', 'BBBBXXBBB', 'PPPPPPPPP'],
  },
  {
    name: 'Boss Prism',
    pattern: ['....OO....', '..OHHHHO..', '.OHSSSHO.', 'OOHXXHOO.', '.OHSSSHO.', '..OHHHHO..'],
  },
]

export function getLevelCount(): number {
  return levelDefinitions.length
}

export function getLevelName(levelIndex: number): string {
  return levelDefinitions[levelIndex]?.name ?? 'Unknown Level'
}

export function createLevelBricks(levelIndex: number, boardWidth: number): Brick[] {
  const definition = levelDefinitions[levelIndex % levelDefinitions.length]
  const columns = Math.max(...definition.pattern.map((row) => row.length))
  const brickGap = clampLayoutValue(boardWidth * 0.012, 5, 8)
  const horizontalMargin = clampLayoutValue(boardWidth * 0.04, 12, 44)
  const availableGridWidth = boardWidth - horizontalMargin * 2
  const maxGridWidth = boardWidth >= 900 ? 820 : availableGridWidth
  const gridWidth = Math.max(280, Math.min(availableGridWidth, maxGridWidth))
  const brickWidth = (gridWidth - brickGap * (columns - 1)) / columns
  const brickHeight = clampLayoutValue(boardWidth * 0.045, 17, 24)
  const topOffset = boardWidth < 720 ? 138 : 106
  const startX = (boardWidth - gridWidth) / 2
  const bricks: Brick[] = []

  definition.pattern.forEach((rowPattern, rowIndex) => {
    for (let columnIndex = 0; columnIndex < rowPattern.length; columnIndex += 1) {
      const symbol = rowPattern[columnIndex]

      if (symbol === '.') {
        continue
      }

      const kind = getBrickKind(symbol)
      const health = getBrickHealth(kind)
      const score = getBrickScore(kind, rowIndex)

      bricks.push(
        new Brick({
          position: {
            x: startX + columnIndex * (brickWidth + brickGap),
            y: topOffset + rowIndex * (brickHeight + brickGap),
          },
          width: brickWidth,
          height: brickHeight,
          kind,
          color: brickColors[symbol] ?? '#7CDBFF',
          score,
          health,
        }),
      )
    }
  })

  return bricks
}

function clampLayoutValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function getBrickKind(symbol: string): BrickKind {
  if (symbol === 'H') {
    return 'reinforced'
  }

  if (symbol === 'S') {
    return 'steel'
  }

  if (symbol === 'X') {
    return 'explosive'
  }

  if (symbol === 'O') {
    return 'boss'
  }

  return 'normal'
}

function getBrickHealth(kind: BrickKind): number {
  if (kind === 'reinforced') {
    return 2
  }

  if (kind === 'boss') {
    return 3
  }

  if (kind === 'steel') {
    return Number.POSITIVE_INFINITY
  }

  return 1
}

function getBrickScore(kind: BrickKind, rowIndex: number): number {
  const rowScore = 50 - Math.min(rowIndex, 4) * 10

  if (kind === 'reinforced') {
    return rowScore * 2
  }

  if (kind === 'boss') {
    return rowScore * 3
  }

  if (kind === 'explosive') {
    return 80
  }

  if (kind === 'steel') {
    return 0
  }

  return rowScore
}
