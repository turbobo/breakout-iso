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
    name: '热身练习',
    mode: 'classic',
    difficulty: 1,
    description: '四排高密度基础砖块，适合熟悉挡板反弹手感。',
    pattern: ['RRRRRRRRRRRR', 'YYYYYYYYYYYY', 'GGGGGGGGGGGG', 'BBBBBBBBBBBB'],
  },
  {
    name: '初遇护甲',
    mode: 'classic',
    difficulty: 2,
    description: '更密集的加固砖块阵列，需要连续击中。',
    pattern: ['RRRRRRRRRRRR', 'YYHYYYYYYHYY', 'GGGGHHHHGGGG', 'BBBBBBBBBBBB', 'PPPPPPPPPPPP'],
  },
  {
    name: '钢铁之门',
    mode: 'classic',
    difficulty: 2,
    description: '钢铁砖块形成多层门洞，训练斜线反弹。',
    pattern: ['RRRRRRRRRRRR', 'YYSSYYYYSSYY', 'GGGGHHHHGGGG', 'BSSBBBBBBSSB', 'PPPPPPPPPPPP'],
  },
  {
    name: '连锁爆破',
    mode: 'timed',
    difficulty: 3,
    description: '限时爆破关，利用爆炸砖块快速清理密集阵列。',
    timeLimitSeconds: 90,
    powerUpDropRate: 0.25,
    pattern: ['RRXRRRRRRXRR', 'YYHYYYYYYHYY', 'GGGGXXXXGGGG', 'BBBBBBBBBBBB', 'PPXXPPPPXXPP'],
  },
  {
    name: '霓虹阶梯',
    mode: 'classic',
    difficulty: 3,
    description: '更长阶梯空洞布局，考验控球角度。',
    ballSpeedMultiplier: 1.04,
    pattern: ['R..........R', 'RR........RR', 'HHH......HHH', 'BBBB....BBBB', 'GGGGG..GGGGG', 'PPPPPPPPPPPP'],
  },
  {
    name: '金属花园',
    mode: 'classic',
    difficulty: 4,
    description: '钢铁、加固和爆炸混合铺开，路线更复杂。',
    pattern: ['GGGGGGGGGGGG', 'GSSGHHHHGSSG', 'GXGGGGGGGGXG', 'BBBBXXXXBBBB', 'PPPPPPPPPPPP', 'YYHHYYYYHHYY'],
  },
  {
    name: '交叉火力',
    mode: 'timed',
    difficulty: 4,
    description: '限时十字火力关，爆炸砖块集中在关键通道。',
    timeLimitSeconds: 100,
    ballSpeedMultiplier: 1.06,
    powerUpDropRate: 0.26,
    pattern: ['RRRXXRRRXXRR', 'YYHYYYYYYHYY', '..SSHHHHSS..', 'BBBBXXXXBBBB', 'PPPPPPPPPPPP', 'GGXXGGGGXXGG'],
  },
  {
    name: '狭窄通道',
    mode: 'classic',
    difficulty: 5,
    description: '钢铁墙压缩反弹空间，需要稳定控球。',
    ballSpeedMultiplier: 1.08,
    pattern: ['SSSRRRRRRSSS', 'RHHHXXXXHHHR', 'YYYYSSSSYYYY', 'GGGGGGGGGGGG', 'BBBBBBBBBBBB', 'PPSSPPPPSSPP'],
  },
  {
    name: '霓虹之心',
    mode: 'classic',
    difficulty: 5,
    description: '更饱满的图案关卡，空位更多但爆炸点更隐蔽。',
    pattern: ['.RR....RR...', 'RHHR..RHHR..', 'RXXHHHHXXR..', '.PPHHHHPP...', '..BBBBBBBB..', '...GGGGGG...'],
  },
  {
    name: '终局网格',
    mode: 'timed',
    difficulty: 6,
    description: '限时高密度网格终测，需要快速打开钢铁间隙。',
    timeLimitSeconds: 115,
    ballSpeedMultiplier: 1.1,
    powerUpDropRate: 0.28,
    pattern: ['RXHSSSSSSSHXRR', 'YHYXXYYYYXXYHY', 'GGGSSHHHHSSGGG', 'BBBBBXXXXBBBBB', 'PPPPPSSSSPPPPP', 'YYYXXGGGGXXYYY'],
  },
  {
    name: '棱镜首领',
    mode: 'boss',
    difficulty: 6,
    description: '第一场首领战，首领会周期性释放加速脉冲。',
    ballSpeedMultiplier: 1.08,
    powerUpDropRate: 0.3,
    bossSkillIntervalSeconds: 9,
    bossHealth: 4,
    pattern: ['.....OOOO.....', '...OOHHHHOO...', '..OOHSSSSHOO..', '.OOHHXXXXHHOO.', '..OOHSSSSHOO..', '...OOHHHHOO...', '.....OOOO.....'],
  },
  {
    name: '一分钟冲刺',
    mode: 'timed',
    difficulty: 7,
    description: '高速冲刺关，道具掉落更高但球速更快。',
    timeLimitSeconds: 80,
    ballSpeedMultiplier: 1.14,
    powerUpDropRate: 0.34,
    pattern: ['RXRXRXRXRXRXRX', 'YHYHYHYHYHYHYH', 'GXGXGXGXGXGXGX', 'BHBHBHBHBHBHBH', 'PPPPPPPPPPPPPP', 'SSXXSSXXSSXXSS'],
  },
  {
    name: '护盾迷宫',
    mode: 'classic',
    difficulty: 7,
    description: '高密度钢铁迷宫关，必须从侧边找入口。',
    ballSpeedMultiplier: 1.12,
    pattern: ['SSSSS....SSSSS', 'RHHHXXXXXXHHHR', 'R.SSS....SSS.R', 'YYYYHHHHHHYYYY', 'BBBBXXXXXXBBBB', 'PPPPSSSSSSPPPP', 'GGGGGGGGGGGGGG'],
  },
  {
    name: '爆破花瓣',
    mode: 'classic',
    difficulty: 8,
    description: '爆炸砖块像花瓣一样连锁展开。',
    ballSpeedMultiplier: 1.16,
    powerUpDropRate: 0.27,
    pattern: ['...XRRRRX.....', '..XHYYYYHX....', '.XHSSSSSSHX...', 'XXHGGGGGGHXX..', '.XHSSSSSSHX...', '..XHBBBBHX....', 'PPPPPPPPPPPPPP'],
  },
  {
    name: '超频挑战',
    mode: 'timed',
    difficulty: 8,
    description: '高速高密度限时关，保留机会比清场更难。',
    timeLimitSeconds: 100,
    ballSpeedMultiplier: 1.22,
    powerUpDropRate: 0.3,
    pattern: ['RRRHHHHHHHHRRR', 'YYXXSSSSXXYYYY', 'GGGHHHHHHHHGGG', 'BBXXSSSSXXBBBB', 'PPPHHHHHHHHPPP', 'RRXXGGGGXXRRRR'],
  },
  {
    name: '日蚀首领',
    mode: 'boss',
    difficulty: 9,
    description: '终局首领关，首领脉冲更频繁且血量更厚。',
    ballSpeedMultiplier: 1.18,
    powerUpDropRate: 0.32,
    bossSkillIntervalSeconds: 7,
    bossHealth: 6,
    pattern: ['....OOOOOO....', '...OOHHHHOO...', '..OOHSSSSHOO..', '.OOHHXXXXHHOO.', '.OOHHXXXXHHOO.', '..OOHSSSSHOO..', '...OOHHHHOO...', '....OOOOOO....', 'RRSSRRRRSSRRRR'],
  },
]

export function getLevelCount(): number {
  return levelDefinitions.length
}

export function getLevelDefinition(levelIndex: number): LevelDefinition {
  return levelDefinitions[levelIndex % levelDefinitions.length]
}

export function getLevelName(levelIndex: number): string {
  return getLevelDefinition(levelIndex)?.name ?? '未知关卡'
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
  const desktopHudSafeInset = boardWidth > 720 ? 184 : 0
  const playfieldWidth = boardWidth - desktopHudSafeInset
  const brickGap = clampLayoutValue(playfieldWidth * 0.009, 4, 6)
  const horizontalMargin = clampLayoutValue(playfieldWidth * 0.04, 12, 44)
  const availableGridWidth = playfieldWidth - horizontalMargin * 2
  const maxGridWidth = playfieldWidth >= 900 ? 840 : availableGridWidth
  const gridWidth = Math.max(280, Math.min(availableGridWidth, maxGridWidth))
  const brickWidth = (gridWidth - brickGap * (columns - 1)) / columns
  const brickHeight = clampLayoutValue(playfieldWidth * 0.032, 14, 20)
  const topOffset = boardWidth <= 720 ? 92 : 72
  const startX = (playfieldWidth - gridWidth) / 2
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
