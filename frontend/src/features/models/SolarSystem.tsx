import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

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

interface PlanetNodeProps {
  planet: PlanetData;
  isHighlighted: boolean;
  onHover: (planet: PlanetData | null) => void;
  onClick: (planet: PlanetData) => void;
}

const PlanetNode: React.FC<PlanetNodeProps> = ({
  planet,
  isHighlighted,
  onHover,
  onClick,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);

  // Orbit rotation
  useFrame((_, delta) => {
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.y += planet.speed * delta * 8;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    <group ref={orbitGroupRef}>
      {/* Visual Orbit Path Line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[planet.distance - 0.03, planet.distance + 0.03, 64]} />
        <meshBasicMaterial color="#7A3A9A" opacity={0.25} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* Planet Body */}
      <mesh
        ref={meshRef}
        position={[planet.distance, 0, 0]}
        scale={isHighlighted ? 1.25 : 1}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(planet);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onClick(planet);
        }}
      >
        <sphereGeometry args={[planet.size, 32, 32]} />
        <meshStandardMaterial
          color={planet.color}
          roughness={0.7}
          metalness={0.1}
          emissive={isHighlighted ? planet.color : '#000000'}
          emissiveIntensity={isHighlighted ? 0.4 : 0}
        />

        {/* Saturn Rings */}
        {planet.hasRings && (
          <mesh rotation={[-Math.PI / 3, 0, 0]}>
            <ringGeometry args={[planet.size * 1.3, planet.size * 2.2, 48]} />
            <meshStandardMaterial
              color="#EAB308"
              opacity={0.75}
              transparent
              side={THREE.DoubleSide}
              roughness={0.8}
            />
          </mesh>
        )}

        {/* Planet Label Tag */}
        <Html distanceFactor={28} position={[0, planet.size + 0.5, 0]} center>
          <div
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight whitespace-nowrap transition-all pointer-events-none select-none ${
              isHighlighted
                ? 'bg-[#813DA2] text-white shadow-lg ring-2 ring-[#D988ED] scale-110'
                : 'bg-black/60 backdrop-blur-sm text-white/80 border border-white/20'
            }`}
          >
            {planet.name}
          </div>
        </Html>
      </mesh>
    </group>
  );
};

interface SolarSystemProps {
  highlightedPlanet: PlanetData | null;
  onHoverPlanet: (planet: PlanetData | null) => void;
  onSelectPlanet: (planet: PlanetData) => void;
}

export const SolarSystem: React.FC<SolarSystemProps> = ({
  highlightedPlanet,
  onHoverPlanet,
  onSelectPlanet,
}) => {
  const sunRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <group>
      {/* Central Sun */}
      <mesh
        ref={sunRef}
        position={[0, 0, 0]}
        onClick={() =>
          onSelectPlanet({
            id: 'sun',
            name: 'The Sun',
            size: 2.2,
            distance: 0,
            color: '#FDB813',
            speed: 0,
            info: 'Yellow dwarf star at the center of our solar system, containing 99.8% of system mass',
          })
        }
      >
        <sphereGeometry args={[2.0, 32, 32]} />
        <meshStandardMaterial
          color="#FDB813"
          emissive="#F59E0B"
          emissiveIntensity={1.2}
          roughness={0.3}
        />
        {/* Sun Glow Corona */}
        <pointLight color="#FDE047" intensity={3.5} distance={70} decay={1.5} />
        <Html distanceFactor={25} position={[0, 2.5, 0]} center>
          <div className="px-2.5 py-0.5 rounded-full bg-amber-500/80 backdrop-blur-md text-white font-bold text-[11px] shadow-lg pointer-events-none">
            ☀️ The Sun
          </div>
        </Html>
      </mesh>

      {/* Orbiting Planets */}
      {PLANETS.map((planet) => (
        <PlanetNode
          key={planet.id}
          planet={planet}
          isHighlighted={highlightedPlanet?.id === planet.id}
          onHover={onHoverPlanet}
          onClick={onSelectPlanet}
        />
      ))}
    </group>
  );
};
