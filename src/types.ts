export type Second = number;
export type MidiNumber = number;
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type Note = {
  start: Second;
  end: Second;
  pitch: MidiNumber;
  state?: "adding";
};

export type Score = {
  notes: Note[];
  tonic: PitchClass;
};
