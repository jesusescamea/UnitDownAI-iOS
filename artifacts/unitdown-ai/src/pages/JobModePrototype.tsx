import { useReducer, useEffect, useRef } from 'react';
import { DashboardView } from './jmp/DashboardView';
import { ActiveJobView } from './jmp/ActiveJobView';
import { CompletionFlow } from './jmp/CompletionFlow';
import { ServiceRecordView } from './jmp/ServiceRecordView';
import type { PrototypeState, PrototypeAction, Activity } from './jmp/types';
import { MOCK_JOB } from './jmp/mockData';

const ARRIVAL_ACTIVITY: Activity = {
  id: 'arrival-1',
  type: 'arrival',
  timestamp: '08:14',
  title: 'Arrived On Site',
  subtitle: `${MOCK_JOB.customer} · ${MOCK_JOB.location}`,
};

const INITIAL_STATE: PrototypeState = {
  stage: 'dispatch',
  jobState: 'ARRIVED',
  elapsedSeconds: 0,
  activities: [],
  activeModal: null,
  initialMeasurements: null,
  verificationMeasurements: null,
  parts: [],
  recommendations: [],
  completionScore: 0,
  showDevNav: false,
  nameplateVerified: false,
  toastMessage: null,
};

function reducer(state: PrototypeState, action: PrototypeAction): PrototypeState {
  switch (action.type) {
    case 'START_JOB':
      return {
        ...state,
        stage: 'active',
        jobState: 'ARRIVED',
        elapsedSeconds: 0,
        activities: [ARRIVAL_ACTIVITY],
        completionScore: 40,
        parts: [],
        recommendations: [],
        initialMeasurements: null,
        verificationMeasurements: null,
        nameplateVerified: false,
      };
    case 'TICK':
      return state.stage === 'active' ? { ...state, elapsedSeconds: state.elapsedSeconds + 1 } : state;
    case 'SET_STAGE':
      return { ...state, stage: action.payload };
    case 'SET_JOB_STATE':
      return { ...state, jobState: action.payload };
    case 'SET_MODAL':
      return { ...state, activeModal: action.payload };
    case 'ADD_ACTIVITY':
      return { ...state, activities: [...state.activities, action.payload] };
    case 'SET_INITIAL_MEASUREMENTS':
      return { ...state, initialMeasurements: action.payload };
    case 'SET_VERIFICATION_MEASUREMENTS':
      return { ...state, verificationMeasurements: action.payload };
    case 'ADD_PART':
      return { ...state, parts: [...state.parts, action.payload] };
    case 'SET_RECOMMENDATIONS':
      return { ...state, recommendations: action.payload };
    case 'SET_COMPLETION_SCORE':
      return { ...state, completionScore: Math.min(100, action.payload) };
    case 'JUMP_TO_STATE':
      return { ...state, jobState: action.payload };
    case 'TOGGLE_DEV_NAV':
      return { ...state, showDevNav: !state.showDevNav };
    case 'SET_NAMEPLATE_VERIFIED':
      return { ...state, nameplateVerified: true };
    case 'SHOW_TOAST':
      return { ...state, toastMessage: action.payload };
    case 'CLEAR_TOAST':
      return { ...state, toastMessage: null };
    default:
      return state;
  }
}

export default function JobModePrototype() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.stage === 'active') {
      intervalRef.current = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.stage]);

  function handleStartJob() { dispatch({ type: 'START_JOB' }); }
  function handleComplete() { dispatch({ type: 'SET_STAGE', payload: 'completing' }); }
  function handleShowRecord() { dispatch({ type: 'SET_STAGE', payload: 'record' }); }
  function handleDone() { dispatch({ type: 'SET_STAGE', payload: 'dispatch' }); }

  return (
    <div className="max-w-sm mx-auto relative">
      {/* Stage indicator strip for testing */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-gray-700 rounded-b-xl px-3 py-1 flex items-center gap-2 text-[9px] font-mono text-gray-500 max-w-sm w-full justify-center">
        <span className="text-gray-600">PROTOTYPE</span>
        <span className="text-gray-700">·</span>
        {['dispatch','active','completing','ceremony','record'].map(s => (
          <button
            key={s}
            onClick={() => dispatch({ type: 'SET_STAGE', payload: s as PrototypeState['stage'] })}
            className={`px-1.5 py-0.5 rounded ${state.stage === s ? 'bg-gray-700 text-white' : 'text-gray-600 hover:text-gray-400'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="pt-0">
        {state.stage === 'dispatch' && <DashboardView onStartJob={handleStartJob} />}
        {state.stage === 'active' && <ActiveJobView state={state} dispatch={dispatch} onComplete={handleComplete} />}
        {(state.stage === 'completing' || state.stage === 'ceremony') && (
          <CompletionFlow state={state} dispatch={dispatch} onShowRecord={handleShowRecord} />
        )}
        {state.stage === 'record' && <ServiceRecordView state={state} onDone={handleDone} />}
      </div>
    </div>
  );
}
