const time = {
  hours: (hours: number): number => hours * 3.6e6,
  seconds: (seconds: number): number => seconds * 1000,
};

export default time;
