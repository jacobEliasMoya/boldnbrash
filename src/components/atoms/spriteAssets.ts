export const mobileSpriteQueries = [
  '(max-width: 760px)',
  '(pointer: coarse) and (max-height: 560px)',
]
export const mobileSpriteMedia = mobileSpriteQueries.join(', ')

export const mobileLoaderAtlas = {
  src: '/images/mini-jacob-loader/mobile-atlas.webp?v=1',
  columns: 6,
  // All frames use the same crop from the 960 × 540 mobile export.
  left: 387,
  top: 0,
  width: 186,
  height: 469,
  scale: 1280 / 960,
}
