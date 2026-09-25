import { Array, Option, Result, Schema, pipe } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const BOARD_SIZE = 8
export const WIN_LENGTH = 4

export const Player = Schema.Literals(['X', 'O'])
export type Player = typeof Player.Type

export const Direction = Schema.Literals([
  'Horizontal',
  'Vertical',
  'DiagonalDown',
  'DiagonalUp',
])
export type Direction = typeof Direction.Type

export const Coordinate = Schema.Struct({
  row: Schema.Number,
  column: Schema.Number,
})
export type Coordinate = typeof Coordinate.Type

export const ScoredRow = Schema.Struct({
  player: Player,
  direction: Direction,
  cells: Schema.Array(Coordinate),
  turnNumber: Schema.Number,
})
export type ScoredRow = typeof ScoredRow.Type

export const Move = Schema.Struct({
  player: Player,
  cell: Coordinate,
  points: Schema.Number,
})
export type Move = typeof Move.Type

export const GameResult = defineTaggedUnion({
  Winner: { player: Player },
  Tie: {},
})
export type GameResult = typeof GameResult.Type

export const GameStatus = defineTaggedUnion({
  Playing: {},
  Finished: { result: GameResult },
})
export type GameStatus = typeof GameStatus.Type

export const Scores = Schema.Struct({
  X: Schema.Number,
  O: Schema.Number,
})
export type Scores = typeof Scores.Type

export const GameState = Schema.Struct({
  board: Schema.Array(Schema.Option(Player)),
  currentPlayer: Player,
  scores: Scores,
  scoredRows: Schema.Array(ScoredRow),
  moves: Schema.Array(Move),
  status: GameStatus,
  lastMoveScore: Schema.Number,
})
export type GameState = typeof GameState.Type

export const MoveError = defineTaggedUnion({
  OutOfBounds: { cell: Coordinate },
  Occupied: { cell: Coordinate },
  GameFinished: {},
})
export type MoveError = typeof MoveError.Type

const directionVectors: ReadonlyArray<{
  readonly direction: Direction
  readonly row: number
  readonly column: number
}> = [
  { direction: 'Horizontal', row: 0, column: 1 },
  { direction: 'Vertical', row: 1, column: 0 },
  { direction: 'DiagonalDown', row: 1, column: 1 },
  { direction: 'DiagonalUp', row: -1, column: 1 },
]

export const emptyGame = (): GameState =>
  GameState.make({
    board: Array.makeBy(BOARD_SIZE * BOARD_SIZE, () => Option.none()),
    currentPlayer: 'X',
    scores: { X: 0, O: 0 },
    scoredRows: [],
    moves: [],
    status: GameStatus.Playing(),
    lastMoveScore: 0,
  })

export const coordinateToIndex = ({ row, column }: Coordinate): number =>
  row * BOARD_SIZE + column

export const isInBounds = ({ row, column }: Coordinate): boolean =>
  Number.isInteger(row) &&
  Number.isInteger(column) &&
  row >= 0 &&
  row < BOARD_SIZE &&
  column >= 0 &&
  column < BOARD_SIZE

export const cellAt = (
  state: GameState,
  cell: Coordinate,
): Option.Option<Player> =>
  isInBounds(cell)
    ? (state.board[coordinateToIndex(cell)] ?? Option.none())
    : Option.none()

const isPlayerAt = (
  board: ReadonlyArray<Option.Option<Player>>,
  cell: Coordinate,
  player: Player,
): boolean =>
  isInBounds(cell) &&
  Option.match(board[coordinateToIndex(cell)] ?? Option.none(), {
    onNone: () => false,
    onSome: occupant => occupant === player,
  })

const sameCoordinate = (left: Coordinate, right: Coordinate): boolean =>
  left.row === right.row && left.column === right.column

const isPreviouslyScoredOnAxis = (
  scoredRows: ReadonlyArray<ScoredRow>,
  cell: Coordinate,
  player: Player,
  direction: Direction,
): boolean =>
  scoredRows.some(
    row =>
      row.player === player &&
      row.direction === direction &&
      row.cells.some(scoredCell => sameCoordinate(scoredCell, cell)),
  )

const collectFrom = (
  origin: Coordinate,
  rowStep: number,
  columnStep: number,
  belongsToRun: (cell: Coordinate) => boolean,
): ReadonlyArray<Coordinate> => {
  const next = Coordinate.make({
    row: origin.row + rowStep,
    column: origin.column + columnStep,
  })

  return belongsToRun(next)
    ? [next, ...collectFrom(next, rowStep, columnStep, belongsToRun)]
    : []
}

