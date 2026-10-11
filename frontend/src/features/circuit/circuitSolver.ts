import type { CircuitComponent, Wire, CircuitCheckResult, SolverResult } from './circuitTypes';

/**
 * Parses electrical resistance string into Ohms (Ω).
 * Handles formats: "220Ω", "100Ω", "1kΩ", "4.7kΩ", "10k", "1MΩ", "47", etc.
 */
export function parseResistance(val?: string): number {
  if (!val) return Number.NaN;
  const match = val.trim().match(/^((?:\d+(?:\.\d*)?|\.\d+))\s*([kKmM]?)\s*(?:Ω|Ω|ohms?)?$/i);
  if (!match) return Number.NaN;

  const number = Number(match[1]);
  const multiplier = match[2] === 'k' || match[2] === 'K'
    ? 1_000
    : match[2] === 'm'
      ? 0.001
      : match[2] === 'M'
        ? 1_000_000
        : 1;
  const resistance = number * multiplier;
  return Number.isFinite(resistance) && resistance > 0 ? resistance : Number.NaN;
}

/**
 * Parses voltage string into Volts (V).
 * Handles formats: "9V", "12V", "1.5V", "5V", etc.
 */
export function parseVoltage(val?: string): number {
  if (!val) return Number.NaN;
  const match = val.trim().match(/^((?:\d+(?:\.\d*)?|\.\d+))\s*V?$/i);
  if (!match) return Number.NaN;
  const voltage = Number(match[1]);
  return Number.isFinite(voltage) && voltage > 0 ? voltage : Number.NaN;
}

const BATTERY_INTERNAL_RESISTANCE = 0.4;
const CURRENT_EPSILON = 1e-12;

function invalidResult(reason: string): SolverResult {
  return {
    isClosedLoop: false,
    isShortCircuit: false,
    activeComponentIds: new Set(),
    currentAmps: 0,
    voltage: 0,
    equivalentResistance: Infinity,
    componentCurrents: {},
    componentVoltages: {},
    invalidReason: reason,
    circuitTopology: 'invalid',
  };
}

/**
 * Disjoint-Set (Union-Find) helper to find equipotential electrical nodes.
 */
class UnionFind {
  private parent = new Map<string, string>();

  find(item: string): string {
    if (!this.parent.has(item)) {
      this.parent.set(item, item);
      return item;
    }
    const p = this.parent.get(item)!;
    if (p === item) return item;
    const root = this.find(p);
    this.parent.set(item, root);
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootA, rootB);
    }
  }
}

/**
 * Solves arbitrary circuit networks using Modified Nodal Analysis (MNA),
 * applying Ohm's Law and Kirchhoff's Laws (KCL & KVL) consistently.
 */
