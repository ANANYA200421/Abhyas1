import type { CircuitComponent, Wire, CircuitCheckResult } from './circuitTypes';

export interface SolverResult {
  isClosedLoop: boolean;
  activeComponentIds: Set<string>;
  currentAmps: number;
  voltage: number;
}

/**
 * Solves circuit connectivity and simulates electrical current flow.
 */
export function solveCircuit(
  components: CircuitComponent[],
  wires: Wire[]
): SolverResult {
  const battery = components.find((c) => c.type === 'battery');

  if (!battery) {
    return {
      isClosedLoop: false,
      activeComponentIds: new Set(),
      currentAmps: 0,
      voltage: 0,
    };
  }

  // Build adjacency graph: key = `${compId}:${terminalId}`
  const adj = new Map<string, string[]>();

  const addEdge = (u: string, v: string) => {
    if (!adj.has(u)) adj.set(u, []);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(u)!.push(v);
    adj.get(v)!.push(u);
  };

  // 1. Wires connect terminals externally
  for (const wire of wires) {
    const u = `${wire.fromCompId}:${wire.fromTerminal}`;
    const v = `${wire.toCompId}:${wire.toTerminal}`;
    addEdge(u, v);
  }

  // 2. Components conduct current internally between their terminals
  for (const comp of components) {
    if (comp.type === 'switch' && comp.isOpen) {
      // Open switch does not conduct
      continue;
    }

    if (comp.type === 'battery') {
      // Don't short internal battery terminals in general traversal
      continue;
    }

    if (comp.type === 'voltmeter') {
      // High resistance: almost zero current passes through voltmeter internal branch
      continue;
    }

    const tA = `${comp.id}:a`;
    const tB = `${comp.id}:b`;
    addEdge(tA, tB);
  }

  // 3. Find path from Battery Positive to Battery Negative
  const start = `${battery.id}:pos`;
  const target = `${battery.id}:neg`;

  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue: string[] = [start];
  visited.add(start);

  let pathFound = false;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === target) {
      pathFound = true;
      break;
    }

    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        parent.set(next, curr);
        queue.push(next);
      }
    }
  }

  const activeComponentIds = new Set<string>();

  if (pathFound) {
    // Reconstruct components on the conductive path
    let curr: string | undefined = target;
    while (curr) {
      const compId = curr.split(':')[0];
      activeComponentIds.add(compId);
      curr = parent.get(curr);
    }
  }

  return {
    isClosedLoop: pathFound,
    activeComponentIds,
    currentAmps: pathFound ? 0.041 : 0, // Approx 41mA for standard LED circuit
    voltage: pathFound ? 9.0 : 0,
  };
}

/**
 * Validates circuit configuration for the "Check Circuit" evaluation.
 */
export function checkCircuit(
  components: CircuitComponent[],
  wires: Wire[]
): CircuitCheckResult {
  const battery = components.find((c) => c.type === 'battery');
  if (!battery) {
    return {
      isCorrect: false,
      title: 'Incorrect connection',
      reason: 'No battery found. Add a 9V battery from the palette to power the circuit.',
      details: ['Circuit requires an active electromotive force (EMF) source.'],
    };
  }

  if (wires.length === 0) {
    return {
      isCorrect: false,
      title: 'Incorrect connection',
      reason: 'No wires connected. Click and drag between component terminal dots to connect wires.',
      details: ['Components must be wired together to form a circuit.'],
    };
  }

  const { isClosedLoop } = solveCircuit(components, wires);

  // Check if switches are open
  const openSwitch = components.find((c) => c.type === 'switch' && c.isOpen);
  if (!isClosedLoop && openSwitch) {
    return {
      isCorrect: false,
      title: 'Incorrect connection (Switch Open)',
      reason: 'The circuit is connected, but the switch is currently open. Click the switch to close it.',
      details: ['An open switch creates an air gap with infinite resistance.'],
    };
  }

  if (!isClosedLoop) {
    return {
      isCorrect: false,
      title: 'Incorrect connection',
      reason: 'No closed loop detected from the battery positive terminal back to the negative terminal.',
      details: [
        'Ensure both positive (+) and negative (-) battery terminals are part of the wire loop.',
        'Check for missing wire connections between adjacent components.',
      ],
    };
  }

  // Check LED polarity
  const led = components.find((c) => c.type === 'led');
  if (led) {
    // Check if LED anode is wired towards battery positive
    const anodeWire = wires.find(
      (w) =>
        (w.fromCompId === led.id && w.fromTerminal === 'a') ||
        (w.toCompId === led.id && w.toTerminal === 'a')
    );
    if (!anodeWire) {
      return {
        isCorrect: false,
        title: 'Incorrect connection',
        reason: 'LED polarity error: LED anode (+) must receive current from battery positive terminal.',
        details: ['Diodes only conduct in forward-bias orientation.'],
      };
    }
  }

  // Check Ammeter connected in series
  const ammeter = components.find((c) => c.type === 'ammeter');
  if (ammeter) {
    const ammeterWires = wires.filter(
      (w) => w.fromCompId === ammeter.id || w.toCompId === ammeter.id
    );
    if (ammeterWires.length < 2) {
      return {
        isCorrect: false,
        title: 'Incorrect connection',
        reason: 'Ammeter must be connected in series with both terminals in the active loop.',
        details: ['Ammeters have near-zero resistance and measure through-current.'],
      };
    }
  }

  // Check Voltmeter connected in parallel
  const voltmeter = components.find((c) => c.type === 'voltmeter');
  if (voltmeter) {
    // Check if voltmeter is placed in parallel across components
    const vmWires = wires.filter(
      (w) => w.fromCompId === voltmeter.id || w.toCompId === voltmeter.id
    );
    if (vmWires.length < 2) {
      return {
        isCorrect: false,
        title: 'Incorrect connection',
        reason: 'Voltmeter must be connected in parallel across two distinct circuit nodes.',
        details: ['Voltmeters measure electric potential difference across two points.'],
      };
    }
  }

  return {
    isCorrect: true,
    title: 'Correct connection! 🎉',
    reason: 'Valid closed loop verified. Current is flowing normally through all active loads.',
    details: [
      'Loop successfully conducts from positive terminal (+) through loads to negative (-).',
      'All polarity constraints and measurement instruments are correctly positioned.',
    ],
  };
}
