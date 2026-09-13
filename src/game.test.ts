import { Array, Option, Result, pipe } from 'effect'
import { describe, expect, test } from 'vitest'

import {
  BOARD_SIZE,
  Coordinate,
  GameResult,
  GameState,
  type GameState as GameStateType,
  GameStatus,
  Move,
  type Player,
  ScoredRow,
  cellAt,
  emptyGame,
  placeMark,
  undoLastMove,
} from './game'

const cell = (row: number, column: number) => Coordinate.make({ row, column })

const stateWithMarks = (
  player: Player,
  cells: ReadonlyArray<typeof Coordinate.Type>,
): GameStateType => {
  const board = Array.makeBy(BOARD_SIZE * BOARD_SIZE, () =>
    Option.none<Player>(),
  )
  const markedBoard = Array.reduce(cells, board, (currentBoard, coordinate) =>
    pipe(
      Array.replace(
        currentBoard,
        coordinate.row * BOARD_SIZE + coordinate.column,
        Option.some(player),
      ),
      Option.getOrElse(() => currentBoard),
    ),
  )

  return GameState.make({
    ...emptyGame(),
    board: markedBoard,
    currentPlayer: player,
  })
}

const placeSuccessfully = (
  state: GameStateType,
  coordinate: typeof Coordinate.Type,
): GameStateType =>
  Result.match(placeMark(state, coordinate), {
    onFailure: error => {
      throw new Error(`Unexpected move error: ${error._tag}`)
    },
    onSuccess: nextState => nextState,
  })

describe('game engine scoring', () => {
  test.each([
    ['Horizontal', [cell(3, 1), cell(3, 2), cell(3, 3)], cell(3, 4)],
    ['Vertical', [cell(1, 4), cell(2, 4), cell(3, 4)], cell(4, 4)],
    ['DiagonalDown', [cell(1, 1), cell(2, 2), cell(3, 3)], cell(4, 4)],
    ['DiagonalUp', [cell(6, 1), cell(5, 2), cell(4, 3)], cell(3, 4)],
  ] as const)('scores an exact %s row', (direction, marks, move) => {
    const result = placeSuccessfully(stateWithMarks('X', marks), move)

    expect(result.scores.X).toBe(1)
    expect(result.lastMoveScore).toBe(1)
    expect(result.scoredRows).toHaveLength(1)
    expect(result.scoredRows[0]?.direction).toBe(direction)
    expect(result.scoredRows[0]?.cells).toHaveLength(4)
  })

  test('does not score when extending a run from four to five', () => {
    const state = stateWithMarks('O', [
      cell(2, 1),
      cell(2, 2),
      cell(2, 3),
      cell(2, 4),
    ])
    const result = placeSuccessfully(state, cell(2, 5))

    expect(result.scores.O).toBe(0)
    expect(result.lastMoveScore).toBe(0)
    expect(result.scoredRows).toHaveLength(0)
  })

  test('does not score when a move joins groups into a run longer than four', () => {
    const state = stateWithMarks('X', [
      cell(4, 0),
      cell(4, 1),
      cell(4, 2),
      cell(4, 4),
      cell(4, 5),
    ])
    const result = placeSuccessfully(state, cell(4, 3))

    expect(result.scores.X).toBe(0)
    expect(result.lastMoveScore).toBe(0)
  })

  test('scores each qualifying axis on a crossing move', () => {
    const state = stateWithMarks('X', [
      cell(3, 0),
      cell(3, 1),
      cell(3, 2),
      cell(0, 3),
      cell(1, 3),
      cell(2, 3),
    ])
    const result = placeSuccessfully(state, cell(3, 3))

    expect(result.scores.X).toBe(2)
    expect(result.lastMoveScore).toBe(2)
    expect(result.scoredRows.map(row => row.direction)).toEqual([
      'Horizontal',
      'Vertical',
    ])
  })

  test('can score all four axes with one move', () => {
    const state = stateWithMarks('X', [
      cell(3, 0),
      cell(3, 1),
      cell(3, 2),
      cell(0, 3),
      cell(1, 3),
      cell(2, 3),
      cell(0, 0),
      cell(1, 1),
      cell(2, 2),
      cell(4, 2),
      cell(5, 1),
      cell(6, 0),
    ])

    const result = placeSuccessfully(state, cell(3, 3))

    expect(result.lastMoveScore).toBe(4)
    expect(result.scoredRows.map(row => row.direction)).toEqual([
      'Horizontal',
      'Vertical',
      'DiagonalDown',
      'DiagonalUp',
    ])
  })

  test('allows a mark in an existing scored row to score in another direction', () => {
    const horizontalCells = [cell(3, 1), cell(3, 2), cell(3, 3), cell(3, 4)]
    const base = stateWithMarks('O', [
      ...horizontalCells,
      cell(4, 3),
      cell(5, 3),
    ])
    const state = GameState.make({
      ...base,
      board: base.board.map((occupant, index) =>
        index === 6 * BOARD_SIZE + 6 ? Option.none() : occupant,
      ),
      scores: { X: 0, O: 1 },
      scoredRows: [
        ScoredRow.make({
          player: 'O',
          direction: 'Horizontal',
          cells: horizontalCells,
          turnNumber: 7,
        }),
      ],
    })

    const result = placeSuccessfully(state, cell(6, 3))

    expect(result.scores.O).toBe(2)
    expect(result.scoredRows).toHaveLength(2)
    expect(result.scoredRows[1]?.direction).toBe('Vertical')
  })
})

