export type PrototypeStage = 'dispatch' | 'active' | 'completing' | 'ceremony' | 'record';

export type JobState =
  | 'ARRIVED'
  | 'EQUIPMENT_VERIFIED'
  | 'INITIAL_OBSERVATION'
  | 'MEASUREMENTS_CAPTURED'
  | 'ROOT_CAUSE_IDENTIFIED'
  | 'REPAIR_IN_PROGRESS'
  | 'REPAIR_COMPLETED'
  | 'VERIFICATION_COMPLETE'
  | 'RECOMMENDATIONS_ADDED'
  | 'CUSTOMER_REVIEWED';

export type ActivityType =
  | 'arrival' | 'nameplate' | 'alarm' | 'voice' | 'measurement'
  | 'ai-suggestion' | 'part' | 'photo' | 'diagnosis' | 'recommendation'
  | 'note' | 'verification';

export interface MeasurementReading {
  label: string;
  value: string;
  unit: string;
  status: 'ok' | 'warn' | 'alert';
  target?: string;
  verificationValue?: string;
  verificationStatus?: 'ok' | 'warn' | 'alert';
}

export interface NameplateFields {
  make:        string | null;
  model:       string | null;
  serial:      string | null;
  capacity:    string | null;
  refrigerant: string | null;
  voltage:     string | null;
  phase:       string | null;
}

export interface NameplateScanResult {
  detected:          boolean;
  confidence:        number;
  fields:            NameplateFields;
  fieldConfidence:   Partial<Record<keyof NameplateFields, number>>;
  warnings:          string[];
  needsManualReview: boolean;
  source:            'ocr' | 'manual' | 'prototype';
}

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: string;
  title: string;
  subtitle?: string;
  badge?: string;
  photoLabel?: string;
  photoColor?: string;
  measurements?: MeasurementReading[];
  transcript?: string;
  confidence?: number;
  partQty?: number;
  partDetail?: string;
  isAISuggestion?: boolean;
  nameplateResult?: NameplateScanResult;
}

export interface PartRecord {
  id: string;
  name: string;
  qty: number;
  detail: string;
}

export type ModalType =
  | 'alarm' | 'voice' | 'measurements-initial' | 'measurements-verification'
  | 'part' | 'photo' | 'recommendations' | 'customer-summary' | 'fab-menu'
  | 'nameplate' | 'note' | 'ai-assist' | 'refrigerant-assistant';

export interface PrototypeState {
  stage: PrototypeStage;
  jobState: JobState;
  elapsedSeconds: number;
  activities: Activity[];
  activeModal: ModalType | null;
  initialMeasurements: MeasurementReading[] | null;
  verificationMeasurements: MeasurementReading[] | null;
  parts: PartRecord[];
  recommendations: string[];
  completionScore: number;
  showDevNav: boolean;
  nameplateVerified: boolean;
  toastMessage: string | null;
}

export type PrototypeAction =
  | { type: 'SET_STAGE'; payload: PrototypeStage }
  | { type: 'SET_JOB_STATE'; payload: JobState }
  | { type: 'SET_MODAL'; payload: ModalType | null }
  | { type: 'ADD_ACTIVITY'; payload: Activity }
  | { type: 'SET_INITIAL_MEASUREMENTS'; payload: MeasurementReading[] }
  | { type: 'SET_VERIFICATION_MEASUREMENTS'; payload: MeasurementReading[] }
  | { type: 'ADD_PART'; payload: PartRecord }
  | { type: 'SET_RECOMMENDATIONS'; payload: string[] }
  | { type: 'SET_COMPLETION_SCORE'; payload: number }
  | { type: 'TICK' }
  | { type: 'START_JOB' }
  | { type: 'JUMP_TO_STATE'; payload: JobState }
  | { type: 'TOGGLE_DEV_NAV' }
  | { type: 'SET_NAMEPLATE_VERIFIED' }
  | { type: 'SHOW_TOAST'; payload: string }
  | { type: 'CLEAR_TOAST' };
