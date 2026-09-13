import { Array, Option } from 'effect'
import { Document, Html, HtmlBuilder } from 'foldkit/html'

import {
  BOARD_SIZE,
  Coordinate,
  GameResult,
  GameStatus,
  type Player,
  ScoredRow,
  cellAt,
} from './game'
import { Message, type Model } from './main'

const playerName = (player: Player): string => (player === 'X' ? 'X' : 'O')

const scoreCard = (
  player: Player,
  score: number,
  isTurn: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Class(
        `score-card score-card-${player.toLowerCase()}${isTurn ? ' is-turn' : ''}`,
      ),
    ],
    [
      h.span([h.Class('score-mark'), h.AriaHidden(true)], [player]),
      h.div(
        [],
        [
          h.span([h.Class('score-label')], [`Player ${player}`]),
          h.strong([h.Class('score-number')], [String(score)]),
        ],
      ),
      isTurn
        ? h.span([h.Class('turn-pencil'), h.AriaHidden(true)], ['✎'])
        : h.empty,
    ],
  )

const cellLabel = (
  row: number,
  column: number,
  maybePlayer: Option.Option<Player>,
): string =>
  Option.match(maybePlayer, {
    onNone: () => `Row ${row + 1}, column ${column + 1}, empty`,
    onSome: player =>
      `Row ${row + 1}, column ${column + 1}, marked ${playerName(player)}`,
  })

const boardCell = (
  model: Model,
  row: number,
  column: number,
  h: HtmlBuilder<Message>,
): Html => {
  const cell = Coordinate.make({ row, column })
  const maybePlayer = cellAt(model, cell)
  const isOccupied = Option.isSome(maybePlayer)
  const isFinished = model.status._tag === 'Finished'

  return h.keyed('button')(
    `${row}-${column}`,
    [
      h.Type('button'),
      h.Class('board-cell'),
      h.AriaLabel(cellLabel(row, column, maybePlayer)),
      h.Disabled(isOccupied || isFinished),
      h.OnClick(Message.ClickedCell({ cell })),
      h.DataAttribute('row', String(row)),
      h.DataAttribute('column', String(column)),
    ],
    [
      Option.match(maybePlayer, {
        onNone: () => h.span([h.AriaHidden(true)], ['']),
        onSome: player =>
          h.span(
            [
              h.AriaHidden(true),
              h.Class(`cell-mark cell-mark-${player.toLowerCase()}`),
            ],
            [player],
          ),
      }),
    ],
  )
}

const scoredLine = (row: ScoredRow, h: HtmlBuilder<Message>): Html => {
  const first = row.cells[0]
  const last = row.cells[row.cells.length - 1]

  if (first === undefined || last === undefined) {
    return h.empty
  }

  return h.keyed('line')(`${row.turnNumber}-${row.direction}`, [
    h.X1(String(first.column + 0.5)),
    h.Y1(String(first.row + 0.5)),
    h.X2(String(last.column + 0.5)),
    h.Y2(String(last.row + 0.5)),
    h.Class(`score-line score-line-${row.player.toLowerCase()}`),
    h.StrokeLinecap('round'),
  ])
}

const gameBoard = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('board-wrap')],
    [
      h.div(
        [
          h.Class('game-board'),
          h.Role('group'),
          h.AriaLabel('Tic Tac Toe game board'),
        ],
        Array.makeBy(BOARD_SIZE * BOARD_SIZE, index =>
          boardCell(
            model,
            Math.floor(index / BOARD_SIZE),
            index % BOARD_SIZE,
            h,
          ),
        ),
      ),
      h.svg(
        [
          h.Class('score-lines'),
          h.ViewBox(`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`),
          h.AriaHidden(true),
          h.PointerEvents('none'),
        ],
        Array.map(model.scoredRows, row => scoredLine(row, h)),
      ),
    ],
  )

const finishedMessage = (result: GameResult, h: HtmlBuilder<Message>): Html =>
  GameResult.match(result, {
    Winner: ({ player }) =>
      h.span([], [`Player ${playerName(player)} wins the page!`]),
    Tie: () => h.span([], ['It’s a tie—good game!']),
  })

const gameStatus = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('status-note'), h.Role('status'), h.AriaLive('polite')],
    [
      GameStatus.match(model.status, {
        Playing: () =>
          model.lastMoveScore > 0
            ? h.span(
                [],
                [
                  `${model.currentPlayer === 'X' ? 'O' : 'X'} scores ${model.lastMoveScore}! `,
                  h.strong([], [`${model.currentPlayer}’s turn`]),
                ],
              )
            : h.span(
                [],
                [
                  h.strong([], [`${model.currentPlayer}’s turn`]),
                  ' — pick any open square',
                ],
              ),
        Finished: ({ result }) => finishedMessage(result, h),
      }),
    ],
  )

const controls = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('game-controls')],
    [
      h.button(
        [
          h.Type('button'),
          h.Class('paper-button'),
          h.Disabled(
            Array.match(model.moves, {
              onEmpty: () => true,
              onNonEmpty: () => false,
            }),
          ),
          h.OnClick(Message.ClickedUndo()),
        ],
        ['Undo last move'],
      ),
      h.button(
        [
          h.Type('button'),
          h.Class('paper-button paper-button-danger'),
          h.OnClick(Message.ClickedRestart()),
        ],
        ['Start a new game'],
      ),
    ],
  )

const rules = (h: HtmlBuilder<Message>): Html =>
  h.aside(
    [h.Class('rules-card'), h.AriaLabel('Quick rules')],
    [
      h.h2([], ['How to play']),
      h.ul(
        [],
        [
          h.li([], ['Take turns writing X or O in any empty square.']),
          h.li([], ['Make exactly four in a straight line to score 1 point.']),
          h.li([], ['One move can score across several directions.']),
          h.li([], ['Five or more in one straight run earns no new point.']),
          h.li([], ['Fill the page. The highest score wins.']),
        ],
      ),
    ],
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Tic Tac Toe: 4 in a Row',
  body: h.div(
    [h.Class('page-shell')],
    [
      h.header(
        [h.Class('game-header')],
        [
          h.div([h.Class('title-doodle'), h.AriaHidden(true)], ['× ○ × ○']),
          h.h1([], ['Tic Tac Toe: 4 in a Row']),
          h.p([], ['Four makes a point. Keep going until the page is full.']),
        ],
      ),
      h.main(
        [h.Class('game-layout')],
        [
          h.section(
            [h.Class('play-area'), h.AriaLabel('Game')],
            [
              h.div(
                [h.Class('scoreboard')],
                [
                  scoreCard(
                    'X',
                    model.scores.X,
                    model.status._tag === 'Playing' &&
                      model.currentPlayer === 'X',
                    h,
                  ),
                  h.div([h.Class('score-divider'), h.AriaHidden(true)], ['vs']),
                  scoreCard(
                    'O',
                    model.scores.O,
                    model.status._tag === 'Playing' &&
                      model.currentPlayer === 'O',
                    h,
                  ),
                ],
              ),
              gameStatus(model, h),
              gameBoard(model, h),
              controls(model, h),
            ],
          ),
          rules(h),
        ],
      ),
      h.footer(
        [],
        [h.p([], ['Made for pencils, paper, and very clever crossings.'])],
      ),
    ],
  ),
})
