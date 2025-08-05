import { TherapistPersonality } from './types';

// Import therapist data
import melRobbins from '../../therapists/mel-robbins.json';
import ajaEvans from '../../therapists/aja-evans.json';
import ramitSethi from '../../therapists/ramit-sethi.json';
import noraEphron from '../../therapists/nora-ephron.json';
import michelleObama from '../../therapists/michelle-obama.json';

const therapists: Record<string, TherapistPersonality> = {
  'mel-robbins': melRobbins as TherapistPersonality,
  'aja-evans': ajaEvans as TherapistPersonality,
  'ramit-sethi': ramitSethi as TherapistPersonality,
  'nora-ephron': noraEphron as TherapistPersonality,
  'michelle-obama': michelleObama as TherapistPersonality,
};

export function getTherapist(id: string): TherapistPersonality {
  const therapist = therapists[id];
  if (!therapist) {
    throw new Error(`Therapist with id "${id}" not found`);
  }
  return therapist;
}

export function getAllTherapists(): TherapistPersonality[] {
  return Object.values(therapists);
}

export function getTherapistIds(): string[] {
  return Object.keys(therapists);
}