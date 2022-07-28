module.exports = {
  content: [
    './src/modules/**/*.{html,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('postcss-import'),
    require('tailwindcss'),
    require('autoprefixer'),
  ],
  prefix: 'auc-',
  corePlugins: {
    preflight: false,
  },
};
