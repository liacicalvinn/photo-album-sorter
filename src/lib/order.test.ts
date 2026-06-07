import { expect, test } from 'bun:test'
import { arrayMove, chronoCompare, reindex } from './order'
import type { Photo } from '../db/types'

function p(partial: Partial<Photo>): Photo {
  return {
    id: partial.id ?? 'x',
    chapterId: 'c',
    order: partial.order ?? 0,
    name: partial.name ?? 'a.jpg',
    type: 'image/jpeg',
    size: 0,
    importedAt: partial.importedAt ?? 0,
    exifDate: partial.exifDate,
  }
}

test('arrayMove moves forward and backward', () => {
  expect(arrayMove(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  expect(arrayMove(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
})

test('chronoCompare: EXIF date wins, then filename, then importedAt', () => {
  // earlier EXIF date sorts first
  expect(chronoCompare(p({ exifDate: 100 }), p({ exifDate: 200 }))).toBeLessThan(0)
  // photo with a date sorts before one without
  expect(chronoCompare(p({ exifDate: 100 }), p({ exifDate: undefined }))).toBeLessThan(0)
  // no dates → natural filename order (IMG_2 before IMG_10)
  expect(
    chronoCompare(p({ name: 'IMG_2.jpg' }), p({ name: 'IMG_10.jpg' })),
  ).toBeLessThan(0)
})

test('reindex returns only rows whose order changed, contiguous 0..n-1', () => {
  const byId: Record<string, Photo> = {
    a: p({ id: 'a', order: 0 }),
    b: p({ id: 'b', order: 1 }),
    c: p({ id: 'c', order: 2 }),
  }
  // move c to front → c:0, a:1, b:2 ; a and c changed, b changed too (1->2)
  const changed = reindex(['c', 'a', 'b'], byId)
  expect(changed).toEqual([
    { id: 'c', order: 0 },
    { id: 'a', order: 1 },
    { id: 'b', order: 2 },
  ])
  // no-op ordering produces no writes
  expect(reindex(['a', 'b', 'c'], byId)).toEqual([])
})
