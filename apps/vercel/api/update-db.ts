export const config = {
  runtime: 'edge',
};

const MACHINE_ENV = {
  ...process.env,
  TZ: 'Europe/Amsterdam',
};

export default function GET(req: Request) {}