export function solveCircuit(
  components: CircuitComponent[],
  wires: Wire[]
): SolverResult {
  const battery = components.find((c) => c.type === 'battery');

  if (!battery) {
    return {
      isClosedLoop: false,
      isShortCircuit: false,
      activeComponentIds: new Set(),
      currentAmps: 0,
      voltage: 0,
      equivalentResistance: Infinity,
      componentCurrents: {},
      componentVoltages: {},
      circuitTopology: 'open',
    };
  }

  const componentById = new Map<string, CircuitComponent>();
  for (const component of components) {
    if (!component.id || componentById.has(component.id)) {
      return invalidResult('Every component must have a unique, non-empty ID.');
    }
    componentById.set(component.id, component);
  }

  if (components.filter((component) => component.type === 'battery').length > 1) {
    return invalidResult('Only one battery is supported in a circuit.');
  }

  const vSource = parseVoltage(battery.value);
  if (!Number.isFinite(vSource)) {
    return invalidResult(`Battery "${battery.label}" must have a valid positive voltage.`);
  }
  if (vSource > 1_000_000) {
    return invalidResult(`Battery "${battery.label}" voltage is outside the supported safe range.`);
  }

  for (const component of components) {
    if (component.type === 'resistor' || component.type === 'bulb') {
      const resistance = parseResistance(component.value);
      if (!Number.isFinite(resistance) || resistance < 1e-6 || resistance > 1e12) {
        return invalidResult(
          `${component.label} must have a valid resistance from 1 µΩ to 1 TΩ.`
        );
      }
    }
  }

  for (const wire of wires) {
    const from = componentById.get(wire.fromCompId);
    const to = componentById.get(wire.toCompId);
    const fromTerminals = from?.type === 'battery' ? ['pos', 'neg'] : ['a', 'b'];
    const toTerminals = to?.type === 'battery' ? ['pos', 'neg'] : ['a', 'b'];
    if (
      !from ||
      !to ||
      !fromTerminals.includes(wire.fromTerminal) ||
      !toTerminals.includes(wire.toTerminal)
    ) {
      return invalidResult(`Wire "${wire.id}" references a missing component or terminal.`);
    }
  }

  // 1. Group connected terminals into equipotential electrical nodes
  const uf = new UnionFind();

  // Initialize all terminals in the union-find
  for (const comp of components) {
    if (comp.type === 'battery') {
      uf.find(`${comp.id}:pos`);
      uf.find(`${comp.id}:neg`);
    } else {
      uf.find(`${comp.id}:a`);
      uf.find(`${comp.id}:b`);
    }
  }

  // Wires connect terminals into common nodes
  for (const wire of wires) {
    const t1 = `${wire.fromCompId}:${wire.fromTerminal}`;
    const t2 = `${wire.toCompId}:${wire.toTerminal}`;
    uf.union(t1, t2);
  }

  const batPosNode = uf.find(`${battery.id}:pos`);
  const batNegNode = uf.find(`${battery.id}:neg`);

  // 2. Direct Short Circuit Check: Positive wired directly to Negative
  if (batPosNode === batNegNode) {
    return {
      isClosedLoop: true,
      isShortCircuit: true,
      activeComponentIds: new Set([battery.id]),
      currentAmps: vSource / BATTERY_INTERNAL_RESISTANCE,
      voltage: 0,
      equivalentResistance: 0,
      componentCurrents: { [battery.id]: vSource / BATTERY_INTERNAL_RESISTANCE },
      componentVoltages: { [battery.id]: 0 },
      shortCircuitReason: 'Battery terminals connected directly with near-zero load resistance.',
      circuitTopology: 'short',
    };
  }

  // 3. Map all unique electrical nodes to integer indices
  const allTerminals: string[] = [];
  for (const comp of components) {
    if (comp.type === 'battery') {
      allTerminals.push(`${comp.id}:pos`, `${comp.id}:neg`);
    } else {
      allTerminals.push(`${comp.id}:a`, `${comp.id}:b`);
    }
  }

  const nodeSet = new Set<string>();
  for (const t of allTerminals) {
    nodeSet.add(uf.find(t));
  }
  const nodes = Array.from(nodeSet);
  const nodeIndex = new Map<string, number>();
  nodes.forEach((n, idx) => nodeIndex.set(n, idx));

  const posIdx = nodeIndex.get(batPosNode)!;
  const negIdx = nodeIndex.get(batNegNode)!;
  const numNodes = nodes.length;

  // 4. Branch definition
  interface Branch {
    compId: string;
    type: string;
    u: number;
    v: number;
    r: number;
    isLED?: boolean;
    anodeIdx?: number;
    cathodeIdx?: number;
    isOpen?: boolean;
  }

  const branches: Branch[] = [];

  for (const comp of components) {
    if (comp.type === 'battery') continue;

    const u = nodeIndex.get(uf.find(`${comp.id}:a`))!;
    const v = nodeIndex.get(uf.find(`${comp.id}:b`))!;

    if (u === v) continue; // Component terminals shorted to same node

    let r = 100;
    let isOpen = false;
    let isLED = false;

    if (comp.type === 'resistor') {
      r = parseResistance(comp.value);
    } else if (comp.type === 'bulb') {
      r = parseResistance(comp.value);
    } else if (comp.type === 'switch') {
      if (comp.isOpen) {
        isOpen = true;
      } else {
        r = 0.005; // Closed switch near-zero resistance
      }
    } else if (comp.type === 'ammeter') {
      r = 0.005; // Ideal ammeter near-zero resistance
    } else if (comp.type === 'voltmeter') {
      r = 1e7; // Ideal voltmeter high impedance 10MΩ
    } else if (comp.type === 'capacitor') {
      isOpen = true; // DC steady state: capacitor blocks current
    } else if (comp.type === 'led') {
      isLED = true;
      r = 15.0;
    }

    branches.push({
      compId: comp.id,
      type: comp.type,
      u,
      v,
      r,
      isOpen,
      isLED,
      anodeIdx: u,
      cathodeIdx: v,
    });
  }

  // 5. Solve linear system MNA: G * V = I with ground at negIdx
  // Function to solve for given active branch states
  const solveSystem = (activeBranches: Branch[]): { nodeVoltages: number[]; iBattery: number } | null => {
    // Unknowns: node voltages V[0..numNodes-1], plus battery current iBat
    // Dim = numNodes + 1
    const dim = numNodes + 1;
    const A: number[][] = Array.from({ length: dim }, () => Array(dim).fill(0));
    const B: number[] = Array(dim).fill(0);

    // Fix one reference voltage in each disconnected conductive network.
    const adjacency = Array.from({ length: numNodes }, () => new Set<number>());
    adjacency[posIdx].add(negIdx);
    adjacency[negIdx].add(posIdx);
    for (const branch of activeBranches) {
      if (!branch.isOpen) {
        adjacency[branch.u].add(branch.v);
        adjacency[branch.v].add(branch.u);
      }
    }

    const referenceNodes = new Set<number>([negIdx]);
    const visited = new Set<number>();
    for (let node = 0; node < numNodes; node++) {
      if (visited.has(node)) continue;
      const stack = [node];
      let reference = node;
      let includesGround = false;
      visited.add(node);
      while (stack.length > 0) {
        const current = stack.pop()!;
        reference = Math.min(reference, current);
        includesGround ||= current === negIdx;
        for (const neighbor of adjacency[current]) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            stack.push(neighbor);
          }
        }
      }
      if (!includesGround) referenceNodes.add(reference);
    }

    for (const reference of referenceNodes) {
      A[reference][reference] = 1;
      B[reference] = 0;
    }

    for (const branch of activeBranches) {
      if (!branch.isOpen && branch.isLED) {
        const g = 1.0 / branch.r;
        B[branch.u] += 2 * g;
        B[branch.v] -= 2 * g;
      }
    }
    for (const reference of referenceNodes) B[reference] = 0;

    // Node KCL equations, excluding the reference node in each network.
    for (let i = 0; i < numNodes; i++) {
      if (referenceNodes.has(i)) continue;

      for (const b of activeBranches) {
        if (b.isOpen) continue;
        const g = 1.0 / b.r;
        if (b.u === i) {
          A[i][b.u] += g;
          A[i][b.v] -= g;
        }
        if (b.v === i) {
          A[i][b.v] += g;
          A[i][b.u] -= g;
        }
      }
    }

    // Battery KCL contribution at posIdx: current iBat leaves posIdx
    A[posIdx][numNodes] = 1;

    // Thevenin battery model limits fault current using its internal resistance.
    A[numNodes][posIdx] = 1;
    A[numNodes][negIdx] = -1;
    A[numNodes][numNodes] = -BATTERY_INTERNAL_RESISTANCE;
    B[numNodes] = vSource;

    // Gaussian elimination with partial pivoting
    for (let p = 0; p < dim; p++) {
      let maxRow = p;
      for (let r = p + 1; r < dim; r++) {
        if (Math.abs(A[r][p]) > Math.abs(A[maxRow][p])) {
          maxRow = r;
        }
      }
      if (Math.abs(A[maxRow][p]) < 1e-18) return null;

      // Swap rows
      [A[p], A[maxRow]] = [A[maxRow], A[p]];
      [B[p], B[maxRow]] = [B[maxRow], B[p]];

      // Eliminate below
      for (let r = p + 1; r < dim; r++) {
        const factor = A[r][p] / A[p][p];
        for (let c = p; c < dim; c++) {
          A[r][c] -= factor * A[p][c];
        }
        B[r] -= factor * B[p];
      }
    }

    // Back substitution
    const x = Array(dim).fill(0);
    for (let r = dim - 1; r >= 0; r--) {
      let sum = B[r];
      for (let c = r + 1; c < dim; c++) {
        sum -= A[r][c] * x[c];
      }
      if (Math.abs(A[r][r]) > 1e-12) {
        x[r] = sum / A[r][r];
      }
    }

    return {
      nodeVoltages: x.slice(0, numNodes),
      iBattery: x[numNodes],
    };
  };

  // Disable reverse-biased LEDs and re-solve until the remaining forward-biased
  // LED network is consistent.
  let activeBranches = branches;
  let sol: { nodeVoltages: number[]; iBattery: number } | null = null;
  for (let iteration = 0; iteration <= branches.length; iteration++) {
    sol = solveSystem(activeBranches);
    if (!sol) break;
    const reverseBiasedIds = new Set(
      activeBranches
        .filter((branch) => branch.isLED && !branch.isOpen)
        .filter((branch) => {
          const anodeVoltage = sol!.nodeVoltages[branch.anodeIdx!] || 0;
          const cathodeVoltage = sol!.nodeVoltages[branch.cathodeIdx!] || 0;
          return anodeVoltage - cathodeVoltage <= 2;
        })
        .map((branch) => branch.compId)
    );
    if (reverseBiasedIds.size === 0) break;
    activeBranches = activeBranches.map((branch) =>
      reverseBiasedIds.has(branch.compId) ? { ...branch, isOpen: true } : branch
    );
  }

  if (!sol) {
    return invalidResult('The circuit equations could not be solved. Check for invalid connections.');
  }

  const { nodeVoltages, iBattery } = sol;
  const currentAmps = Math.abs(iBattery);
  const terminalVoltage = Math.max(0, nodeVoltages[posIdx] - nodeVoltages[negIdx]);

  // 6. Calculate voltages and currents per component
  const componentCurrents: Record<string, number> = {
    [battery.id]: currentAmps,
  };
  const componentVoltages: Record<string, number> = {
    [battery.id]: terminalVoltage,
  };
  const activeComponentIds = new Set<string>();

  if (currentAmps > CURRENT_EPSILON) {
    activeComponentIds.add(battery.id);
  }

  for (const b of activeBranches) {
    const vU = nodeVoltages[b.u] || 0;
    const vV = nodeVoltages[b.v] || 0;
    const drop = Math.abs(vU - vV);
    let iBranch = 0;

    if (!b.isOpen) {
      if (b.isLED) {
        const anodeVoltage = nodeVoltages[b.anodeIdx!] || 0;
        const cathodeVoltage = nodeVoltages[b.cathodeIdx!] || 0;
        iBranch = Math.max(0, (anodeVoltage - cathodeVoltage - 2) / b.r);
      } else {
        iBranch = drop / b.r;
      }
    }

    componentVoltages[b.compId] = drop;
    componentCurrents[b.compId] = iBranch;

    if (iBranch > CURRENT_EPSILON || (b.type === 'voltmeter' && drop > 0.1)) {
      activeComponentIds.add(b.compId);
    }
  }

  const isClosed = currentAmps > CURRENT_EPSILON;
  const eqResistance = isClosed ? terminalVoltage / currentAmps : Infinity;
  const isShort = isClosed && eqResistance < 0.2;

  // Determine circuit topology
  let circuitTopology: SolverResult['circuitTopology'] = 'open';
  if (isShort) {
    circuitTopology = 'short';
  } else if (isClosed) {
    const pairCounts = new Map<string, number>();
    const nodeDegrees = new Map<number, number>();
    let activeBranchCount = 0;
    for (const b of activeBranches) {
      if (!b.isOpen && b.type !== 'voltmeter' && (componentCurrents[b.compId] || 0) > CURRENT_EPSILON) {
        const key = `${Math.min(b.u, b.v)}-${Math.max(b.u, b.v)}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        nodeDegrees.set(b.u, (nodeDegrees.get(b.u) || 0) + 1);
        nodeDegrees.set(b.v, (nodeDegrees.get(b.v) || 0) + 1);
        activeBranchCount++;
      }
    }
    if (pairCounts.size === 1 && activeBranchCount > 1) {
      circuitTopology = 'parallel';
    } else if (Array.from(nodeDegrees.values()).some((degree) => degree > 2)) {
      circuitTopology = 'complex';
    } else {
      circuitTopology = 'series';
    }
  }

  return {
    isClosedLoop: isClosed && !isShort,
    isShortCircuit: isShort,
    activeComponentIds,
    currentAmps,
    voltage: isClosed ? terminalVoltage : 0,
    equivalentResistance: eqResistance,
    componentCurrents,
    componentVoltages,
    shortCircuitReason: isShort
      ? 'Short circuit detected! Loop resistance is under 0.2Ω. Add a resistor or lamp.'
      : undefined,
    circuitTopology,
  };
}

/**
 * Validates circuit configuration for the "Check Circuit" analysis modal.
 */
export function checkCircuit(
  components: CircuitComponent[],
  wires: Wire[]
): CircuitCheckResult {
  const battery = components.find((c) => c.type === 'battery');
  if (!battery) {
    return {
      isCorrect: false,
      title: 'Missing Power Source',
      reason: 'No battery found. Add a 9V battery from the palette to power your circuit.',
      details: [
        'Every direct-current circuit requires an electromotive force (EMF) source.',
        'Drag a battery from the Component Palette onto the board.',
      ],
    };
  }

  const solver = solveCircuit(components, wires);
  if (solver.invalidReason) {
    return {
      isCorrect: false,
      title: 'Invalid Circuit',
      reason: solver.invalidReason,
      details: ['Correct the invalid component value or wire connection before checking the circuit.'],
    };
  }

  if (wires.length === 0) {
    return {
      isCorrect: false,
      title: 'Circuit Not Connected',
      reason: 'No wires connected. Click and drag between component terminal pins to connect them.',
      details: [
        'Components must be wired together into a closed loop.',
        'Click the terminal dot on the battery (+) to start wiring.',
      ],
    };
  }

  // 1. Short Circuit Warning
  if (solver.isShortCircuit) {
    return {
      isCorrect: false,
      title: '⚠️ Dangerous Short Circuit',
      reason: 'The circuit forms a loop with near-zero load resistance (< 0.2Ω). This causes extreme current draw and battery overheating.',
      details: [
        'Ohm\'s Law (I = V / R) causes current to spike when R approaches zero.',
        'Always wire a load resistor (e.g. 220Ω) or light bulb in series with your power supply.',
      ],
    };
  }

  // 2. Open Switch Warning
  const openSwitch = components.find((c) => c.type === 'switch' && c.isOpen);
  if (!solver.isClosedLoop && openSwitch) {
    return {
      isCorrect: false,
      title: 'Circuit Open (Switch Off)',
      reason: 'A switch in the path is currently in the OPEN state. Click the switch toggle button to CLOSE it and allow current to flow.',
      details: [
        'An open switch creates an air gap with infinite resistance.',
        'Toggling the switch to CLOSED will complete the loop.',
      ],
    };
  }

  // 3. Voltmeter in Series Check
  const voltmeter = components.find((c) => c.type === 'voltmeter');
  if (voltmeter) {
    const vmDrop = solver.componentVoltages[voltmeter.id] || 0;
    const vSource = parseVoltage(battery.value);
    const vmAConnected = wires.some(
      (w) =>
        (w.fromCompId === voltmeter.id && w.fromTerminal === 'a') ||
        (w.toCompId === voltmeter.id && w.toTerminal === 'a')
    );
    const vmBConnected = wires.some(
      (w) =>
        (w.fromCompId === voltmeter.id && w.fromTerminal === 'b') ||
        (w.toCompId === voltmeter.id && w.toTerminal === 'b')
    );
    if (vmAConnected && vmBConnected && vmDrop > vSource * 0.8 && solver.currentAmps < 0.001) {
      return {
        isCorrect: false,
        title: 'Voltmeter Connected in Series',
        reason: 'Voltmeters have megaohm internal resistance and must be connected in PARALLEL across components, not in series.',
        details: [
          'Connecting a voltmeter in series acts like an open switch and blocks circuit current.',
          'Rewire the voltmeter across two distinct circuit nodes to measure potential difference.',
        ],
      };
    }
  }

  // 4. Open Circuit / Broken Loop
  if (!solver.isClosedLoop) {
    return {
      isCorrect: false,
      title: 'Open Circuit (Incomplete Loop)',
      reason: 'No closed loop detected from the battery positive terminal (+) back to the negative terminal (-).',
      details: [
        'Kirchhoff\'s Current Law requires a continuous return path to the negative terminal.',
        'Check for missing wire connections or dangling components.',
      ],
    };
  }

  // 5. LED Reverse Bias Check
  const led = components.find((c) => c.type === 'led');
  if (led) {
    const ledCurrent = solver.componentCurrents[led.id] || 0;
    if (ledCurrent <= CURRENT_EPSILON) {
      return {
        isCorrect: false,
        title: 'LED Polarity Error',
        reason: 'The LED is connected in reverse bias. Diodes conduct current in only one direction (from anode to cathode).',
        details: [
          'Connect the LED left pin (anode) towards the battery positive terminal (+).',
          'Reverse-biased diodes block current with very high resistance.',
        ],
      };
    }
  }

  // 6. Success: Valid Circuit Verified
  const currentStr =
    solver.currentAmps < 1.0
      ? `${(solver.currentAmps * 1000).toFixed(1)} mA`
      : `${solver.currentAmps.toFixed(2)} A`;
  return {
    isCorrect: true,
    title: 'Circuit Verified! 🎉',
    reason: `Valid closed circuit operating normally (${solver.circuitTopology.toUpperCase()} topology). Total loop current: ${currentStr} at ${solver.voltage.toFixed(2)}V.`,
    details: [
      `Effective Load Resistance: ${solver.equivalentResistance.toFixed(1)} Ω`,
      `Ohm's Law verified: I = ${solver.voltage.toFixed(2)}V / ${solver.equivalentResistance.toFixed(1)} Ω ≈ ${currentStr}`,
      'All component polarities and connections meet electrical standards.',
    ],
  };
}
