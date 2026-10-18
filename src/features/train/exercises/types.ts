import type { Exercise, MuscleGroup } from '../../../lib/types'

type Eq = Exercise['equipment']
// [name, group, equipment, compound, lower body, substitutes (names)]
export type Row = [string, MuscleGroup, Eq, boolean, boolean, string[]]
export const R = (name: string, g: MuscleGroup, eq: Eq, c: boolean, lower: boolean, subs: string[] = []): Row => [name, g, eq, c, lower, subs]
