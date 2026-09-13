import { Result } from 'effect'
import { Runtime, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  Coordinate,
  GameState,
  emptyGame,
  placeMark,
  undoLastMove,
} from './game'

// MODEL

export const Model = GameState
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedCell: { cell: Coordinate },
  ClickedUndo: {},
  ClickedRestart: {},
})
export type Message = typeof Message.Type

// INIT

export const initialModel = emptyGame()

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: initialModel,
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedCell: ({ cell }) =>
      Result.match(placeMark(model, cell), {
        onFailure: () => ({ model }),
        onSuccess: nextModel => ({ model: nextModel }),
      }),
    ClickedUndo: () => ({ model: undoLastMove(model) }),
    ClickedRestart: () => ({ model: emptyGame() }),
  })
