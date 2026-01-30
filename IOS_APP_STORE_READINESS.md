# iOS App Store Submission Readiness Report

**Date:** January 2026
**App:** Rise Local
**Planned Wrapper:** Median (WebView)

---

## Executive Summary

This is a **React web application** that will be wrapped with Median for iOS distribution. The app is **NOT ready for App Store submission** in its current state due to several critical blockers, primarily around Apple's payment guidelines (3.1.1).

---

## 1. APP STORE LAUNCH BLOCKERS (WILL CAUSE REJECTION)

### 🚨 1.1 Stripe Payments Violate Apple Guideline 3.1.1

**Location:** `server/routes.ts:2720-2778`, `client/src/pages/Checkout.tsx`

**Issue:** Rise Local Pass subscriptions ($4.99/mo, $44.91/yr) are processed through Stripe, bypassing Apple's In-App Purchase system.

**Why Apple Cares:** Apple requires all digital goods and subscriptions consumed within the app to use IAP, with Apple taking 15-30% commission.

**Fix Options:**
1. **Use StoreKit/IAP for iOS** - Implement native in-app purchases for the Median wrapper, keeping Stripe for web
2. **Reader App Exemption** - If Rise Local qualifies as a "reader app" (unlikely given the deals functionality)
3. **External Purchase Entitlement** - Apply for Apple's External Purchase Link entitlement (limited availability)

**Priority:** CRITICAL - App will be rejected without addressing this

---

### 🚨 1.2 No Privacy Manifest (PrivacyInfo.xcprivacy)

**Location:** Missing from codebase

**Issue:** iOS 17+ requires apps to declare data collection and required reason APIs in a privacy manifest file.

**Why Apple Cares:** Privacy manifests are mandatory for App Store submission. Apps using certain APIs (UserDefaults, file timestamp, disk space, etc.) must declare reasons.

**Fix:**
1. Create `PrivacyInfo.xcprivacy` in Median's iOS project
2. Declare all data types collected (from Privacy Policy):
   - Contact info (name, email)
   - Location data (zip code)
   - Usage data (deal redemptions)
   - Identifiers (Stripe customer ID)
3. Declare required reason APIs used

**Priority:** CRITICAL - Required for submission

---

### 🚨 1.3 No App Tracking Transparency Implementation

**Location:** Not implemented

**Issue:** If any analytics, advertising, or cross-app tracking is used, ATT prompt is required.

**Current State:** The app uses:
- Stripe (payment tracking)
- Session-based analytics (implicit)

**Fix:** Audit for tracking and either:
1. Implement ATT prompt before any tracking
2. Confirm no tracking that requires ATT
3. Declare in App Store Connect appropriately

**Priority:** CRITICAL if any third-party SDKs track users

---

### 🚨 1.4 No iOS App Icons

**Location:** Not in codebase (will be in Median wrapper)

**Issue:** iOS requires app icons in specific sizes (1024x1024 for App Store, multiple sizes for device).

**Fix:** Create icon set meeting Apple's specifications:
- 1024x1024 (App Store)
- 180x180, 167x167, 152x152, 120x120, 87x87, 80x80, 76x76, 60x60, 58x58, 40x40, 29x29, 20x20

**Priority:** CRITICAL - Required for submission

---

## 2. HIGH-RISK ISSUES (LIKELY REVIEWER CONCERN)

### ⚠️ 2.1 No Offline Support

**Location:** Entire application

**Issue:** App requires constant internet connection. No service worker, no offline caching, no graceful degradation.

**Why Apple Cares:** Apps that fail without network may be seen as low-quality or "just a website."

**Fix:**
1. Implement service worker for basic offline caching
2. Add offline fallback page
3. Cache critical UI assets
4. Show clear "offline" state instead of blank screens

**Priority:** HIGH - Could trigger Guideline 4.2 rejection

---

### ⚠️ 2.2 No Global Error Boundary