describe('game engine moves', () => {
  test('alternates players after a legal move', () => {
    const afterX = placeSuccessfully(emptyGame(), cell(0, 0))
    const afterO = placeSuccessfully(afterX, cell(0, 1))

    expect(Option.getOrNull(cellAt(afterX, cell(0, 0)))).toBe('X')
    expect(Option.getOrNull(cellAt(afterO, cell(0, 1)))).toBe('O')
    expect(afterO.currentPlayer).toBe('X')
  })

  test('rejects occupied, out-of-bounds, and post-game moves', () => {
    const occupied = placeSuccessfully(emptyGame(), cell(0, 0))
    const finished = GameState.make({
      ...emptyGame(),
      status: GameStatus.Finished({ result: GameResult.Tie() }),
    })

    expect(
      Option.map(
        Result.getFailure(placeMark(occupied, cell(0, 0))),
        error => error._tag,
      ),
    ).toEqual(Option.some('Occupied'))
    expect(
      Option.map(
        Result.getFailure(placeMark(emptyGame(), cell(-1, 0))),
        error => error._tag,
      ),
    ).toEqual(Option.some('OutOfBounds'))
    expect(
      Option.map(
        Result.getFailure(placeMark(finished, cell(1, 1))),
        error => error._tag,
      ),
    ).toEqual(Option.some('GameFinished'))
  })

  test('undo restores the board, player, points, and scored rows', () => {
    const before = stateWithMarks('X', [cell(5, 1), cell(5, 2), cell(5, 3)])
    const after = placeSuccessfully(before, cell(5, 4))
    const undone = undoLastMove(after)

    expect(Option.isNone(cellAt(undone, cell(5, 4)))).toBe(true)
    expect(undone.currentPlayer).toBe('X')
    expect(undone.scores.X).toBe(0)
    expect(undone.scoredRows).toHaveLength(0)
    expect(undone.status._tag).toBe('Playing')
  })

  test('undo with no moves leaves the game unchanged', () => {
    const state = emptyGame()
    expect(undoLastMove(state)).toBe(state)
  })

  test('fills the board and declares the higher-scoring winner', () => {
    const openCell = cell(7, 7)
    const board = Array.makeBy(BOARD_SIZE * BOARD_SIZE, index =>
      index === 63 ? Option.none<Player>() : Option.some<Player>('O'),
    )
    const moves = Array.makeBy(63, index =>
      Move.make({
        player: index % 2 === 0 ? 'X' : 'O',
        cell: cell(Math.floor(index / BOARD_SIZE), index % BOARD_SIZE),
        points: 0,
      }),
    )
    const almostFinished = GameState.make({
      ...emptyGame(),
      board,
      currentPlayer: 'X',
      scores: { X: 9, O: 2 },
      moves,
    })

    const result = placeSuccessfully(almostFinished, openCell)

    expect(result.status._tag).toBe('Finished')
    if (result.status._tag === 'Finished') {
      expect(result.status.result).toEqual({ _tag: 'Winner', player: 'X' })
    }
  })
})
