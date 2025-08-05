import { TherapistPersonality } from './types';

// Import therapist data
import danielleTown from '../../therapists/danielle-town.json';
import ajaEvans from '../../therapists/aja-evans.json';
import ramitSethi from '../../therapists/ramit-sethi.json';
import noraEphron from '../../therapists/nora-ephron.json';
import anitaBhargava from '../../therapists/anita-bhargava.json';

const therapists: Record<string, TherapistPersonality> = {
  'danielle-town': danielleTown as TherapistPersonality,
  'aja-evans': ajaEvans as TherapistPersonality,
  'ramit-sethi': ramitSethi as TherapistPersonality,
  'nora-ephron': noraEphron as TherapistPersonality,
  'anita-bhargava': anitaBhargava as TherapistPersonality,
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