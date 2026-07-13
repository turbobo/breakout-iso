import { Brick, type BrickKind } from '../entities/brick'

export type LevelMode = 'classic' | 'timed' | 'boss'

export interface LevelDefinition {
  name: string
  mode: LevelMode
  difficulty: number
  description: string
  pattern: string[]
  ballSpeedMultiplier?: number
  powerUpDropRate?: number
  timeLimitSeconds?: number
  bossSkillIntervalSeconds?: number
  bossHealth?: number
}

export interface LevelSummary {
  index: number
  name: string
  mode: LevelMode
  difficulty: number
  description: string
  timeLimitSeconds?: number
  chanceCount: number
}

const defaultPowerUpDropRate = 0.22
const hardLevelDifficultyThreshold = 5
const simpleLevelChanceCount = 1
const hardLevelChanceCount = 2

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
    mode: 'classic',
    difficulty: 1,
    description: '基础三排砖块，适合熟悉挡板反弹手感。',
    pattern: ['RRRRRRRRRR', 'YYYYYYYYYY', 'GGGGGGGGGG'],
  },
  {
    name: 'First Armor',
    mode: 'classic',
    difficulty: 2,
    description: '第一次出现加固砖块，需要连续击中。',
    pattern: ['RRRRRRRRRR', 'YHYYYYYYHY', 'GGGGGGGGGG', 'BBBBBBBBBB'],
  },
  {
    name: 'Steel Gate',
    mode: 'classic',
    difficulty: 2,
    description: '钢铁砖块形成门洞，训练斜线反弹。',
    pattern: ['RRRRRRRRRR', 'YSSYYYYSSY', 'GGGGHHGGGG', 'BBBBBBBBBB'],
  },
  {
    name: 'Chain Blast',
    mode: 'timed',
    difficulty: 3,
    description: '限时爆破关，利用爆炸砖块快速清场。',
    timeLimitSeconds: 75,
    powerUpDropRate: 0.25,
    pattern: ['RRXRRRRXRR', 'YHYYYYYYHY', 'GGGGXXGGGG', 'BBBBBBBBBB'],
  },
  {
    name: 'Neon Steps',
    mode: 'classic',
    difficulty: 3,
    description: '阶梯空洞布局，考验控球角度。',
    ballSpeedMultiplier: 1.04,
    pattern: ['R........R', 'RR......RR', 'HHH....HHH', 'BBBB..BBBB', 'PPPPPPPPPP'],
  },
  {
    name: 'Metal Garden',
    mode: 'classic',
    difficulty: 4,
    description: '钢铁和爆炸混合出现，路线更复杂。',
    pattern: ['GGGGGGGGGG', 'GSSGHHGSSG', 'GXGGGGGGXG', 'BBBBBBBBBB', 'PPPPPPPPPP'],
  },
  {
    name: 'Cross Fire',
    mode: 'timed',
    difficulty: 4,
    description: '限时十字火力关，爆炸砖块集中在关键通道。',
    timeLimitSeconds: 85,
    ballSpeedMultiplier: 1.06,
    powerUpDropRate: 0.26,
    pattern: ['RRRXXRRRXX', 'YHYYYYYYHY', '..SSHHSS..', 'BBBBXXBBBB', 'PPPPPPPPPP'],
  },
  {
    name: 'Tight Lane',
    mode: 'classic',
    difficulty: 5,
    description: '钢铁墙压缩反弹空间，需要稳定控球。',
    ballSpeedMultiplier: 1.08,
    pattern: ['SSSRRRRSSS', 'RHHHXXHHHR', 'YYYYSSYYYY', 'GGGGGGGGGG', 'BBBBBBBBBB'],
  },
  {
    name: 'Neon Heart',
    mode: 'classic',
    difficulty: 5,
    description: '图案关卡，空位更多但爆炸点更隐蔽。',
    pattern: ['.RR..RR...', 'RHHRRHHR..', 'RXXHHXXR..', '.PPHHPP...', '..BBBB....'],
  },
  {
    name: 'Final Grid',
    mode: 'timed',
    difficulty: 6,
    description: '限时网格终测，需要快速打开钢铁间隙。',
    timeLimitSeconds: 95,
    ballSpeedMultiplier: 1.1,
    powerUpDropRate: 0.28,
    pattern: ['RXHSSSHXR', 'YHYXXYHY.', 'GGSSHHGGG', 'BBBBXXBBB', 'PPPPPPPPP'],
  },
  {
    name: 'Boss Prism',
    mode: 'boss',
    difficulty: 6,
    description: '第一场 Boss 战，Boss 会周期性释放加速脉冲。',
    ballSpeedMultiplier: 1.08,
    powerUpDropRate: 0.3,
    bossSkillIntervalSeconds: 9,
    bossHealth: 4,
    pattern: ['....OO....', '..OHHHHO..', '.OHSSSHO.', 'OOHXXHOO.', '.OHSSSHO.', '..OHHHHO..'],
  },
  {
    name: 'Minute Rush',
    mode: 'timed',
    difficulty: 7,
    description: '一分钟冲刺关，道具掉落更高但球速更快。',
    timeLimitSeconds: 60,
    ballSpeedMultiplier: 1.14,
    powerUpDropRate: 0.34,
    pattern: ['RXRXRXRXRX', 'YHYHYHYHYH', 'GXGXGXGXGX', 'BHBHBHBHBH', 'PPPPPPPPPP'],
  },
  {
    name: 'Shield Maze',
    mode: 'classic',
    difficulty: 7,
    description: '钢铁迷宫关，必须从侧边找入口。',
    ballSpeedMultiplier: 1.12,
    pattern: ['SSSS..SSSS', 'RHHHXXHHHR', 'R.SS..SS.R', 'YYYYHHYYYY', 'BBBBXXBBBB', 'PPPPPPPPPP'],
  },
  {
    name: 'Blast Flower',
    mode: 'classic',
    difficulty: 8,
    description: '爆炸砖块像花瓣一样连锁展开。',
    ballSpeedMultiplier: 1.16,
    powerUpDropRate: 0.27,
    pattern: ['..XRRX....', '.XHYYHX...', 'XHSSSSHX..', '.XHGGHX...', '..XBBX....', 'PPPPPPPPPP'],
  },
  {
    name: 'Overclock',
    mode: 'timed',
    difficulty: 8,
    description: '高速限时关，保留生命比清场更难。',
    timeLimitSeconds: 80,
    ballSpeedMultiplier: 1.22,
    powerUpDropRate: 0.3,
    pattern: ['RRHHHHHHRR', 'YXXSSXXYY', 'GGHHHHHHGG', 'BXXSSXXBB', 'PPHHHHHHPP'],
  },
  {
    name: 'Boss Eclipse',
    mode: 'boss',
    difficulty: 9,
    description: '终局 Boss 关，Boss 脉冲更频繁且血量更厚。',
    ballSpeedMultiplier: 1.18,
    powerUpDropRate: 0.32,
    bossSkillIntervalSeconds: 7,
    bossHealth: 6,
    pattern: ['...OOOO...', '..OHHHHO..', '.OHSSSHO.', 'OOHXXHOO.', 'OOHXXHOO.', '.OHSSSHO.', '..OHHHHO..', '...OOOO...'],
  },
]

