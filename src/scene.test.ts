import { click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { initialModel, update } from './main'
import { view } from './view'

describe('game scene', () => {
  test('shows the board, scores, turn, and rules', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(role('heading', { name: 'Tic Tac Toe: 4 in a Row' })).toExist(),
      expect(role('group', { name: 'Tic Tac Toe game board' })).toExist(),
      expect(role('button', { name: 'Row 1, column 1, empty' })).toExist(),
      expect(text('X’s turn — pick any open square')).toExist(),
      expect(role('heading', { name: 'How to play' })).toExist(),
      expect(role('button', { name: 'Undo last move' })).toBeDisabled(),
    )
  })

  test('plays, undoes, and restarts a local game', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: 'Row 1, column 1, empty' })),
      expect(
        role('button', { name: 'Row 1, column 1, marked X' }),
      ).toBeDisabled(),
      expect(text('O’s turn — pick any open square')).toExist(),
      expect(role('button', { name: 'Undo last move' })).toBeEnabled(),
      click(role('button', { name: 'Undo last move' })),
      expect(role('button', { name: 'Row 1, column 1, empty' })).toBeEnabled(),
      click(role('button', { name: 'Row 2, column 2, empty' })),
      click(role('button', { name: 'Start a new game' })),
      expect(role('button', { name: 'Row 2, column 2, empty' })).toBeEnabled(),
      expect(text('X’s turn — pick any open square')).toExist(),
    )
  })
})
