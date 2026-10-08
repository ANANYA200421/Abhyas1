import type { ScheduleSlot, TeacherProfile, GestureTelemetry } from './session';

export const MOCK_TEACHER: TeacherProfile = {
  name: 'Prof. Rajesh Sharma',
  role: 'Senior Physics Faculty',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
};

export const MOCK_SCHEDULE: ScheduleSlot[] = [
  {
    id: 'slot-1',
    slotNumber: 'SLOT 1',
    timeRange: '09:00 AM – 10:30 AM',
    subject: 'Physics',
    topic: 'Electrostatics & Gauss\'s Law',
    room: 'Room 402',
    grade: 'Grade 8 Physics',
  },
  {
    id: 'slot-2',
    slotNumber: 'SLOT 2',
    timeRange: '11:00 AM – 12:30 PM',
    subject: 'Chemistry',
    topic: 'Chemical Bonding',
    room: 'Room 405',
    grade: 'Grade 11 Chemistry',
  },
  {
    id: 'slot-3',
    slotNumber: 'SLOT 3',
    timeRange: '02:00 PM – 03:30 PM',
    subject: 'Biology',
    topic: 'Genetics & Evolution',
    room: 'Lab 2',
    grade: 'Grade 12 Biology',
  },
  {
    id: 'slot-4',
    slotNumber: 'SLOT 4',
    timeRange: '04:00 PM – 05:30 PM',
    subject: 'Electronics',
    topic: 'Semiconductor Devices',
    room: 'Room 301',
    grade: 'Grade 10 Electronics',
  },
];

export const MOCK_TELEMETRY: GestureTelemetry = {
  webcamSource: 'Standard Laptop Webcam',
  trackingStatus: 'active',
  confidence: 98.4,
  fps: 30,
  latencyMs: 12,
  rightHandState: 'Index Pointing (Draw Mode)',
  leftHandState: 'Open Palm (Ready)',
  detectedKeypoints: 21,
};
