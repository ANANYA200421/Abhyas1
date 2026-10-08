import React, { useRef, useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SolarSystem, PLANETS, type PlanetData } from './SolarSystem';
import { actionMapper } from '../../gestures/actionMapper';
import type { ActionPayload, Point2D } from '../../gestures/types';

// Custom GLB Loader Structure for models placed in public/models/
const CustomGLBModel: React.FC<{ modelPath: string }> = ({ modelPath }) => {
  const { scene } = useGLTF(modelPath);
  return <primitive object={scene} scale={2} position={[0, 0, 0]} />;
};

// Fallback placeholder when GLB model file is not yet dropped into public/models/
const GLBPlaceholderCard: React.FC<{ modelName: string }> = ({ modelName }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="p-6 rounded-3xl bg-black/75 backdrop-blur-md border border-white/20 text-center max-w-md shadow-2xl pointer-events-auto">
        <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-3">
          <span className="material-symbols-outlined text-[28px]">favorite</span>
        </div>
        <h3 className="text-base font-bold text-white mb-1">{modelName} 3D Asset</h3>
        <p className="text-xs text-white/70 mb-4 leading-relaxed">
          Ready to render! Place <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300">heart.glb</code> inside{' '}
          <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300">frontend/public/models/</code> to automatically display the complete interactive heart organ.
        </p>
        <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-[11px] font-mono">
          GLB Loader Structure Active
        </span>
      </div>
    </div>
  );
};

// Interactive 3D scene controller managing gesture rotation, zoom, and raycasting
interface SceneControllerProps {
  modelType: 'solar-system' | 'heart-glb';
  highlightedPlanet: PlanetData | null;
  onHoverPlanet: (planet: PlanetData | null) => void;
  onSelectPlanet: (planet: PlanetData) => void;
  gestureCursor: Point2D | null;
  gestureAction: string | null;
  resetTrigger: number;
}

const SceneController: React.FC<SceneControllerProps> = ({
  modelType,
  highlightedPlanet,
  onHoverPlanet,
  onSelectPlanet,
  gestureCursor,
  gestureAction,
  resetTrigger,
}) => {
  const { camera, raycaster, scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);

  const prevCursorRef = useRef<Point2D | null>(null);

  // Handle Camera & Rotation Reset
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
    camera.position.set(0, 22, 38);
    camera.lookAt(0, 0, 0);
    if (groupRef.current) {
      groupRef.current.rotation.set(0, 0, 0);
    }
  }, [resetTrigger, camera]);

  // Gesture interaction loop: open palm rotate, pinch zoom, and index point highlight
  useFrame(() => {
    if (!gestureCursor) {
      prevCursorRef.current = null;
      return;
    }

    if (prevCursorRef.current) {
      const dx = gestureCursor.x - prevCursorRef.current.x;
      const dy = gestureCursor.y - prevCursorRef.current.y;

      // 1. OPEN PALM -> Rotate Model
      if (gestureAction === 'OPEN_PALM' || gestureAction === 'ROTATE') {
        if (groupRef.current) {
          groupRef.current.rotation.y += dx * 6;
          groupRef.current.rotation.x += dy * 4;
        }
      }

      // 2. PINCH + MOVE -> Zoom Camera In / Out
      if (gestureAction === 'PINCH') {
        const zoomDelta = dy * 40;
        camera.position.z = THREE.MathUtils.clamp(camera.position.z + zoomDelta, 8, 85);
      }
    }

    prevCursorRef.current = { ...gestureCursor };

    // 3. INDEX POINT -> Raycast to highlight planet and show name
    if (gestureAction === 'INDEX_POINT' || gestureAction === 'HOVER') {
      // Convert normalized (0-1) to NDC (-1 to +1)
      const ndcX = gestureCursor.x * 2 - 1;
      const ndcY = -(gestureCursor.y * 2 - 1);

      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        // Find if intersected object is near a planet
        const hit = intersects[0];
        const hitPlanet = PLANETS.find(
          (p) => hit.point && Math.hypot(hit.point.x - p.distance, hit.point.z) < p.size * 2
        );
        if (hitPlanet) {
          onHoverPlanet(hitPlanet);
        }
      }
    }
  });

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={6}
        maxDistance={90}
      />
      <ambientLight intensity={0.45} />
      <directionalLight position={[10, 20, 15]} intensity={1.2} />

      <group ref={groupRef}>
        {modelType === 'solar-system' ? (
          <SolarSystem
            highlightedPlanet={highlightedPlanet}
            onHoverPlanet={onHoverPlanet}
            onSelectPlanet={onSelectPlanet}
          />
        ) : (
          <Suspense fallback={null}>
            <CustomGLBModel modelPath="/models/heart.glb" />
          </Suspense>
        )}
      </group>
    </>
  );
};

