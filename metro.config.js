// Learn more: https://docs.expo.dev/guides/customizing-metro/
//
// Even when we have no custom Metro configuration to add, Expo's tooling
// (`expo-doctor`, prebuild, build-time validators) expects a metro.config.js
// that explicitly extends `expo/metro-config` rather than relying on the
// implicit default. This file is just the default config re-exported so
// the tooling stops warning while leaving Metro's behaviour unchanged.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
