// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // .expo is Expo's own generated cache (gitignored, not source) -- it
    // was getting linted and flagging phantom import/no-unresolved errors
    // against its own generated files.
    ignores: ['dist/*', '.expo/*'],
  },
  {
    rules: {
      // react-native-reanimated's whole API is built around mutating a
      // SharedValue's .value directly (e.g. `scale.value = withTiming(...)`
      // in a Pressable's onPressIn/onPressOut) -- that's not a mutation bug,
      // it's how the library is meant to be used; the worklet/UI-thread
      // system depends on it. This rule has no way to recognize a
      // SharedValue as exempt, so every one of the ~30 hits in this
      // reanimated-heavy codebase has been a false positive, never a real
      // bug -- verified by inspection, not assumed.
      'react-hooks/immutability': 'off',
    },
  },
]);