export function getLevelCount(): number {
  return levelDefinitions.length
}

export function getLevelDefinition(levelIndex: number): LevelDefinition {
  return levelDefinitions[levelIndex % levelDefinitions.length]
}

export function getLevelName(levelIndex: number): string {
  return getLevelDefinition(levelIndex)?.name ?? 'Unknown Level'
}

export function getLevelSummaries(): LevelSummary[] {
  return levelDefinitions.map((definition, index) => ({
    index,
    name: definition.name,
    mode: definition.mode,
    difficulty: definition.difficulty,
    description: definition.description,
    timeLimitSeconds: definition.timeLimitSeconds,
    chanceCount: getLevelChanceCount(index),
  }))
}

export function createLevelBricks(levelIndex: number, boardWidth: number): Brick[] {
  const definition = getLevelDefinition(levelIndex)
  const columns = Math.max(...definition.pattern.map((row) => row.length))
  const brickGap = clampLayoutValue(boardWidth * 0.012, 5, 8)
  const horizontalMargin = clampLayoutValue(boardWidth * 0.04, 12, 44)
  const availableGridWidth = boardWidth - horizontalMargin * 2
  const maxGridWidth = boardWidth >= 900 ? 820 : availableGridWidth
  const gridWidth = Math.max(280, Math.min(availableGridWidth, maxGridWidth))
  const brickWidth = (gridWidth - brickGap * (columns - 1)) / columns
  const brickHeight = clampLayoutValue(boardWidth * 0.045, 17, 24)
  const topOffset = boardWidth < 720 ? 92 : 106
  const startX = (boardWidth - gridWidth) / 2
  const bricks: Brick[] = []

  definition.pattern.forEach((rowPattern, rowIndex) => {
    for (let columnIndex = 0; columnIndex < rowPattern.length; columnIndex += 1) {
      const symbol = rowPattern[columnIndex]

      if (symbol === '.') {
        continue
      }

      const kind = getBrickKind(symbol)
      const health = getBrickHealth(kind, definition)
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

export function getLevelChanceCount(levelIndex: number): number {
  return getLevelDefinition(levelIndex).difficulty >= hardLevelDifficultyThreshold
    ? hardLevelChanceCount
    : simpleLevelChanceCount
}

export function getLevelPowerUpDropRate(levelIndex: number): number {
  return getLevelDefinition(levelIndex).powerUpDropRate ?? defaultPowerUpDropRate
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

function getBrickHealth(kind: BrickKind, definition: LevelDefinition): number {
  if (kind === 'reinforced') {
    return 2
  }

  if (kind === 'boss') {
    return definition.bossHealth ?? 3
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
