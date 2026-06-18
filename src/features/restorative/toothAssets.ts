// Maps each universal tooth number to one of the 8 anatomical SVG assets.
// Assets are authored crown-up/roots-down (viewBox 0 0 100 200); the upper arch
// is rendered vertically flipped so roots point up into the gum band.
import central from './assets/teeth/tooth-1-central-incisor.svg';
import lateral from './assets/teeth/tooth-2-lateral-incisor.svg';
import canine from './assets/teeth/tooth-3-canine.svg';
import firstPremolar from './assets/teeth/tooth-4-first-premolar.svg';
import secondPremolar from './assets/teeth/tooth-5-second-premolar.svg';
import firstMolar from './assets/teeth/tooth-6-first-molar.svg';
import secondMolar from './assets/teeth/tooth-7-second-molar.svg';
import thirdMolar from './assets/teeth/tooth-8-third-molar.svg';

// Cervical line (crown/root boundary) as a fraction of the figure height, in the
// asset's native orientation (crown at top). ~0.46 across all assets.
export const CERVICAL_FRACTION = 0.46;

// position within arch (1..16) -> asset url
const BY_POSITION: Record<number, string> = {
  1: thirdMolar,
  2: secondMolar,
  3: firstMolar,
  4: firstPremolar,
  5: secondPremolar,
  6: canine,
  7: lateral,
  8: central,
  9: central,
  10: lateral,
  11: canine,
  12: secondPremolar,
  13: firstPremolar,
  14: firstMolar,
  15: secondMolar,
  16: thirdMolar,
};

export function toothAsset(n: number): string {
  const pos = n <= 16 ? n : 33 - n;
  return BY_POSITION[pos] ?? central;
}

// Representative asset per anatomical type — used for primary (lettered) teeth.
export function assetForType(type: 'molar' | 'premolar' | 'canine' | 'incisor', lateral_incisor = false): string {
  switch (type) {
    case 'molar':
      return firstMolar;
    case 'premolar':
      return secondPremolar;
    case 'canine':
      return canine;
    case 'incisor':
    default:
      return lateral_incisor ? lateral : central;
  }
}
