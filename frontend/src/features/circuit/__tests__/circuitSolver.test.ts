import { test } from 'node:test';
import assert from 'node:assert';
import {
  solveCircuit,
  checkCircuit,
  parseResistance,
  parseVoltage,
} from '../circuitSolver.ts';
import type { CircuitComponent, Wire } from '../circuitTypes.ts';

test('Circuit Solver: parses resistance and voltage strings accurately', () => {
  assert.strictEqual(parseResistance('220Ω'), 220);
  assert.strictEqual(parseResistance('100Ω'), 100);
  assert.strictEqual(parseResistance('1kΩ'), 1000);
  assert.strictEqual(parseResistance('4.7kΩ'), 4700);
  assert.strictEqual(parseResistance('10k'), 10000);
  assert.strictEqual(parseResistance('1MΩ'), 1000000);
  assert.strictEqual(parseResistance('invalid'), 100);

  assert.strictEqual(parseVoltage('9V'), 9);
  assert.strictEqual(parseVoltage('12V'), 12);
  assert.strictEqual(parseVoltage('1.5V'), 1.5);
  assert.strictEqual(parseVoltage('invalid'), 9);
});

test('Circuit Solver: detects open circuit when no battery is present', () => {
  const components: CircuitComponent[] = [
    { id: 'res-1', type: 'resistor', x: 100, y: 100, label: 'Resistor', value: '220Ω' },
  ];
  const wires: Wire[] = [];

  const res = solveCircuit(components, wires);
  assert.strictEqual(res.isClosedLoop, false);
  assert.strictEqual(res.currentAmps, 0);
  assert.strictEqual(res.voltage, 0);

  const check = checkCircuit(components, wires);
  assert.strictEqual(check.isCorrect, false);
  assert.ok(check.title.includes('Missing Power Source'));
});

test('Circuit Solver: detects open circuit when switch is open', () => {
  const components: CircuitComponent[] = [
    { id: 'bat-1', type: 'battery', x: 100, y: 100, label: 'Battery', value: '9V' },
    { id: 'res-1', type: 'resistor', x: 200, y: 100, label: 'Resistor', value: '100Ω' },
    { id: 'sw-1', type: 'switch', x: 200, y: 200, label: 'Switch', value: 'SPST', isOpen: true },
  ];
  const wires: Wire[] = [
    { id: 'w1', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'res-1', toTerminal: 'a' },
    { id: 'w2', fromCompId: 'res-1', fromTerminal: 'b', toCompId: 'sw-1', toTerminal: 'a' },
    { id: 'w3', fromCompId: 'sw-1', fromTerminal: 'b', toCompId: 'bat-1', toTerminal: 'neg' },
  ];

  const res = solveCircuit(components, wires);
  assert.strictEqual(res.isClosedLoop, false);
  assert.strictEqual(res.currentAmps, 0);

  const check = checkCircuit(components, wires);
  assert.strictEqual(check.isCorrect, false);
  assert.ok(check.title.includes('Switch Off'));
});

test('Circuit Solver: calculates Ohm\'s law for single resistor circuit', () => {
  const components: CircuitComponent[] = [
    { id: 'bat-1', type: 'battery', x: 100, y: 100, label: 'Battery', value: '9V' },
    { id: 'res-1', type: 'resistor', x: 200, y: 100, label: 'Resistor', value: '220Ω' },
    { id: 'sw-1', type: 'switch', x: 200, y: 200, label: 'Switch', value: 'SPST', isOpen: false },
  ];
  const wires: Wire[] = [
    { id: 'w1', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'res-1', toTerminal: 'a' },
    { id: 'w2', fromCompId: 'res-1', fromTerminal: 'b', toCompId: 'sw-1', toTerminal: 'a' },
    { id: 'w3', fromCompId: 'sw-1', fromTerminal: 'b', toCompId: 'bat-1', toTerminal: 'neg' },
  ];

  const res = solveCircuit(components, wires);
  assert.strictEqual(res.isClosedLoop, true);
  assert.strictEqual(res.isShortCircuit, false);

  // Ohm's law: I = 9V / 220Ω ≈ 0.0409A (40.9mA)
  const expectedI = 9.0 / 220.005;
  assert.ok(
    Math.abs(res.currentAmps - expectedI) < 0.002,
    `Current ${res.currentAmps} must match Ohm's law ${expectedI}`
  );
  assert.ok(
    Math.abs(res.equivalentResistance - 220) < 1,
    `Req ${res.equivalentResistance} must match 220Ω`
  );

  const check = checkCircuit(components, wires);
  assert.strictEqual(check.isCorrect, true);
});