export const ModelViewer: React.FC = () => {
  const [modelType, setModelType] = useState<'solar-system' | 'heart-glb'>('solar-system');
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [highlightedPlanet, setHighlightedPlanet] = useState<PlanetData | null>(null);
  const [resetCount, setResetCount] = useState(0);

  // Gesture tracking state
  const [gestureCursor, setGestureCursor] = useState<Point2D | null>(null);
  const [gestureAction, setGestureAction] = useState<string | null>(null);

  // Subscribe to gesture actions
  useEffect(() => {
    const unsubscribe = actionMapper.subscribe((action: ActionPayload) => {
      setGestureCursor(action.point);
      setGestureAction(action.type);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleReset = useCallback(() => {
    setResetCount((c) => c + 1);
    setSelectedPlanet(null);
    setHighlightedPlanet(null);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-8.5rem)] relative rounded-2xl overflow-hidden bg-[#0B0514] border border-[#7A3A9A]/30 shadow-2xl select-none">
      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 22, 38], fov: 48 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <color attach="background" args={['#080310']} />
        <Stars radius={100} depth={50} count={3500} factor={4} saturation={0.5} fade speed={1} />
        <SceneController
          modelType={modelType}
          highlightedPlanet={highlightedPlanet}
          onHoverPlanet={setHighlightedPlanet}
          onSelectPlanet={setSelectedPlanet}
          gestureCursor={gestureCursor}
          gestureAction={gestureAction}
          resetTrigger={resetCount}
        />
      </Canvas>

      {/* Top HUD Controls: Model Switcher & Reset Button */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Model Switcher Dropdown */}
          <div className="flex items-center bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/15 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setModelType('solar-system');
                setSelectedPlanet(null);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                modelType === 'solar-system'
                  ? 'bg-[#813DA2] text-white shadow-md'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">public</span>
              <span>Solar System</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModelType('heart-glb');
                setSelectedPlanet(null);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                modelType === 'heart-glb'
                  ? 'bg-[#813DA2] text-white shadow-md'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">favorite</span>
              <span>Human Heart (.glb)</span>
            </button>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            data-gesture-target="action-reset-3d"
            onClick={handleReset}
            className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 hover:text-white border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Reset View</span>
          </button>
        </div>

        {/* Gesture Guidance Banner */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/80 text-[11px] font-mono border border-white/15">
            🖐️ Open Palm Move: Rotate • 🤏 Pinch Move: Zoom • ☝️ Point: Highlight
          </span>
        </div>
      </div>

      {/* Selected / Highlighted Planet Callout Card */}
      {(selectedPlanet || highlightedPlanet) && (
        <div className="absolute bottom-5 left-6 z-20 max-w-sm p-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/20 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/30"
                style={{ backgroundColor: (selectedPlanet || highlightedPlanet)?.color }}
              />
              <h4 className="text-sm font-bold text-white">
                {(selectedPlanet || highlightedPlanet)?.name}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPlanet(null);
                setHighlightedPlanet(null);
              }}
              className="text-white/60 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            {(selectedPlanet || highlightedPlanet)?.info}
          </p>
          <div className="mt-2.5 flex items-center gap-3 text-[10px] font-mono text-white/60 border-t border-white/10 pt-1.5">
            <span>Size: {(selectedPlanet || highlightedPlanet)?.size}x</span>
            <span>Orbit: {(selectedPlanet || highlightedPlanet)?.distance} AU</span>
            <span>Speed: {(selectedPlanet || highlightedPlanet)?.speed} rad/s</span>
          </div>
        </div>
      )}

      {/* GLB File Upload structure helper */}
      {modelType === 'heart-glb' && <GLBPlaceholderCard modelName="Human Heart" />}
    </div>
  );
};
