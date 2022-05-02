export class API {
  static Url = {
    // development: 'https://5d9b-82-168-31-31.ngrok.io',
    development: 'https://auctionoton-production.up.railway.app',
    production: 'https://auctionoton-production.up.railway.app',
  }[process.env.NODE_ENV];

  static ItemsRoot = 'items';
  static ItemsUrl = `${this.Url}/${this.ItemsRoot}`;
}
