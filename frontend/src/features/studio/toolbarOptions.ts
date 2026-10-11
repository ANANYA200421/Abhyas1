export type StrokeSizeType = 'fine' | 'medium' | 'bold';

export const COLORS = [
  { label: 'White Chalk', hex: '#FFFFFF' },
  { label: 'Lavender', hex: '#D988ED' },
  { label: 'Sun Yellow', hex: '#FDE047' },
  { label: 'Cyan Blue', hex: '#38BDF8' },
  { label: 'Emerald Green', hex: '#4ADE80' },
];

export const SIZES: { id: StrokeSizeType; label: string; iconSize: number }[] = [
  { id: 'fine', label: 'Fine', iconSize: 4 },
  { id: 'medium', label: 'Medium', iconSize: 7 },
  { id: 'bold', label: 'Bold', iconSize: 12 },
];
