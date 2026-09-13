import { Option } from 'effect'
import { given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Coordinate, cellAt } from './game'
import { Message, initialModel, update } from './main'

const cell = (row: number, column: number) => Coordinate.make({ row, column })

describe('game update', () => {
  test('placing marks alternates turns', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedCell({ cell: cell(0, 0) })),
      model(model => {
        expect(Option.getOrNull(cellAt(model, cell(0, 0)))).toBe('X')
        expect(model.currentPlayer).toBe('O')
      }),
      message(Message.ClickedCell({ cell: cell(0, 1) })),
      model(model => {
        expect(Option.getOrNull(cellAt(model, cell(0, 1)))).toBe('O')
        expect(model.currentPlayer).toBe('X')
      }),
    )
  })

  test('an occupied cell message leaves the model unchanged', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedCell({ cell: cell(1, 1) })),
      message(Message.ClickedCell({ cell: cell(1, 1) })),
      model(model => {
        expect(model.moves).toHaveLength(1)
        expect(model.currentPlayer).toBe('O')
      }),
    )
  })

  test('undo and restart flow through explicit messages', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedCell({ cell: cell(2, 2) })),
      message(Message.ClickedUndo()),
      model(model => {
        expect(model.moves).toHaveLength(0)
        expect(model.currentPlayer).toBe('X')
      }),
      message(Message.ClickedCell({ cell: cell(3, 3) })),
      message(Message.ClickedRestart()),
      model(model => {
        expect(model).toEqual(initialModel)
      }),
    )
  })
})
