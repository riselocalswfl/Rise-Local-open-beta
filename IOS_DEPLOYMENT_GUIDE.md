# iOS Deployment Guide - Rise Local App

This guide covers the requirements and configuration for deploying Rise Local as an iOS app using Median (or similar webview wrapper) for App Store distribution.

## Table of Contents
1. [Required iOS Assets](#required-ios-assets)
2. [Median Configuration](#median-configuration)
3. [Privacy Requirements](#privacy-requirements)
4. [In-App Purchase Setup](#in-app-purchase-setup)
5. [App Store Submission Checklist](#app-store-submission-checklist)

---

## Required iOS Assets

### App Icons

Create app icons in all required sizes. Use a 1024x1024 source image (PNG, no alpha channel for App Store).

| Size | Filename | Usage |
|------|----------|-------|
| 1024x1024 | `AppIcon.png` | App Store |
| 180x180 | `Icon-60@3x.png` | iPhone (@3x) |
| 120x120 | `Icon-60@2x.png` | iPhone (@2x) |
| 167x167 | `Icon-83.5@2x.png` | iPad Pro |
| 152x152 | `Icon-76@2x.png` | iPad |
| 76x76 | `Icon-76.png` | iPad (@1x) |
| 120x120 | `Icon-40@3x.png` | Spotlight (@3x) |
| 80x80 | `Icon-40@2x.png` | Spotlight (@2x) |
| 87x87 | `Icon-29@3x.png` | Settings (@3x) |
| 58x58 | `Icon-29@2x.png` | Settings (@2x) |
| 40x40 | `Icon-20@2x.png` | Notifications (@2x) |
| 60x60 | `Icon-20@3x.png` | Notifications (@3x) |

**Design Guidelines:**
- No transparency allowed
- No rounded corners (iOS applies them automatically)
- Use the Rise Local palm tree brand icon
- Ensure icon is recognizable at small sizes

### Launch Screen / Splash

Create launch images for all device sizes:

| Device | Size | Orientation |
|--------|------|-------------|
| iPhone 15 Pro Max | 1290 x 2796 | Portrait |
| iPhone 15 Pro | 1179 x 2556 | Portrait |
| iPhone 15/14 | 1170 x 2532 | Portrait |
| iPhone 14 Plus | 1284 x 2778 | Portrait |
| iPhone SE | 750 x 1334 | Portrait |
| iPad Pro 12.9" | 2048 x 2732 | Portrait |
| iPad Pro 11" | 1668 x 2388 | Portrait |
| iPad 10.9" | 1640 x 2360 | Portrait |

**Design:**
- Simple design with Rise Local logo centered
- Matches app background color
- No text (localizable apps should use images only)

---

## Median Configuration

### appConfig.json Structure

Create a `median/appConfig.json` file for Median build configuration:

```json
{
  "appName": "Rise Local",
  "initialUrl": "https://your-production-domain.com",
  "icon": "ios/AppIcon.png",
  "ios": {
    "bundleId": "com.riselocal.app",
    "teamId": "YOUR_APPLE_TEAM_ID",
    "statusBarStyle": "lightcontent",
    "minimumVersion": "14.0",
    "backgroundAudio": false,
    "allowUniversalLinks": true,
    "urlScheme": "riselocal"
  },
  "general": {
    "fullscreen": false,
    "forceViewportWidth": null,
    "pullToRefresh": true,
    "showSplashImage": true,
    "splashBackground": "#FFFFFF"
  },
  "navigation": {
    "iosTheme": "default",
    "navigationTitleImage": false,
    "hideNavbarOnScroll": false
  },
  "permissions": {
    "location": {
      "enabled": true,
      "description": "Rise Local uses your location to show deals near you."
    },
    "camera": {
      "enabled": true,
      "description": "Rise Local uses your camera to upload profile photos."
    },
    "photo": {
      "enabled": true,
      "description": "Rise Local accesses your photos to upload profile images."
    },
    "notifications": {
      "enabled": true,
      "description": "Rise Local sends notifications about new deals and messages."
    }
  },
  "nativeNavigation": {
    "enabled": false
  },
  "tabNavigation": {
    "enabled": false
  },
  "iap": {
    "enabled": true,
    "productIdentifiers": [
      "rise_local_pass_monthly",
      "rise_local_pass_annual"
    ]
  }
}
```

### URL Handling

Configure URL schemes for deep linking:

```json
{
  "urlSchemes": [
    "riselocal"
  ],
  "universalLinks": {
    "enabled": true,
    "domains": ["your-production-domain.com"]
  }
}
```

### JavaScript Bridge

Median provides a JavaScript bridge for native features. Key APIs:

```javascript
// Check if running in Median
if (window.median) {
  // In-App Purchase
  median.iap.purchase('rise_local_pass_monthly');
  median.iap.restore();

  // Listen for purchase events
  median.iap.events.subscribe(function(event) {
    if (event.type === 'purchase_success') {
      // Send receipt to backend
      fetch('/api/billing/apple/validate-receipt', {
        method: 'POST',
        body: JSON.stringify({ receipt_data: event.receipt })
      });
    }
  });

  // Push notifications
  median.push.register();

  // Share
  median.share.show({ url: 'https://...', text: 'Check out this deal!' });
}
```

---

## Privacy Requirements

### PrivacyInfo.xcprivacy

Create `ios/PrivacyInfo.xcprivacy` for App Store privacy manifest:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeEmailAddress</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeName</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeCoarseLocation</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

### App Tracking Transparency (ATT)

Since Rise Local does NOT track users for advertising:
- Set `NSPrivacyTracking` to `false`
- No ATT permission prompt required
- No IDFA collection

If analytics are added later that require ATT:

```xml
<key>NSUserTrackingUsageDescription</key>
<string>Rise Local uses this to understand app usage and improve your experience.</string>
```

---

## In-App Purchase Setup

### App Store Connect Configuration

1. **Create App Record**
   - Bundle ID: `com.riselocal.app`
   - Primary Language: English (U.S.)
   - SKU: `rise-local-ios`

2. **Create Subscription Group**
   - Name: "Rise Local Pass"
   - Reference Name: `rise_local_pass`

3. **Create Subscriptions**

   | Product ID | Duration | Price |
   |-----------|----------|-------|
   | `rise_local_pass_monthly` | 1 Month | $4.99 |
   | `rise_local_pass_annual` | 1 Year | $44.91 |

4. **Server-to-Server Notifications**
   - URL: `https://your-production-domain.com/api/apple/webhook`
   - Version: Version 2 Notifications

5. **Shared Secret**
   - Generate in App Store Connect
   - Add to server environment: `APPLE_SHARED_SECRET=xxx`

### Backend Environment Variables

Add to production environment:

```env
# Apple In-App Purchase
APPLE_SHARED_SECRET=your_shared_secret_from_app_store_connect
APPLE_BUNDLE_ID=com.riselocal.app

# For production receipt validation
APPLE_VERIFY_RECEIPT_URL=https://buy.itunes.apple.com/verifyReceipt
# For sandbox testing
APPLE_VERIFY_RECEIPT_SANDBOX_URL=https://sandbox.itunes.apple.com/verifyReceipt
```

---

## App Store Submission Checklist

### Required Information

- [ ] App name: "Rise Local - Local Deals SWFL"
- [ ] Subtitle: "Discover Local Savings"
- [ ] Privacy Policy URL: `https://your-domain.com/privacy`
- [ ] Support URL: `https://your-domain.com/support`
- [ ] Marketing URL: `https://your-domain.com`
- [ ] App category: Lifestyle (Primary), Shopping (Secondary)

### Screenshots Required

| Device | Sizes | Count |
|--------|-------|-------|
| iPhone 6.7" | 1290 x 2796 | 3-10 |
| iPhone 6.5" | 1242 x 2688 | 3-10 |
| iPhone 5.5" | 1242 x 2208 | 3-10 |
| iPad Pro 12.9" | 2048 x 2732 | 3-10 |

**Recommended Screenshots:**
1. Deal discovery feed
2. Deal detail with save offer
3. Membership benefits
4. Vendor profile
5. Messages/support chat

### App Review Information

**Demo Account:**
- Email: demo@riselocal.com (create test account)
- Password: [secure password]

**Review Notes:**
```
Rise Local is a local deals and membership app for Southwest Florida.
Users can browse free deals and subscribe to Rise Local Pass for
exclusive member-only deals.

To test membership features:
1. Create an account or use demo account
2. Navigate to Profile > Membership
3. Subscribe using sandbox Apple ID for testing

The app uses webview technology to display our responsive web app
with native iOS features integrated through Median.
```

### Pre-Submission Checks

- [ ] All console.log statements removed (completed)
- [ ] Error boundaries implemented (completed)
- [ ] Offline support with fallback page (completed)
- [ ] In-app account deletion available (completed)
- [ ] Restore Purchases button present (completed)
- [ ] Privacy policy accessible without login
- [ ] Terms of service accessible without login
- [ ] No Stripe checkout in iOS (use Apple IAP)
- [ ] App icons all sizes provided
- [ ] Launch screens all sizes provided
- [ ] PrivacyInfo.xcprivacy included
- [ ] No references to Android/Google/Stripe in UI

### Common Rejection Reasons & Solutions

| Rejection | Solution |
|-----------|----------|
| 3.1.1 - In-App Purchase | Use Apple IAP for subscriptions, not Stripe |
| 4.2 - Minimum Functionality | Ensure app works offline with graceful degradation |
| 5.1.1 - Data Collection | Include PrivacyInfo.xcprivacy manifest |
| 5.1.1 - Account Deletion | Provide in-app account deletion (implemented) |
| 2.1 - App Completeness | Ensure all features work with test account |
| 4.0 - Design | Follow HIG, use native-feeling navigation |

---

## Testing Checklist

### Before Submission

1. **Authentication**
   - [ ] Login works
   - [ ] Signup works
   - [ ] Password reset works
   - [ ] Session persists across app restarts

2. **Core Features**
   - [ ] Deals load and display correctly
   - [ ] Deal detail view works
   - [ ] Location-based filtering works
   - [ ] Search works

3. **Membership**
   - [ ] Membership page shows correctly
   - [ ] Restore purchases button works
   - [ ] Subscription status displays correctly

4. **Offline Behavior**
   - [ ] App shows offline page when disconnected
   - [ ] App recovers when connection restored
   - [ ] Cached content available offline

5. **Error Handling**
   - [ ] Network errors show user-friendly messages
   - [ ] Error boundary catches crashes
   - [ ] App doesn't crash on edge cases

---

## File Structure

```
ios/
├── AppIcon.appiconset/
│   ├── Contents.json
│   ├── Icon-20@2x.png
│   ├── Icon-20@3x.png
│   ├── Icon-29@2x.png
│   ├── Icon-29@3x.png
│   ├── Icon-40@2x.png
│   ├── Icon-40@3x.png
│   ├── Icon-60@2x.png
│   ├── Icon-60@3x.png
│   ├── Icon-76.png
│   ├── Icon-76@2x.png
│   ├── Icon-83.5@2x.png
│   └── AppIcon.png (1024x1024)
├── LaunchScreen/
│   ├── LaunchScreen.storyboard (or images)
│   └── launch_*.png (various sizes)
├── PrivacyInfo.xcprivacy
└── Info.plist (permissions descriptions)

median/
├── appConfig.json
└── assets/
    └── (any additional assets)
```

---

## Next Steps

1. **Create App Icons**
   - Use Rise Local brand assets
   - Generate all required sizes
   - Test at small sizes for clarity

2. **Create Launch Screens**
   - Simple, branded splash
   - All device sizes

3. **Configure Median**
   - Set up appConfig.json
   - Configure IAP products
   - Test in Median simulator

4. **App Store Connect Setup**
   - Create app record
   - Configure subscriptions
   - Set up S2S notifications

5. **TestFlight**
   - Build and upload
   - Internal testing
   - External beta testing

6. **Submit for Review**
   - Complete all metadata
   - Provide demo account
   - Submit and respond to feedback

---

*Last updated: January 2026*
