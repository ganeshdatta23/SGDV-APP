// ESLint config for the Expo / React Native app. Uses the official Expo preset
// (eslint-config-expo), which bundles the TypeScript + React + React Hooks
// rules. Run with `npm run lint`.
module.exports = {
  root: true,
  extends: ['expo'],
  // React Native provides browser-like globals (setTimeout, fetch, console),
  // and the *.config.js build files use Node globals (__dirname, require).
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    'builds/',
    'archive/',
    'dist/',
    '.expo/',
    'backend/',
    'coverage/',
    'babel.config.js',
    'jest.config.js',
    'jest.setup.js',
  ],
};