test('Circuit Solver: calculates series resistors correctly (R_total = R1 + R2)', () => {
  const components: CircuitComponent[] = [
    { id: 'bat-1', type: 'battery', x: 100, y: 100, label: 'Battery', value: '9V' },
    { id: 'res-1', type: 'resistor', x: 200, y: 100, label: 'Resistor 1', value: '100Ω' },
    { id: 'res-2', type: 'resistor', x: 300, y: 100, label: 'Resistor 2', value: '200Ω' },
  ];
  const wires: Wire[] = [
    { id: 'w1', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'res-1', toTerminal: 'a' },
    { id: 'w2', fromCompId: 'res-1', fromTerminal: 'b', toCompId: 'res-2', toTerminal: 'a' },
    { id: 'w3', fromCompId: 'res-2', fromTerminal: 'b', toCompId: 'bat-1', toTerminal: 'neg' },
  ];

  const res = solveCircuit(components, wires);
  assert.strictEqual(res.isClosedLoop, true);
  assert.strictEqual(res.circuitTopology, 'series');

  // Series R_total = 100 + 200 = 300Ω. I = 9 / 300 = 0.03A (30mA)
  const expectedI = 9.0 / 300;
  assert.ok(Math.abs(res.currentAmps - expectedI) < 0.001);
  assert.ok(Math.abs(res.equivalentResistance - 300) < 1);

  // Kirchhoff's voltage law: V_R1 = 0.03 * 100 = 3V, V_R2 = 0.03 * 200 = 6V
  const v1 = res.componentVoltages['res-1'];
  const v2 = res.componentVoltages['res-2'];
  assert.ok(Math.abs(v1 - 3.0) < 0.1, `V_R1 (${v1}) should be 3V`);
  assert.ok(Math.abs(v2 - 6.0) < 0.1, `V_R2 (${v2}) should be 6V`);
});

test('Circuit Solver: calculates parallel resistors correctly (1/R_total = 1/R1 + 1/R2)', () => {
  const components: CircuitComponent[] = [
    { id: 'bat-1', type: 'battery', x: 100, y: 100, label: 'Battery', value: '9V' },
    { id: 'res-1', type: 'resistor', x: 200, y: 100, label: 'Resistor 1', value: '100Ω' },
    { id: 'res-2', type: 'resistor', x: 200, y: 200, label: 'Resistor 2', value: '100Ω' },
  ];
  // Parallel wiring: both resistor 'a' pins to battery pos; both 'b' pins to battery neg
  const wires: Wire[] = [
    { id: 'w1', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'res-1', toTerminal: 'a' },
    { id: 'w2', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'res-2', toTerminal: 'a' },
    { id: 'w3', fromCompId: 'res-1', fromTerminal: 'b', toCompId: 'bat-1', toTerminal: 'neg' },
    { id: 'w4', fromCompId: 'res-2', fromTerminal: 'b', toCompId: 'bat-1', toTerminal: 'neg' },
  ];

  const res = solveCircuit(components, wires);
  assert.strictEqual(res.isClosedLoop, true);
  assert.strictEqual(res.circuitTopology, 'parallel');

  // Parallel R_total = (100 * 100) / 200 = 50Ω
  // Total I = 9 / 50 = 0.18A (180mA)
  assert.ok(Math.abs(res.equivalentResistance - 50) < 1, `Req (${res.equivalentResistance}) should be 50Ω`);
  assert.ok(Math.abs(res.currentAmps - 0.18) < 0.005, `Total current (${res.currentAmps}) should be 0.18A`);

  // Each parallel branch receives full 9V and carries 90mA
  assert.ok(Math.abs(res.componentCurrents['res-1'] - 0.09) < 0.003);
  assert.ok(Math.abs(res.componentCurrents['res-2'] - 0.09) < 0.003);
});

test('Circuit Solver: detects short circuit when battery terminals are wired directly', () => {
  const components: CircuitComponent[] = [
    { id: 'bat-1', type: 'battery', x: 100, y: 100, label: 'Battery', value: '9V' },
  ];
  const wires: Wire[] = [
    { id: 'w1', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'bat-1', toTerminal: 'neg' },
  ];

  const res = solveCircuit(components, wires);
  assert.strictEqual(res.isShortCircuit, true);
  assert.strictEqual(res.circuitTopology, 'short');

  const check = checkCircuit(components, wires);
  assert.strictEqual(check.isCorrect, false);
  assert.ok(check.title.includes('Short Circuit'));
});

