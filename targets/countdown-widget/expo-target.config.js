// @/targets/countdown-widget/expo-target.config.js
// the Countdown widget (home screen + lock screen). the Swift code lives next to this file;
// `npx expo prebuild` turns this folder into a widget target inside ios/.

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
    type: 'widget',
    name: 'CountdownWidget',
    // picking a countdown per widget (AppIntentConfiguration) needs iOS 17+
    deploymentTarget: '17.0',
    colors: {
        $accent: '#ff6868',
        $widgetBackground: '#ec9c9c',
    },
    // same App Group as the app, so the widget can read the countdowns the app saves
    entitlements: {
        'com.apple.security.application-groups':
            config.ios.entitlements['com.apple.security.application-groups'],
    },
});
