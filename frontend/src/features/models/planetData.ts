export interface PlanetData {
  id: string;
  name: string;
  size: number;
  distance: number;
  color: string;
  speed: number;
  info: string;
  hasRings?: boolean;
}

export const PLANETS: PlanetData[] = [
  { id: 'mercury', name: 'Mercury', size: 0.35, distance: 4.2, color: '#A59B91', speed: 0.018, info: 'Smallest planet, closest to Sun' },
  { id: 'venus', name: 'Venus', size: 0.55, distance: 6.2, color: '#E3BB7B', speed: 0.014, info: 'Hottest planet in the solar system' },
  { id: 'earth', name: 'Earth', size: 0.62, distance: 8.6, color: '#3B82F6', speed: 0.01, info: 'Our home world, 1 AU from Sun' },
  { id: 'mars', name: 'Mars', size: 0.42, distance: 11.2, color: '#EF4444', speed: 0.008, info: 'The Red Planet, candidate for exploration' },
  { id: 'jupiter', name: 'Jupiter', size: 1.35, distance: 15.0, color: '#F59E0B', speed: 0.005, info: 'Gas giant with Great Red Spot' },
  { id: 'saturn', name: 'Saturn', size: 1.05, distance: 19.2, color: '#FDE047', speed: 0.0035, info: 'Spectacular prominent ring system', hasRings: true },
  { id: 'uranus', name: 'Uranus', size: 0.75, distance: 23.2, color: '#06B6D4', speed: 0.0025, info: 'Ice giant rotating on its side' },
  { id: 'neptune', name: 'Neptune', size: 0.72, distance: 27.0, color: '#6366F1', speed: 0.0018, info: 'Outer ice giant with fastest winds' },
];

export const SUN_DATA: PlanetData = {
  id: 'sun',
  name: 'The Sun',
  size: 2.2,
  distance: 0,
  color: '#FDB813',
  speed: 0,
  info: 'Yellow dwarf star at the center of our solar system, containing 99.8% of system mass',
};