const contiguousRun = (
  cell: Coordinate,
  rowStep: number,
  columnStep: number,
  belongsToRun: (cell: Coordinate) => boolean,
): ReadonlyArray<Coordinate> => [
  ...pipe(
    collectFrom(cell, -rowStep, -columnStep, belongsToRun),
    Array.reverse,
  ),
  cell,
  ...collectFrom(cell, rowStep, columnStep, belongsToRun),
]

const scoringRowsForMove = (
  board: ReadonlyArray<Option.Option<Player>>,
  scoredRows: ReadonlyArray<ScoredRow>,
  cell: Coordinate,
  player: Player,
  turnNumber: number,
): ReadonlyArray<ScoredRow> =>
  pipe(
    directionVectors,
    Array.filterMap(vector => {
      const cells = contiguousRun(
        cell,
        vector.row,
        vector.column,
        candidate =>
          isPlayerAt(board, candidate, player) &&
          !isPreviouslyScoredOnAxis(
            scoredRows,
            candidate,
            player,
            vector.direction,
          ),
      )

      return cells.length === WIN_LENGTH
        ? Result.succeed(
            ScoredRow.make({
              player,
              direction: vector.direction,
              cells,
              turnNumber,
            }),
          )
        : Result.fail(undefined)
    }),
  )

const replaceCell = (
  board: ReadonlyArray<Option.Option<Player>>,
  cell: Coordinate,
  value: Option.Option<Player>,
): ReadonlyArray<Option.Option<Player>> =>
  pipe(
    Array.replace(board, coordinateToIndex(cell), value),
    Option.getOrElse(() => board),
  )

const otherPlayer = (player: Player): Player => (player === 'X' ? 'O' : 'X')

const gameResult = (scores: Scores): GameResult => {
  if (scores.X > scores.O) {
    return GameResult.Winner({ player: 'X' })
  }

  if (scores.O > scores.X) {
    return GameResult.Winner({ player: 'O' })
  }

  return GameResult.Tie()
}

export const placeMark = (
  state: GameState,
  cell: Coordinate,
): Result.Result<GameState, MoveError> => {
  if (state.status._tag === 'Finished') {
    return Result.fail(MoveError.GameFinished())
  }

  if (!isInBounds(cell)) {
    return Result.fail(MoveError.OutOfBounds({ cell }))
  }

  if (Option.isSome(cellAt(state, cell))) {
    return Result.fail(MoveError.Occupied({ cell }))
  }

  const player = state.currentPlayer
  const board = replaceCell(state.board, cell, Option.some(player))
  const turnNumber = state.moves.length + 1
  const newRows = scoringRowsForMove(
    board,
    state.scoredRows,
    cell,
    player,
    turnNumber,
  )
  const points = newRows.length
  const scores = Scores.make({
    X: state.scores.X + (player === 'X' ? points : 0),
    O: state.scores.O + (player === 'O' ? points : 0),
  })
  const moves = Array.append(state.moves, Move.make({ player, cell, points }))
  const status =
    moves.length === BOARD_SIZE * BOARD_SIZE
      ? GameStatus.Finished({ result: gameResult(scores) })
      : GameStatus.Playing()

  return Result.succeed(
    GameState.make({
      board,
      currentPlayer: otherPlayer(player),
      scores,
      scoredRows: Array.appendAll(state.scoredRows, newRows),
      moves,
      status,
      lastMoveScore: points,
    }),
  )
}

export const undoLastMove = (state: GameState): GameState =>
  Option.match(Array.last(state.moves), {
    onNone: () => state,
    onSome: lastMove => {
      const turnNumber = state.moves.length
      const removedRows = Array.filter(
        state.scoredRows,
        row => row.turnNumber === turnNumber,
      )
      const moves = Array.take(state.moves, state.moves.length - 1)
      const maybePreviousMove = Array.last(moves)

      return GameState.make({
        board: replaceCell(state.board, lastMove.cell, Option.none()),
        currentPlayer: lastMove.player,
        scores: {
          X:
            state.scores.X - (lastMove.player === 'X' ? removedRows.length : 0),
          O:
            state.scores.O - (lastMove.player === 'O' ? removedRows.length : 0),
        },
        scoredRows: Array.filter(
          state.scoredRows,
          row => row.turnNumber !== turnNumber,
        ),
        moves,
        status: GameStatus.Playing(),
        lastMoveScore: Option.match(maybePreviousMove, {
          onNone: () => 0,
          onSome: move => move.points,
        }),
      })
    },
  })

export const rulesSummary = {
  boardSize: BOARD_SIZE,
  winLength: WIN_LENGTH,
  axes: Array.map(directionVectors, vector => vector.direction),
  exactLengthOnly: true,
  gravity: false,
  boardFullEndsGame: true,
} as const