**Location:** Only `client/src/pages/Admin.tsx` has error boundary

**Issue:** Uncaught errors crash the entire app instead of showing recovery UI.

**Why Apple Cares:** Crashes during review = rejection.

**Fix:**
1. Add global `ErrorBoundary` component wrapping the app
2. Implement graceful error recovery UI
3. Add retry functionality

**Priority:** HIGH

---

### ⚠️ 2.3 Account Deletion via Email Only

**Location:** `client/src/pages/AccountPage.tsx:900-917`

**Issue:** Account deletion redirects to email (`mailto:support@riselocal.com`). Apple prefers in-app deletion.

**Why Apple Cares:** Guideline 5.1.1(v) requires apps that support account creation to also support account deletion.

**Current Implementation:** Email request with 30-day processing.

**Fix:**
1. Add in-app "Delete My Account" button with confirmation
2. Call existing `DELETE /api/users/:id` endpoint (already exists)
3. Clear local data and log out

**Priority:** HIGH - Apple increasingly strict on this

---

### ⚠️ 2.4 Subscription Restore Not Obvious

**Location:** `client/src/pages/CheckoutSuccess.tsx`

**Issue:** Subscription restoration is automatic but not user-initiated. No "Restore Purchases" button visible.

**Why Apple Cares:** Users must be able to restore purchases after reinstalling.

**Fix:** Add visible "Restore Purchases" button in Membership/Account page that calls `/api/entitlements/refresh`

**Priority:** HIGH for IAP implementation

---

### ⚠️ 2.5 Console Logging in Production

**Location:** 30+ `console.log`/`console.error` statements in client code

**Issue:** Debug output visible in production could expose sensitive data and looks unprofessional.

**Files with heavy logging:**
- `client/src/components/AuthBoundary.tsx`
- `client/src/pages/CheckoutSuccess.tsx`
- `client/src/pages/UnifiedOnboarding.tsx`

**Fix:** Remove or conditionally disable console statements in production builds.

**Priority:** MEDIUM-HIGH

---

## 3. MEDIUM-RISK ISSUES (CONFUSING BUT SURVIVABLE)

### ⚡ 3.1 No Guest Access

**Location:** `client/src/components/AuthBoundary.tsx`

**Issue:** All content requires login. Users can't browse deals before signing up.

**Why Apple Cares:** Apple prefers apps that are functional without mandatory sign-in (Guideline 5.1.1).

**Fix:** Consider allowing browse access for `/discover`, `/businesses` without login, with prompts to sign in for actions.

**Priority:** MEDIUM

---

### ⚡ 3.2 Hardcoded Price Display

**Location:** `client/src/pages/Checkout.tsx:15-29`

**Issue:** Prices ($4.99/mo, $44.91/yr) are hardcoded in frontend, not fetched from Stripe.

**Risk:** Price mismatch between displayed price and actual charge.

**Fix:** Fetch prices from Stripe API or backend configuration.

**Priority:** MEDIUM

---

### ⚡ 3.3 Stack Trace Exposure in Admin Error UI

**Location:** `client/src/pages/Admin.tsx:57-73`

**Issue:** Error boundary shows full stack trace to admin users.

**Fix:** Only show stack traces in development mode.

**Priority:** LOW (admin-only)

---

## 4. PASSES / SAFE AREAS ✅

### ✅ 4.1 Privacy Policy
- **Location:** `/privacy` route, `client/src/pages/Privacy.tsx`
- Complete, dated January 2025
- Covers data collection, usage, sharing, user rights
- Contact: support@riselocal.com

### ✅ 4.2 Terms of Service
- **Location:** `/terms` route, `client/src/pages/Terms.tsx`
- Complete, dated January 2025
- Covers Rise Local Pass, deal redemption, user accounts

### ✅ 4.3 No Hardcoded Secrets
- All sensitive values use environment variables
- No API keys, tokens, or secrets in code
- Stripe keys loaded from `STRIPE_SECRET_KEY` env var

