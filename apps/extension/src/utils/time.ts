const time = {
  hours: (hours: number): number => hours * 3.6e6,
  minutes: (minutes: number): number => minutes * 6e4,
  seconds: (seconds: number): number => seconds * 1000,
};

export default time;
