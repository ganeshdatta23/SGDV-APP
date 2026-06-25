module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // The full-app smoke test (App.test.tsx) renders <App/>, which sets up
  // AppState/Linking listeners and native subscriptions that are meant to live
  // for the app's lifetime and can't be fully torn down in jsdom. Force Jest to
  // exit with the test-result code once tests finish instead of hanging/failing
  // on those lingering handles.
  forceExit: true,
};
