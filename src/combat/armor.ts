import { scaleDamages, totalDamage, type Damages } from './damage'

/** The game's armor curve (HitData.DamageTypes.ApplyArmor), used for body armor and block power alike. */
export function applyArmor(damage: number, armor: number): number {
  if (armor <= 0 || damage <= 0) return Math.max(0, damage)
  return armor < damage / 2 ? damage - armor : (damage / (armor * 4)) * damage
}

/** Armor works on the total of a hit, then shares what is left out between its types. */
export function applyArmorTo(damages: Damages, armor: number): Damages {
  const total = totalDamage(damages)
  if (armor <= 0 || total <= 0) return damages
  return scaleDamages(damages, applyArmor(total, armor) / total)
}
