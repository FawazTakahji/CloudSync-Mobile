// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const ALIASES = {
    'crypto': 'react-native-quick-crypto'
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
    return context.resolveRequest(
        context,
        ALIASES[moduleName] || moduleName,
        platform
    );
};

module.exports = config;