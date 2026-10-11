import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CircuitComponent, ComponentType, Wire, CircuitCheckResult } from './circuitTypes';
import { solveCircuit, checkCircuit } from './circuitSolver';
import { actionMapper } from '../../gestures/actionMapper';
import type { ActionPayload } from '../../gestures/types';

// Palette definitions for the 8 components
const PALETTE_ITEMS: { type: ComponentType; label: string; icon: string; value: string }[] = [
  { type: 'battery', label: 'Battery', icon: 'battery_charging_full', value: '9V' },
  { type: 'resistor', label: 'Resistor', icon: 'reorder', value: '220Ω' },
  { type: 'led', label: 'LED', icon: 'light', value: 'Red' },
  { type: 'bulb', label: 'Bulb', icon: 'lightbulb', value: '24Ω' },
  { type: 'switch', label: 'Switch', icon: 'toggle_on', value: 'SPST' },
  { type: 'capacitor', label: 'Capacitor', icon: 'pause', value: '100µF' },
  { type: 'ammeter', label: 'Ammeter', icon: 'speed', value: 'mA' },
  { type: 'voltmeter', label: 'Voltmeter', icon: 'electric_meter', value: 'V' },
];

export const CircuitLab: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Circuit state: components and connecting wires
  const [components, setComponents] = useState<CircuitComponent[]>([
    { id: 'bat-1', type: 'battery', x: 120, y: 220, label: 'Battery', value: '9V' },
    { id: 'res-1', type: 'resistor', x: 280, y: 120, label: 'Resistor', value: '220Ω' },
    { id: 'led-1', type: 'led', x: 440, y: 120, label: 'LED', value: 'Red' },
    { id: 'sw-1', type: 'switch', x: 280, y: 320, label: 'Switch', value: 'SPST', isOpen: true },
  ]);

  const [wires, setWires] = useState<Wire[]>([
    { id: 'w1', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'res-1', toTerminal: 'a' },
    { id: 'w2', fromCompId: 'res-1', fromTerminal: 'b', toCompId: 'led-1', toTerminal: 'a' },
    { id: 'w3', fromCompId: 'led-1', fromTerminal: 'b', toCompId: 'sw-1', toTerminal: 'b' },
    { id: 'w4', fromCompId: 'sw-1', fromTerminal: 'a', toCompId: 'bat-1', toTerminal: 'neg' },
  ]);

  // Selected component / wire for deletion or editing
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [wiringStart, setWiringStart] = useState<{ compId: string; terminal: string } | null>(null);

  // Dragging state (mouse or gesture)
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Evaluation modal
  const [checkResult, setCheckResult] = useState<CircuitCheckResult | null>(null);

  // Compute live current, voltage, resistance & active components via physics solver
  const {
    invalidReason,
    isClosedLoop,
    isShortCircuit,
    activeComponentIds,
    currentAmps,
    voltage,
    equivalentResistance,
    componentCurrents,
    componentVoltages,
  } = solveCircuit(components, wires);

  // Incremental ID generator ref for deterministic IDs
  const nextIdRef = useRef<number>(10);

  // Preset 1: Simple LED Circuit
  const loadPresetLED = () => {
    setComponents([
      { id: 'bat-1', type: 'battery', x: 140, y: 220, label: 'Battery', value: '9V' },
      { id: 'res-1', type: 'resistor', x: 300, y: 130, label: 'Resistor', value: '220Ω' },
      { id: 'led-1', type: 'led', x: 460, y: 130, label: 'LED', value: 'Red' },
      { id: 'sw-1', type: 'switch', x: 300, y: 310, label: 'Switch', value: 'SPST', isOpen: true },
    ]);
    setWires([
      { id: 'w1', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'res-1', toTerminal: 'a' },
      { id: 'w2', fromCompId: 'res-1', fromTerminal: 'b', toCompId: 'led-1', toTerminal: 'a' },
      { id: 'w3', fromCompId: 'led-1', fromTerminal: 'b', toCompId: 'sw-1', toTerminal: 'b' },
      { id: 'w4', fromCompId: 'sw-1', fromTerminal: 'a', toCompId: 'bat-1', toTerminal: 'neg' },
    ]);
    setSelectedCompId(null);
    setCheckResult(null);
  };

  // Preset 2: Measure Current in Series
  const loadPresetSeries = () => {
    setComponents([
      { id: 'bat-1', type: 'battery', x: 120, y: 220, label: 'Battery', value: '9V' },
      { id: 'res-1', type: 'resistor', x: 260, y: 120, label: 'Resistor', value: '100Ω' },
      { id: 'amm-1', type: 'ammeter', x: 400, y: 120, label: 'Ammeter', value: 'mA' },
      { id: 'bulb-1', type: 'bulb', x: 540, y: 220, label: 'Bulb', value: '24Ω' },
      { id: 'sw-1', type: 'switch', x: 330, y: 320, label: 'Switch', value: 'SPST', isOpen: false },
    ]);
    setWires([
      { id: 'w1', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'res-1', toTerminal: 'a' },
      { id: 'w2', fromCompId: 'res-1', fromTerminal: 'b', toCompId: 'amm-1', toTerminal: 'a' },
      { id: 'w3', fromCompId: 'amm-1', fromTerminal: 'b', toCompId: 'bulb-1', toTerminal: 'a' },
      { id: 'w4', fromCompId: 'bulb-1', fromTerminal: 'b', toCompId: 'sw-1', toTerminal: 'b' },
      { id: 'w5', fromCompId: 'sw-1', fromTerminal: 'a', toCompId: 'bat-1', toTerminal: 'neg' },
    ]);
    setSelectedCompId(null);
    setCheckResult(null);
  };

  // Add component from palette onto canvas
  const handleAddComponent = (type: ComponentType, label: string, value: string) => {
    const nextIdx = nextIdRef.current++;
    const newComp: CircuitComponent = {
      id: `${type}-${nextIdx}`,
      type,
      x: 180 + (nextIdx % 4) * 60,
      y: 140 + (nextIdx % 3) * 50,
      label,
      value,
      isOpen: type === 'switch' ? false : undefined,
    };
    setComponents((prev) => [...prev, newComp]);
  };

  // Toggle switch open/closed
  const toggleSwitch = (id: string) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isOpen: !c.isOpen } : c))
    );
  };

  // Delete selected component and connected wires
  const deleteComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
    setWires((prev) => prev.filter((w) => w.fromCompId !== id && w.toCompId !== id));
    setSelectedCompId(null);
  };

  // Delete wire
  const deleteWire = (id: string) => {
    setWires((prev) => prev.filter((w) => w.id !== id));
  };

  // Handle terminal click for wiring
  const handleTerminalClick = (compId: string, terminal: string) => {
    if (!wiringStart) {
      setWiringStart({ compId, terminal });
    } else {
      if (wiringStart.compId !== compId || wiringStart.terminal !== terminal) {
        // Prevent duplicate wires between same two terminals
        const alreadyConnected = wires.some(
          (w) =>
            (w.fromCompId === wiringStart.compId &&
              w.fromTerminal === wiringStart.terminal &&
              w.toCompId === compId &&
              w.toTerminal === terminal) ||
            (w.fromCompId === compId &&
              w.fromTerminal === terminal &&
              w.toCompId === wiringStart.compId &&
              w.toTerminal === wiringStart.terminal)
        );

        if (!alreadyConnected) {
          const wireId = `w-${nextIdRef.current++}`;
          const newWire: Wire = {
            id: wireId,
            fromCompId: wiringStart.compId,
            fromTerminal: wiringStart.terminal,
            toCompId: compId,
            toTerminal: terminal,
          };
          setWires((prev) => [...prev, newWire]);
        }
      }
      setWiringStart(null);
    }
  };

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedCompId(id);
    setDraggingCompId(id);
    const comp = components.find((c) => c.id === id);
    if (comp) {
      dragOffsetRef.current = {
        x: e.clientX - comp.x,
        y: e.clientY - comp.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingCompId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newX = Math.max(20, Math.min(rect.width - 120, e.clientX - rect.left - 40));
    const newY = Math.max(20, Math.min(rect.height - 80, e.clientY - rect.top - 20));

    setComponents((prev) =>
      prev.map((c) => (c.id === draggingCompId ? { ...c, x: newX, y: newY } : c))
    );
  };

  const handleMouseUp = () => {
    setDraggingCompId(null);
  };

  // Gesture Pinch to pick up and drop components
  useEffect(() => {
    const unsubscribe = actionMapper.subscribe((action: ActionPayload) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientX = rect.left + action.point.x * rect.width;
      const clientY = rect.top + action.point.y * rect.height;

      if (action.type === 'PINCH') {
        // Find component under fingertip cursor
        const comp = components.find(
          (c) =>
            clientX >= rect.left + c.x - 20 &&
            clientX <= rect.left + c.x + 120 &&
            clientY >= rect.top + c.y - 20 &&
            clientY <= rect.top + c.y + 80
        );

        if (comp) {
          if (comp.type === 'switch') {
            toggleSwitch(comp.id);
          } else {
            setDraggingCompId(comp.id);
          }
        }
      } else if (action.type === 'PINCH_RELEASE') {
        setDraggingCompId(null);
      } else if (action.type === 'HOVER') {
        if (draggingCompId) {
          const newX = Math.max(20, Math.min(rect.width - 120, action.point.x * rect.width - 40));
          const newY = Math.max(20, Math.min(rect.height - 80, action.point.y * rect.height - 20));
          setComponents((prev) =>
            prev.map((c) => (c.id === draggingCompId ? { ...c, x: newX, y: newY } : c))
          );
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [components, draggingCompId]);

  // Terminal coordinate calculation
  const getTerminalCoords = useCallback((compId: string, term: string): { x: number; y: number } => {
    const comp = components.find((c) => c.id === compId);
    if (!comp) return { x: 0, y: 0 };
    if (comp.type === 'battery') {
      return term === 'pos' ? { x: comp.x + 85, y: comp.y + 26 } : { x: comp.x + 5, y: comp.y + 26 };
    }
    return term === 'a' ? { x: comp.x + 5, y: comp.y + 26 } : { x: comp.x + 85, y: comp.y + 26 };
  }, [components]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="flex-1 flex flex-col h-[calc(100vh-8.5rem)] relative rounded-2xl overflow-hidden bg-[#FAF4FC] border border-[#EDDCEF] shadow-lg select-none"
    >
      {/* Top Controls Header */}
      <div className="h-14 bg-white/95 backdrop-blur-md border-b border-[#EDDCEF] px-5 flex items-center justify-between z-20 shadow-xs">
        {/* Presets & Evaluation */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-[#2F0346] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#813DA2]">memory</span>
            <span>Circuit Lab</span>
          </span>

          <div className="w-[1px] h-5 bg-[#EDDCEF] mx-1"></div>

          {/* Preset 1: Simple LED Circuit */}
          <button
            type="button"
            onClick={loadPresetLED}
            className="px-3 py-1.5 rounded-full bg-[#FAF4FC] hover:bg-[#FBE8FF] text-[#813DA2] border border-[#EDDCEF] text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            Lesson 1: Simple LED
          </button>

          {/* Preset 2: Measure Current in Series */}
          <button
            type="button"
            onClick={loadPresetSeries}
            className="px-3 py-1.5 rounded-full bg-[#FAF4FC] hover:bg-[#FBE8FF] text-[#813DA2] border border-[#EDDCEF] text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            Lesson 2: Current in Series
          </button>
        </div>

        {/* Live Telemetry Readout & Check Circuit Button */}
        <div className="flex items-center gap-3">
          {/* Live Circuit Current & Voltage Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEEFFF] border border-[#F6D9FF] text-xs font-mono font-bold shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isShortCircuit
                  ? 'bg-red-600 animate-ping'
                  : isClosedLoop
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            {invalidReason ? (
              <span className="text-red-600 font-extrabold flex items-center gap-1" role="status">
                <span className="material-symbols-outlined text-[15px]">error</span>
                <span>INVALID CIRCUIT</span>
              </span>
            ) : isShortCircuit ? (
              <span className="text-red-600 font-extrabold flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">warning</span>
                <span>SHORT CIRCUIT (R &lt; 0.2Ω)</span>
              </span>
            ) : (
              <>
                <span className="text-[#813DA2]">
                  I: {isClosedLoop ? (currentAmps < 1.0 ? `${(currentAmps * 1000).toFixed(1)} mA` : `${currentAmps.toFixed(2)} A`) : '0 mA'}
                </span>
                <span className="text-[#7A6F83]">|</span>
                <span className="text-[#2F0346]">V: {voltage.toFixed(1)} V</span>
                {isClosedLoop && isFinite(equivalentResistance) && (
                  <>
                    <span className="text-[#7A6F83]">|</span>
                    <span className="text-indigo-700">R: {Math.round(equivalentResistance)} Ω</span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Check Circuit Button */}
          <button
            type="button"
            onClick={() => setCheckResult(checkCircuit(components, wires))}
            className="px-4 py-1.5 rounded-full bg-[#813DA2] hover:bg-[#702E91] text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">fact_check</span>
            <span>Check Circuit</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Component Palette */}
        <aside className="w-52 bg-white/90 border-r border-[#EDDCEF] p-3 flex flex-col gap-2 overflow-y-auto z-10 shadow-xs">
          <div className="text-[11px] font-bold text-[#7A6F83] uppercase tracking-wider px-1">
            Component Palette
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PALETTE_ITEMS.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => handleAddComponent(item.type, item.label, item.value)}
                className="p-2.5 rounded-xl bg-[#FAF4FC] hover:bg-[#FBE8FF] border border-[#EDDCEF]/80 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer hover:scale-102 shadow-xs group"
              >
                <span className="material-symbols-outlined text-[22px] text-[#813DA2] group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="text-[11px] font-bold text-[#2F0346] leading-tight">
                  {item.label}
                </span>
                <span className="text-[9px] text-[#7A6F83] font-mono">{item.value}</span>
              </button>
            ))}
          </div>

          {/* Wiring Instructions */}
          <div className="mt-auto p-2.5 rounded-xl bg-[#FEEFFF] text-[10px] text-[#7A6F83] leading-relaxed border border-[#F6D9FF]">
            💡 <strong className="text-[#2F0346]">How to Wire:</strong> Click any terminal dot, then another dot to wire. Click any wire to delete it.
          </div>
        </aside>

        {/* Canvas Area with Wires and Draggable Components */}
        <div className="flex-1 relative overflow-hidden bg-[#FAF4FC]">
          {/* Subtle Circuit Grid Pattern */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(129, 61, 162, 0.4) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* SVG Layer for Rendered Wires */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {wires.map((wire) => {
              const start = getTerminalCoords(wire.fromCompId, wire.fromTerminal);
              const end = getTerminalCoords(wire.toCompId, wire.toTerminal);
              const isPowered = isClosedLoop;

              // Curved bezier wire path
              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2 + 15;
              const pathD = wire.fromCompId === wire.toCompId
                ? `M ${start.x} ${start.y} C ${start.x + 40} ${start.y - 70} ${end.x - 40} ${end.y - 70} ${end.x} ${end.y}`
                : `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;

              return (
                <g
                  key={wire.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteWire(wire.id);
                  }}
                  className="pointer-events-auto cursor-pointer group"
                >
                  {/* Invisible wide hit target for easy clicking */}
                  <path d={pathD} fill="none" stroke="transparent" strokeWidth="16" />
                  {/* Outer wire glow if current is flowing */}
                  {isPowered && !isShortCircuit && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#FDE047"
                      strokeWidth="6"
                      strokeOpacity="0.4"
                    />
                  )}
                  {/* Main wire line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={invalidReason ? '#EF4444' : isShortCircuit ? '#EF4444' : isPowered ? '#10B981' : '#813DA2'}
                    className="group-hover:stroke-rose-600 transition-colors"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {/* In-progress wiring rubberband line */}
            {wiringStart && (
              <circle
                cx={getTerminalCoords(wiringStart.compId, wiringStart.terminal).x}
                cy={getTerminalCoords(wiringStart.compId, wiringStart.terminal).y}
                r="7"
                fill="#EF4444"
                className="animate-ping"
              />
            )}
          </svg>

          {/* Electronic Components Nodes */}
          {components.map((comp) => {
            const isSelected = selectedCompId === comp.id;
            const isOn = activeComponentIds.has(comp.id) && isClosedLoop;

            return (
              <div
                key={comp.id}
                onMouseDown={(e) => handleMouseDown(e, comp.id)}
                className={`absolute w-24 h-14 rounded-xl bg-white border-2 shadow-md flex items-center justify-between px-2 cursor-grab active:cursor-grabbing transition-shadow z-20 ${
                  isSelected ? 'border-[#813DA2] ring-2 ring-[#D988ED]' : 'border-[#EDDCEF]'
                }`}
                style={{ left: comp.x, top: comp.y }}
              >
                {/* Left Terminal Dot */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTerminalClick(comp.id, comp.type === 'battery' ? 'neg' : 'a');
                  }}
                  title="Terminal Pin"
                  className="w-3.5 h-3.5 -ml-4 rounded-full bg-[#813DA2] hover:bg-[#10B981] border-2 border-white shadow-xs cursor-pointer"
                />

                {/* Component Symbol & Interactive Graphics */}
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  {/* Battery */}
                  {comp.type === 'battery' && (
                    <div className="flex items-center gap-0.5 text-xs font-bold text-[#813DA2]">
                      <span className="text-[10px] text-red-500 font-mono">-</span>
                      <span className="material-symbols-outlined text-[18px]">battery_charging_full</span>
                      <span className="text-[10px] text-emerald-600 font-mono">+</span>
                    </div>
                  )}

                  {/* Resistor */}
                  {comp.type === 'resistor' && (
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-[18px] text-amber-700">
                        reorder
                      </span>
                      {isClosedLoop && (componentVoltages[comp.id] || 0) > 0.05 && (
                        <span className="text-[8px] font-mono text-amber-900 font-bold -mt-0.5">
                          {(componentVoltages[comp.id] || 0).toFixed(1)}V
                        </span>
                      )}
                    </div>
                  )}

                  {/* LED with Glowing State */}
                  {comp.type === 'led' && (
                    <div className="relative flex items-center justify-center">
                      <span
                        className={`material-symbols-outlined text-[20px] transition-colors ${
                          isOn ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]' : 'text-slate-400'
                        }`}
                      >
                        light
                      </span>
                    </div>
                  )}

                  {/* Bulb with Glowing Filament */}
                  {comp.type === 'bulb' && (
                    <div className="relative flex items-center justify-center">
                      <span
                        className={`material-symbols-outlined text-[22px] transition-all ${
                          isOn ? 'text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,1)] scale-110' : 'text-slate-400'
                        }`}
                      >
                        lightbulb
                      </span>
                    </div>
                  )}

                  {/* Interactive Switch */}
                  {comp.type === 'switch' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSwitch(comp.id);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF4FC] hover:bg-[#FBE8FF] text-[#813DA2] border border-[#EDDCEF] cursor-pointer"
                    >
                      {comp.isOpen ? 'OPEN' : 'CLOSED'}
                    </button>
                  )}

                  {/* Ammeter */}
                  {comp.type === 'ammeter' && (
                    <div className="text-[10px] font-mono font-bold text-blue-600">
                      A: {`${((componentCurrents[comp.id] || 0) * 1000).toFixed(1)}mA`}
                    </div>
                  )}

                  {/* Voltmeter */}
                  {comp.type === 'voltmeter' && (
                    <div className="text-[10px] font-mono font-bold text-purple-600">
                      V: {`${(componentVoltages[comp.id] || 0).toFixed(1)}V`}
                    </div>
                  )}

                  {/* Capacitor */}
                  {comp.type === 'capacitor' && (
                    <span className="material-symbols-outlined text-[18px] text-cyan-600">
                      pause
                    </span>
                  )}

                  <span className="text-[9px] font-semibold text-[#7A6F83] truncate leading-tight">
                    {comp.label}
                  </span>
                </div>

                {/* Right Terminal Dot */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTerminalClick(comp.id, comp.type === 'battery' ? 'pos' : 'b');
                  }}
                  title="Terminal Pin"
                  className="w-3.5 h-3.5 -mr-4 rounded-full bg-[#813DA2] hover:bg-[#10B981] border-2 border-white shadow-xs cursor-pointer"
                />

                {/* Delete button when selected */}
                {isSelected && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteComponent(comp.id);
                    }}
                    title="Delete component"
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs shadow-md cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Check Circuit Analysis Modal */}
      {checkResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-[#EDDCEF] shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${
                  checkResult.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {checkResult.isCorrect ? '✓' : '!'}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2F0346]">{checkResult.title}</h3>
                <p className="text-xs text-[#7A6F83]">Circuit Graph Rule Check</p>
              </div>
            </div>

            <p className="text-xs text-[#4D4350] mb-4 leading-relaxed font-medium">
              {checkResult.reason}
            </p>

            <div className="space-y-1.5 mb-5 bg-[#FAF4FC] p-3 rounded-xl border border-[#EDDCEF]">
              {checkResult.details.map((d, i) => (
                <div key={i} className="text-[11px] text-[#7A6F83] flex items-start gap-1.5">
                  <span>•</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCheckResult(null)}
                className="px-5 py-2 rounded-full bg-[#813DA2] hover:bg-[#702E91] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Gesture Guidance Banner */}
      <div className="h-8 bg-black/75 backdrop-blur-md px-5 flex items-center justify-between text-[11px] text-white/80 font-mono z-20">
        <span className="flex items-center gap-1.5">
          <span>🤏 Pinch: Pick Up &amp; Move Component</span>
          <span className="text-[#D988ED]">•</span>
          <span>Click Switch to Toggle Closed/Open</span>
        </span>
        <span className="text-emerald-400 font-bold">
          {invalidReason
            ? 'Invalid circuit'
            : isShortCircuit
              ? 'Short circuit — current limited'
              : isClosedLoop
                ? '⚡ Loop Closed & Active'
                : 'Circuit Open'}
        </span>
      </div>
    </div>
  );
};
