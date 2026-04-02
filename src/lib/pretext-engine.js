/**
 * Pretext Engine — high-level wrapper around @chenglou/pretext
 *
 * Three capabilities:
 * 1. measureHeight(text, maxWidth) — predict text block height without DOM
 * 2. shrinkwrap(text, maxWidth) — find tightest width that keeps same line count
 * 3. layoutLines(text, maxWidth) — get full line-by-line layout info
 */

import {
  prepare,
  prepareWithSegments,
  layout,
  walkLineRanges,
  layoutWithLines,
} from '@chenglou/pretext'

// Must match CSS: body { font-size: 14px; font-family: 'Inter', …; line-height: 1.6; }
const FONT = '14px Inter'
const LINE_HEIGHT = 22.4 // 14 * 1.6

/**
 * Predict the rendered height of a text block at a given width.
 * Returns { height, lineCount }.
 */
export function measureHeight(text, maxWidth) {
  if (!text) return { height: 0, lineCount: 0 }
  const prepared = prepare(text, FONT)
  const result = layout(prepared, maxWidth, LINE_HEIGHT)
  return { height: result.height, lineCount: result.lineCount }
}

/**
 * Find the narrowest width that keeps the same line count as maxWidth.
 * Returns the shrinkwrapped width (number).
 *
 * Uses binary search: start with [0, maxWidth], find the minimum width
 * where lineCount stays the same as at maxWidth.
 */
export function shrinkwrap(text, maxWidth) {
  if (!text) return 0

  const prepared = prepareWithSegments(text, FONT)

  // Get line count at full width
  let lineCountAtMax = 0
  walkLineRanges(prepared, maxWidth, () => { lineCountAtMax++ })

  if (lineCountAtMax <= 0) return 0

  // Find the widest line — that's our absolute minimum
  let maxLineWidth = 0
  if (lineCountAtMax === 1) {
    // Single line: just find the line width
    walkLineRanges(prepared, maxWidth, (line) => {
      maxLineWidth = line.width
    })
    return Math.ceil(maxLineWidth)
  }

  // Binary search for the narrowest width that keeps same line count
  let lo = 0
  let hi = maxWidth

  while (hi - lo > 1) {
    const mid = (lo + hi) / 2
    let lines = 0
    walkLineRanges(prepared, mid, () => { lines++ })

    if (lines <= lineCountAtMax) {
      hi = mid
    } else {
      lo = mid
    }
  }

  return Math.ceil(hi)
}

/**
 * Get full line-by-line layout information.
 * Returns { height, lineCount, lines } where lines is an array of { text, width, start, end }.
 */
export function getLines(text, maxWidth) {
  if (!text) return { height: 0, lineCount: 0, lines: [] }
  const prepared = prepareWithSegments(text, FONT)
  return layoutWithLines(prepared, maxWidth, LINE_HEIGHT)
}

export { FONT, LINE_HEIGHT }
