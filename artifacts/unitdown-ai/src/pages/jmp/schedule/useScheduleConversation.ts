/**
 * useScheduleConversation — Step-by-step scheduling state machine.
 *
 * Uses useReducer for atomic state updates so step + data are always
 * consistent with each other (no half-updated state between renders).
 */

import { useReducer } from 'react';
import type { StepId, ConversationData, CustomerMatch } from './types';
import { EMPTY_DATA, getPath } from './types';

// ─── Reducer ─────────────────────────────────────────────────────────────────

interface State {
  step: StepId;
  data: ConversationData;
}

type Action =
  | { type: 'NEXT';    update?: Partial<ConversationData> }
  | { type: 'BACK' }
  | { type: 'RESTART' }
  | { type: 'PATCH';   data: Partial<ConversationData> };

function reducer(state: State, action: Action): State {
  switch (action.type) {

    case 'NEXT': {
      const newData = action.update ? { ...state.data, ...action.update } : state.data;
      const path    = getPath(newData);
      const idx     = path.indexOf(state.step);
      const next    = (idx >= 0 && idx < path.length - 1 ? path[idx + 1] : undefined) ?? state.step;
      return { step: next, data: newData };
    }

    case 'BACK': {
      const path = getPath(state.data);
      const idx  = path.indexOf(state.step);
      const prev = (idx > 0 ? path[idx - 1] : undefined) ?? state.step;
      return { ...state, step: prev };
    }

    case 'RESTART':
      return { step: 'INTENT', data: EMPTY_DATA };

    case 'PATCH':
      return { ...state, data: { ...state.data, ...action.data } };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseScheduleConversation {
  step:     StepId;
  data:     ConversationData;
  path:     StepId[];            // ordered steps for this conversation path
  stepIndex: number;             // 0-based index of current step in path
  next:     (update?: Partial<ConversationData>) => void;
  back:     () => void;
  restart:  () => void;
  patch:    (data: Partial<ConversationData>) => void;
  selectCustomer: (match: CustomerMatch) => void;
}

const INITIAL_STATE: State = { step: 'INTENT', data: EMPTY_DATA };

export function useScheduleConversation(): UseScheduleConversation {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const { step, data } = state;
  const path      = getPath(data);
  const stepIndex = Math.max(0, path.indexOf(step));

  function next(update?: Partial<ConversationData>) {
    dispatch({ type: 'NEXT', update });
  }

  function back() {
    dispatch({ type: 'BACK' });
  }

  function restart() {
    dispatch({ type: 'RESTART' });
  }

  function patch(newData: Partial<ConversationData>) {
    dispatch({ type: 'PATCH', data: newData });
  }

  function selectCustomer(match: CustomerMatch) {
    dispatch({
      type: 'NEXT',
      update: {
        selectedCustomer: match,
        customerName:     match.name,
        siteName:         match.site  ?? '',
        address:          match.address ?? '',
      },
    });
  }

  return { step, data, path, stepIndex, next, back, restart, patch, selectCustomer };
}
