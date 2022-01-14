export class API {
  static Url = {
    // CORS issues with browser extensions
    // development: 'http://localhost:8080',
    /** @TODO Add dev URL on host */
    development: 'https://api.ahdfw.nl',
    production: 'https://api.ahdfw.nl',
  }[process.env.NODE_ENV];

  static ItemsRoot = 'items';
  static ItemsUrl = `${this.Url}/${this.ItemsRoot}`;
}
