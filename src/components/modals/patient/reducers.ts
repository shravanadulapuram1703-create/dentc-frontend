// Patient Modal Reducers - Clean State Management

import { PatientFormData, PatientFormAction, PatientTypes, PatientTypesAction } from './types';

export function patientFormReducer(
  state: PatientFormData,
  action: PatientFormAction
): PatientFormData {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_MULTIPLE_FIELDS':
      return { ...state, ...action.fields };
    case 'RESET':
      return action.data;
    default:
      return state;
  }
}

export function patientTypesReducer(
  state: PatientTypes,
  action: PatientTypesAction
): PatientTypes {
  switch (action.type) {
    case 'TOGGLE_TYPE':
      return { ...state, [action.typeKey]: !state[action.typeKey] };
    case 'RESET':
      return action.data;
    default:
      return state;
  }
}
