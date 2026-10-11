import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { PLANETS, SUN_DATA, type PlanetData } from './planetData';

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

        {/* Planet Label Tag rendered natively in WebGL */}
        <Billboard position={[0, planet.size + 0.7, 0]}>
          <Text
            fontSize={0.55}
            color={isHighlighted ? '#FFFFFF' : '#E2E8F0'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.06}
            outlineColor={isHighlighted ? '#813DA2' : '#0F172A'}
          >
            {planet.name}
          </Text>
        </Billboard>
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
        onClick={() => onSelectPlanet(SUN_DATA)}
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
        <Billboard position={[0, 2.8, 0]}>
          <Text
            fontSize={0.8}
            color="#FEF08A"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.08}
            outlineColor="#78350F"
          >
            ☀️ The Sun
          </Text>
        </Billboard>
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
