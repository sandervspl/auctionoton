export class API {
  static Url = {
    // development: 'https://5d9b-82-168-31-31.ngrok.io',
    development: 'http://localhost:3001/api',
    production: 'https://auctionoton-edge-api.vercel.app/api',
  }[process.env.NODE_ENV as string];

  static ItemUrl = `${this.Url}/item`;
  static ItemsUrl = `${this.Url}/items`;
}
