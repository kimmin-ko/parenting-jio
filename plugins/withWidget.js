const { withXcodeProject, withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_NAME = 'JioWidget';
const APP_GROUP = 'group.com.kimmin.parentingjio';
const BUNDLE_ID = 'com.kimmin.parentingjio.widget';

function withWidget(config) {
  // 1. Add App Group entitlement to main app
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.security.application-groups'] = [APP_GROUP];
    return config;
  });

  // 2. Add widget target to Xcode project
  config = withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const targetName = WIDGET_NAME;
    const widgetSrcDir = path.resolve(__dirname, '..', 'widget');
    const iosDir = path.resolve(__dirname, '..', 'ios');
    const widgetDestDir = path.join(iosDir, targetName);

    // Copy widget files to ios/ directory
    if (!fs.existsSync(widgetDestDir)) {
      fs.mkdirSync(widgetDestDir, { recursive: true });
    }

    const filesToCopy = ['JioWidget.swift', 'Info.plist'];
    for (const file of filesToCopy) {
      const src = path.join(widgetSrcDir, file);
      const dest = path.join(widgetDestDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }

    // Create widget entitlements
    const widgetEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetDestDir, `${targetName}.entitlements`), widgetEntitlements);

    // Add widget target to Xcode project
    const widgetTarget = project.addTarget(targetName, 'app_extension', targetName, BUNDLE_ID);

    // Add build settings
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
        const settings = configurations[key].buildSettings;
        if (settings.PRODUCT_NAME === `"${targetName}"` || settings.PRODUCT_NAME === targetName) {
          settings.SWIFT_VERSION = '5.0';
          settings.IPHONEOS_DEPLOYMENT_TARGET = '17.0';
          settings.CODE_SIGN_ENTITLEMENTS = `${targetName}/${targetName}.entitlements`;
          settings.INFOPLIST_FILE = `${targetName}/Info.plist`;
          settings.GENERATE_INFOPLIST_FILE = 'YES';
          settings.CURRENT_PROJECT_VERSION = '1';
          settings.MARKETING_VERSION = '1.0';
          settings.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = 'AccentColor';
          settings.ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = 'WidgetBackground';
        }
      }
    }

    // Add source files to widget target
    const widgetGroupKey = project.addPbxGroup([], targetName, targetName);
    const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(widgetGroupKey.uuid, mainGroupKey);

    project.addSourceFile('JioWidget.swift', { target: widgetTarget.uuid }, widgetGroupKey.uuid);

    return config;
  });

  return config;
}

module.exports = withWidget;
