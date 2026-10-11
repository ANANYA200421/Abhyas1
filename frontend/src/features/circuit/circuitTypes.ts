export type ComponentType =
  | 'battery'
  | 'resistor'
  | 'led'
  | 'bulb'
  | 'switch'
  | 'capacitor'
  | 'ammeter'
  | 'voltmeter';

export interface Terminal {
  id: string; // e.g. 'pos', 'neg', 'a', 'b'
  name: string;
  relativeX: number;
  relativeY: number;
  isPositive?: boolean;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  label: string;
  value?: string;
  isOpen?: boolean; // For switch: true = open (no current), false = closed
  isOn?: boolean;   // For LED or Bulb: whether currently lit up
}

export interface Wire {
  id: string;
  fromCompId: string;
  fromTerminal: string;
  toCompId: string;
  toTerminal: string;
}

export interface CircuitCheckResult {
  isCorrect: boolean;
  title: string;
  reason: string;
  details: string[];
}

export interface SolverResult {
  isClosedLoop: boolean;
  isShortCircuit: boolean;
  activeComponentIds: Set<string>;
  currentAmps: number;
  voltage: number;
  equivalentResistance: number;
  componentCurrents: Record<string, number>;
  componentVoltages: Record<string, number>;
  shortCircuitReason?: string;
  circuitTopology: 'series' | 'parallel' | 'complex' | 'open' | 'short';
}