test('Circuit Solver: LED conducts in forward bias and blocks in reverse bias', () => {
  // Forward bias: Battery pos -> Resistor -> LED (a=anode, b=cathode) -> Battery neg
  const fwdComponents: CircuitComponent[] = [
    { id: 'bat-1', type: 'battery', x: 100, y: 100, label: 'Battery', value: '9V' },
    { id: 'res-1', type: 'resistor', x: 200, y: 100, label: 'Resistor', value: '220Ω' },
    { id: 'led-1', type: 'led', x: 300, y: 100, label: 'LED', value: 'Red' },
  ];
  const fwdWires: Wire[] = [
    { id: 'w1', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'res-1', toTerminal: 'a' },
    { id: 'w2', fromCompId: 'res-1', fromTerminal: 'b', toCompId: 'led-1', toTerminal: 'a' },
    { id: 'w3', fromCompId: 'led-1', fromTerminal: 'b', toCompId: 'bat-1', toTerminal: 'neg' },
  ];

  const fwdRes = solveCircuit(fwdComponents, fwdWires);
  assert.strictEqual(fwdRes.isClosedLoop, true);
  assert.ok(fwdRes.currentAmps > 0.02, 'Forward-biased LED should conduct current (~30mA)');
  assert.ok(fwdRes.activeComponentIds.has('led-1'), 'LED must be active');

  // Reverse bias: LED flipped (b connected to resistor, a to battery neg)
  const revWires: Wire[] = [
    { id: 'w1', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'res-1', toTerminal: 'a' },
    { id: 'w2', fromCompId: 'res-1', fromTerminal: 'b', toCompId: 'led-1', toTerminal: 'b' },
    { id: 'w3', fromCompId: 'led-1', fromTerminal: 'a', toCompId: 'bat-1', toTerminal: 'neg' },
  ];

  const revRes = solveCircuit(fwdComponents, revWires);
  assert.strictEqual(revRes.isClosedLoop, false, 'Reverse-biased LED must block current');

  const revCheck = checkCircuit(fwdComponents, revWires);
  assert.strictEqual(revCheck.isCorrect, false);
  assert.ok(revCheck.title.includes('Open Circuit') || revCheck.title.includes('LED Polarity'));
});

test('Circuit Solver: Ammeter measures series branch current accurately', () => {
  const components: CircuitComponent[] = [
    { id: 'bat-1', type: 'battery', x: 100, y: 100, label: 'Battery', value: '9V' },
    { id: 'res-1', type: 'resistor', x: 200, y: 100, label: 'Resistor', value: '100Ω' },
    { id: 'amm-1', type: 'ammeter', x: 300, y: 100, label: 'Ammeter', value: 'mA' },
  ];
  const wires: Wire[] = [
    { id: 'w1', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'res-1', toTerminal: 'a' },
    { id: 'w2', fromCompId: 'res-1', fromTerminal: 'b', toCompId: 'amm-1', toTerminal: 'a' },
    { id: 'w3', fromCompId: 'amm-1', fromTerminal: 'b', toCompId: 'bat-1', toTerminal: 'neg' },
  ];

  const res = solveCircuit(components, wires);
  assert.strictEqual(res.isClosedLoop, true);
  // I = 9V / 100Ω = 0.09A (90mA)
  const ammeterCurrent = res.componentCurrents['amm-1'];
  assert.ok(Math.abs(ammeterCurrent - 0.09) < 0.002, `Ammeter current (${ammeterCurrent}) should be 90mA`);
});

test('Circuit Solver: Voltmeter detects in-series mistake and warns user', () => {
  const components: CircuitComponent[] = [
    { id: 'bat-1', type: 'battery', x: 100, y: 100, label: 'Battery', value: '9V' },
    { id: 'vm-1', type: 'voltmeter', x: 200, y: 100, label: 'Voltmeter', value: 'V' },
    { id: 'res-1', type: 'resistor', x: 300, y: 100, label: 'Resistor', value: '100Ω' },
  ];
  // Wiring voltmeter in series: blocks current
  const wires: Wire[] = [
    { id: 'w1', fromCompId: 'bat-1', fromTerminal: 'pos', toCompId: 'vm-1', toTerminal: 'a' },
    { id: 'w2', fromCompId: 'vm-1', fromTerminal: 'b', toCompId: 'res-1', toTerminal: 'a' },
    { id: 'w3', fromCompId: 'res-1', fromTerminal: 'b', toCompId: 'bat-1', toTerminal: 'neg' },
  ];

  const check = checkCircuit(components, wires);
  assert.strictEqual(check.isCorrect, false);
  assert.ok(check.title.includes('Voltmeter Connected in Series'));
});
