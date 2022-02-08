export class API {
  static Url = {
    // CORS issues with browser extensions
    // development: 'http://localhost:8080',
    development: 'https://develop--auctionoton-server.herokuapp.com',
    production: 'https://auctionoton-server.herokuapp.com',
  }[process.env.NODE_ENV];

  static ItemsRoot = 'items';
  static ItemsUrl = `${this.Url}/${this.ItemsRoot}`;
}
