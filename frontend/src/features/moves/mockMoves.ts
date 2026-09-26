/**
 * Deprecated: Mock movement data removed.
 * Stock movements are fetched directly from the backend API (GET /api/stock-movements).
 */
import { StockMove } from './types'

export const INITIAL_MOVES: StockMove[] = []

export function getMockMoves(): StockMove[] {
  return []
}
