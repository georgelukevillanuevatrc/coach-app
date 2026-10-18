import type { Row } from './types'

// Alcohol kcal come from ethanol, so these rows are exempt from the macro-sum check (tagged 'alcohol').
export const ROWS: Row[] = [
  ['Beer (regular)', '1 bottle', 330, 150, 1.5, 12, 0, 'alcohol san mig pale pilsen'],
  ['Red Horse beer', '1 bottle', 500, 235, 2, 17, 0, 'alcohol strong beer'],
  ['San Miguel Light', '1 bottle', 330, 100, 1, 5, 0, 'alcohol light beer'],
  ['Craft beer / IPA', '1 pint', 473, 215, 2, 18, 0, 'alcohol'],
  ['Red wine', '1 glass', 150, 125, 0.1, 4, 0, 'alcohol'],
  ['White wine', '1 glass', 150, 120, 0.1, 4, 0, 'alcohol'],
  ['Champagne / sparkling wine', '1 flute', 120, 90, 0.2, 2, 0, 'alcohol prosecco'],
  ['Brandy (Emperador)', '1 shot', 44, 105, 0, 0, 0, 'alcohol emperador'],
  ['Whiskey', '1 shot', 44, 105, 0, 0, 0, 'alcohol whisky'],
  ['Vodka', '1 shot', 44, 97, 0, 0, 0, 'alcohol'],
  ['Gin', '1 shot', 44, 97, 0, 0, 0, 'alcohol ginebra'],
  ['Rum', '1 shot', 44, 97, 0, 0, 0, 'alcohol tanduay'],
  ['Tequila', '1 shot', 44, 97, 0, 0, 0, 'alcohol'],
  ['Lambanog', '1 shot', 44, 110, 0, 0, 0, 'alcohol coconut'],
  ['Tuba', '1 glass', 240, 120, 0, 12, 0, 'alcohol coconut wine'],
  ['Soju', '1 shot glass', 50, 70, 0, 3, 0, 'alcohol korean'],
  ['Sake', '1 cup', 180, 200, 0.5, 8, 0, 'alcohol japanese'],
  ['Mojito / cocktail', '1 drink', 200, 200, 0, 20, 0, 'alcohol'],
  ['Margarita', '1 drink', 240, 275, 0, 30, 0, 'alcohol cocktail'],
  ['Gin and tonic', '1 drink', 250, 170, 0, 14, 0, 'alcohol'],
  ['Rum and coke', '1 drink', 250, 190, 0, 20, 0, 'alcohol'],
  ['Hard seltzer', '1 can', 355, 100, 0, 2, 0, 'alcohol'],
]
