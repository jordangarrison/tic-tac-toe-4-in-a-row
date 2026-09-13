# Tic Tac Toe: 4 in a Row — game specification v0.1

## Goal

Two players, X and O, fill an 8×8 board. Players earn points throughout the game by completing straight, contiguous runs of exactly four of their own marks. The player with the higher score after all 64 cells are occupied wins.

## Turn rules

1. X takes the first turn.
2. Players alternate X, O, X, O.
3. A player places their mark in any empty cell. There is no gravity.
4. A mark cannot be moved or replaced. Placing outside the board, in an occupied cell, or after the game ends is invalid.
5. After a legal placement, score every qualifying line through the new mark and then pass the turn.

## Scoring

The four independently scored axes are:

- horizontal
- vertical
- diagonal down-right / up-left
- diagonal up-right / down-left

For each axis, find the complete contiguous run of the current player's marks containing the newly placed mark.

| Complete run length | Points on that axis |
| ------------------- | ------------------: |
| 0–3                 |                   0 |
| exactly 4           |                   1 |
| 5–8                 |                   0 |

A move can therefore earn between 0 and 4 points. Lines may cross, and a mark from an earlier scoring line may participate in a later line on another axis.

Scoring is event-based. A point already earned is never removed merely because a later move extends that run to five. The extending move earns no new point on that axis. Likewise, filling a gap that joins two groups into a contiguous run of five or more earns no point on that axis; overlapping windows of four are never counted.

Every scored row records its player, direction, four coordinates, and turn number so the interface can keep its line visible.

## End of game

The game ends immediately after the 64th legal placement. The larger score wins; equal scores are a tie. Completing a four does not end the game.

## Undo and restart

The local v0.1 interface provides two conveniences:

- **Undo last move** removes the most recent mark and every point and scored row created by that move, restores that player as the current player, and reopens a finished game.
- **Start a new game** discards the current game and returns to an empty board with X to move.

Undo does not rewrite earlier scoring history. For example, undoing a fifth mark leaves an earlier four-point intact.

## Implementation invariant

Only the four axes through the newly placed mark are examined. Existing lines elsewhere cannot change on that turn.