### ✅ 4.4 Secure Token Storage
- Session-based authentication (not localStorage)
- Cookies: `httpOnly: true`, `secure: true`, `sameSite: 'lax'`
- PostgreSQL-backed session store
- Automatic token refresh

### ✅ 4.5 HTTPS Everywhere
- All API endpoints served over HTTPS
- Stripe webhook signature verification
- No mixed content issues

### ✅ 4.6 Loading States
- Skeleton loaders implemented
- Loading spinners during auth checks
- React Query handles loading states

### ✅ 4.7 No Test/Placeholder Content in Production
- No lorem ipsum in user-facing code
- Seed data isolated to dev scripts
- Stock images used appropriately as fallbacks

### ✅ 4.8 Login/Signup Flow Clear
- Unified `/auth` page with role selection
- Clear "Shop Local" vs "Sell With Us" paths
- Role-based routing post-login

### ✅ 4.9 Logout Fully Clears Session
- `/api/logout` clears session and cookies
- `destroySession()` called server-side
- Frontend clears query cache

---

## 5. METADATA PREPARATION CHECKLIST

| Item | Status | Notes |
|------|--------|-------|
| App Name | ❌ | Need to register in App Store Connect |
| App Icons (all sizes) | ❌ | Need to create for Median wrapper |
| Screenshots (6.7", 6.5", 5.5") | ❌ | Need to capture |
| App Description | ❌ | Need to write |
| Keywords | ❌ | Need to research |
| Privacy Policy URL | ✅ | https://[domain]/privacy |
| Support URL | ❌ | Need dedicated support page |
| Marketing URL | ❌ | Optional but recommended |
| Age Rating | ❌ | Need to complete questionnaire |
| App Category | ❌ | Likely "Lifestyle" or "Shopping" |
| In-App Purchases | ❌ | Need to configure if using IAP |

---

## 6. RECOMMENDED FIX PRIORITY

### Phase 1: Blockers (Must fix before submission)
1. Implement Apple In-App Purchase for iOS (or get exemption)
2. Create PrivacyInfo.xcprivacy manifest
3. Create iOS app icons
4. Audit and implement ATT if needed

### Phase 2: High Priority (Should fix)
1. Add global error boundary
2. Add offline fallback/service worker
3. Implement in-app account deletion
4. Add "Restore Purchases" button
5. Remove console.log statements

### Phase 3: Polish (Nice to have)
1. Add guest browsing access
2. Fetch prices from backend
3. Hide stack traces in production

---

## 7. STRIPE + IAP HYBRID APPROACH

For apps using both web and iOS, common pattern:

```
Web Users → Stripe Checkout → Stripe Subscription
iOS Users → StoreKit IAP → Apple Subscription → Sync to backend
```

**Backend Changes Needed:**
1. Add Apple App Store Server Notifications endpoint
2. Store `apple_subscription_id` alongside `stripe_subscription_id`
3. Unified `isPassMember` check that works for both
4. Receipt validation for iOS purchases

**Median Configuration:**
- Configure native IAP module
- Handle purchase callbacks
- Post receipts to your backend

---

## 8. FILES TO CREATE FOR iOS

```
ios/
├── PrivacyInfo.xcprivacy          # Privacy manifest
├── Assets.xcassets/
│   └── AppIcon.appiconset/        # All icon sizes
├── LaunchScreen.storyboard        # Launch screen
└── Info.plist additions           # ATT usage description if needed
```

---

## Summary

**Current Readiness: NOT READY**

**Critical Blockers: 4**
- Payment compliance (Stripe vs IAP)
- Privacy manifest missing
- ATT implementation unclear
- App icons missing

**Estimated Work:** 2-4 weeks to address blockers, depending on IAP complexity

**Recommendation:** Focus on payment compliance first, as it's the most complex and may require architecture changes.
