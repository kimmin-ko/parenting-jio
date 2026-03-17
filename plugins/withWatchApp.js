const { withXcodeProject, withDangerousMod, withAppDelegate } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WATCH_APP_NAME = 'JioWatch';
const WATCH_BUNDLE_ID = 'com.kimmin.parentingjio.watchapp';

function withWatchApp(config) {
  config = withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const watchSrcDir = path.resolve(__dirname, '..', 'watchapp');
    const iosDir = path.resolve(__dirname, '..', 'ios');
    const watchDestDir = path.join(iosDir, WATCH_APP_NAME);

    // Copy watch app files to ios/ directory
    if (!fs.existsSync(watchDestDir)) {
      fs.mkdirSync(watchDestDir, { recursive: true });
    }

    const filesToCopy = [
      'JioWatchApp.swift',
      'ContentView.swift',
      'FirebaseService.swift',
      'PhoneConnectivity.swift',
      'Info.plist',
    ];
    for (const file of filesToCopy) {
      const src = path.join(watchSrcDir, file);
      const dest = path.join(watchDestDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }

    // Add watch app target (use 'application' for modern watchOS 7+ apps)
    const watchTarget = project.addTarget(WATCH_APP_NAME, 'application', WATCH_APP_NAME, WATCH_BUNDLE_ID);

    // Configure build settings for watchOS
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
        const settings = configurations[key].buildSettings;
        if (settings.PRODUCT_NAME === `"${WATCH_APP_NAME}"` || settings.PRODUCT_NAME === WATCH_APP_NAME) {
          settings.SDKROOT = 'watchos';
          settings.SWIFT_VERSION = '5.0';
          settings.WATCHOS_DEPLOYMENT_TARGET = '10.0';
          settings.INFOPLIST_FILE = `${WATCH_APP_NAME}/Info.plist`;
          settings.GENERATE_INFOPLIST_FILE = 'YES';
          settings.CURRENT_PROJECT_VERSION = '1';
          settings.MARKETING_VERSION = '1.0';
          settings.TARGETED_DEVICE_FAMILY = '4'; // Watch
          settings.PRODUCT_BUNDLE_IDENTIFIER = `"${WATCH_BUNDLE_ID}"`;
          settings.SWIFT_EMIT_LOC_STRINGS = 'YES';
          settings.ASSETCATALOG_COMPILER_APPICON_NAME = 'AppIcon';
          settings.SUPPORTS_MACCATALYST = 'NO';
        }
      }
    }

    // Add source files to watch target group
    const watchGroupKey = project.addPbxGroup([], WATCH_APP_NAME, WATCH_APP_NAME);
    const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(watchGroupKey.uuid, mainGroupKey);

    const sourceFiles = ['JioWatchApp.swift', 'ContentView.swift', 'FirebaseService.swift', 'PhoneConnectivity.swift'];
    for (const file of sourceFiles) {
      project.addSourceFile(file, { target: watchTarget.uuid }, watchGroupKey.uuid);
    }

    return config;
  });

  // Add WatchConnectivity sender to iPhone app
  config = withDangerousMod(config, ['ios', async (config) => {
    const iosDir = path.join(config.modRequest.platformProjectRoot);
    const appDir = path.join(iosDir, 'parentingjio');
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }
    const wcFile = path.join(appDir, 'WatchConnectivitySender.swift');

    const wcCode = `import Foundation
import WatchConnectivity

@objc class WatchConnectivitySender: NSObject, WCSessionDelegate {
    @objc static let shared = WatchConnectivitySender()

    override init() {
        super.init()
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }

    @objc func sendFamilyCode(_ code: String) {
        guard WCSession.default.isPaired, WCSession.default.isWatchAppInstalled else { return }
        do {
            try WCSession.default.updateApplicationContext(["familyCode": code])
        } catch {
            // Silently fail
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }
}
`;
    fs.writeFileSync(wcFile, wcCode);

    // Create Objective-C bridge file for React Native NativeModules
    const bridgeFile = path.join(appDir, 'WatchConnectivitySenderBridge.m');
    const bridgeCode = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WatchConnectivitySender, NSObject)
RCT_EXTERN_METHOD(sendFamilyCode:(NSString *)code)
+ (BOOL)requiresMainQueueSetup { return NO; }
@end
`;
    fs.writeFileSync(bridgeFile, bridgeCode);

    return config;
  }]);

  // Initialize WCSession in AppDelegate
  config = withAppDelegate(config, (config) => {
    const contents = config.modResults.contents;

    // Add import
    if (!contents.includes('WatchConnectivitySender')) {
      config.modResults.contents = contents
        .replace(
          /(didFinishLaunchingWithOptions[^{]*\{)/,
          '$1\n    // Initialize Watch Connectivity\n    _ = WatchConnectivitySender.shared\n'
        );
    }

    return config;
  });

  return config;
}

module.exports = withWatchApp;
