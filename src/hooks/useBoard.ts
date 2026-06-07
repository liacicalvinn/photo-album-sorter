import { useLiveQuery } from 'dexie-react-hooks'
import { loadBoardState } from '../db/board'
import type { BoardState } from '../db/types'

/** Reactive BoardState. Re-runs automatically on any relevant DB write. */
export function useBoard(): BoardState | undefined {
  return useLiveQuery(loadBoardState, [], undefined)
}
