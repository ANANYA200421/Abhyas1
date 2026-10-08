export interface ScheduleSlot {
  id: string;
  slotNumber: string;
  timeRange: string;
  subject: string;
  topic: string;
  room?: string;
  grade?: string;
}

export interface TeacherProfile {
  name: string;
  role: string;
  avatarUrl: string;
}

export type StudioTab = 'blackboard' | '3d-model' | 'circuit-lab' | 'smart-textbook' | 'slides';

export type BlackboardTool = 'pen' | 'highlighter' | 'eraser' | 'shapes' | 'select';

export interface GestureTelemetry {
  webcamSource: string;
  trackingStatus: 'active' | 'calibrating' | 'offline';
  confidence: number;
  fps: number;
  latencyMs: number;
  rightHandState: string;
  leftHandState: string;
  detectedKeypoints: number;
}
