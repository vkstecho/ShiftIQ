# ShiftIQ — Setup Guide

> Smart Shift Management for Multi-Company Use
> Version: 0.1.0 (Phase 1 — Foundation)

## What's in v0.1

✅ **Auth**: Mobile + OTP via Firebase Phone Auth
✅ **Roles**: Super Admin / Manager / Team Member
✅ **Manager Registration**: with company details
✅ **Admin Approval Workflow**: pending → approve / reject / suspend
✅ **Free Trial**: 30 days from approval, extendable
✅ **Admin Dashboard**: see all companies, manage approvals
✅ **Multi-tenant Firebase schema**: `companies/{companyId}/...`
✅ **WhatsApp link integration**: `wa.me/...?text=...`

## What's coming

🔜 **Phase 2**: Manager dashboard, team setup, sections config
🔜 **Phase 3**: Shift Schedule + Schedule Builder (ported from GLSMP)
🔜 **Phase 4**: Leaves, NCR, To-Do, Reports
🔜 **Phase 5**: i18n, polish, launch-ready

---

## Setup Steps

### 1. Create new Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Add Project** → name it `shiftiq-app` (or anything you want)
3. Disable Google Analytics for now (can add later)
4. Wait for project creation

### 2. Enable Required Services

**Authentication:**
1. Build → Authentication → Get Started
2. Sign-in method tab → enable **Phone**
3. Add a test phone number (your own) for development:
   - Click "Phone numbers for testing"
   - Add `+918929394920` with code `123456` (or any 6-digit code)

**Realtime Database:**
1. Build → Realtime Database → Create Database
2. Choose location: `asia-southeast1` (Singapore — closest to India)
3. Start in **locked mode** (we'll deploy our rules)

### 3. Get Firebase Config

1. Project Settings (⚙️) → General
2. Scroll to "Your apps" → Click **Web** icon (`</>`)
3. Register app: name it "ShiftIQ Web"
4. Copy the `firebaseConfig` object
5. **Replace the placeholder** in `index.html` line ~50:

```js
const FIREBASE_CONFIG = {
  apiKey: "YOUR_KEY_HERE",
  authDomain: "shiftiq-app.firebaseapp.com",
  databaseURL: "https://shiftiq-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "shiftiq-app",
  storageBucket: "shiftiq-app.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

⚠️ **Important:** The `databaseURL` for Singapore region uses `firebasedatabase.app`, not `firebaseio.com`. Copy exactly from Firebase console.

### 4. Deploy Security Rules

1. Realtime Database → Rules tab
2. Paste the contents of `database.rules.json`
3. Click **Publish**

### 5. Configure Authorized Domains

Authentication → Settings → Authorized domains
- Add your hosting domain (e.g. `shiftiq.com`, or `glsmp.vkstech.com` if using same domain)
- `localhost` is added by default for testing

### 6. Set Up Hosting (Choose one)

**Option A — GitHub Pages (free):**
1. Create new repo `vkstecho/shiftiq`
2. Upload `index.html`
3. Settings → Pages → Source: main branch, root
4. Custom domain: e.g. `shiftiq.vkstech.com`

**Option B — Firebase Hosting:**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### 7. Test the Flow

**As Super Admin (you):**
1. Open the app URL
2. Enter `8929394920`
3. Receive OTP (or use test code if configured)
4. → Lands on Admin Dashboard

**As New Manager:**
1. Open in incognito/different browser
2. Enter any other 10-digit number
3. Verify OTP
4. → Registration form appears
5. Fill details → submit
6. → "Approval Pending" screen

**Back as Admin:**
1. Refresh dashboard
2. See pending registration
3. Click ✅ Approve
4. Manager can now log in and access dashboard

---

## Firebase Data Structure

```
shiftiq-app/
├── users/
│   └── {phoneKey}/                # phoneKey = phone without '+', e.g. "919876543210"
│       ├── name
│       ├── phone (E.164)
│       ├── role: 'manager' | 'member'
│       ├── status: 'pending' | 'active' | 'suspended' | 'expired'
│       ├── companyId
│       ├── companyName
│       ├── companyType
│       ├── empCode
│       ├── designation
│       ├── plan: 'trial' | 'paid'
│       ├── trialStart, trialEnd (timestamps)
│       └── requestedAt
│
└── companies/
    └── {companyId}/
        ├── info/
        │   ├── name, type, ownerPhone, ownerName
        │   ├── createdAt, plan, trialEnd, status
        ├── employees/{empId}/      (Phase 2+)
        ├── schedules/{YYYY_MM}/    (Phase 3+)
        ├── leaves/{leaveId}/       (Phase 4+)
        ├── reports/{reportId}/     (Phase 4+)
        └── todos/{todoId}/         (Phase 4+)
```

---

## Cost Estimate (Firebase Free Tier)

**Phone Auth:**
- Free: 10,000 verifications/month
- Then: $0.06 per SMS (free tier covers ~333/day for testing)

**Realtime Database:**
- Free: 1 GB storage, 10 GB/month transfer
- Each company ~50 employees × 30 days × 1 byte = 1.5 KB/month per company
- Free tier supports ~600+ companies easily

**Hosting:**
- GitHub Pages: free
- Firebase Hosting: 10 GB transfer/month free

**Estimated monthly cost for 100 active companies:**
- ~$5–10/month max during heavy use

---

## Next Steps After Setup

Once Phase 1 is deployed and verified:
1. Tell me — and I'll deliver Phase 2 (Manager dashboard + Team management)
2. Plan to **dogfood** with your own GLS data first as a "company" inside ShiftIQ
3. After Phase 3 (schedules), recruit 1-2 beta customers to test

---

## Publishing to Google Play Store (TWA)

ShiftIQ can be published to Play Store as a Trusted Web Activity (TWA) — a real Android app powered by your PWA.

### Required Files (✅ already provided)

- `index.html` — main app
- `manifest.json` — PWA manifest with icons
- `sw.js` — service worker (offline + installability)
- `icon192.png`, `icon512.png` — you upload via Gemini
- `privacy.html` — Privacy Policy (required by Play Store)
- `terms.html` — Terms of Service
- `delete-account.html` — Account deletion (required by Play Store)

### Public URLs needed for Play Store Console

When submitting:
- **Privacy Policy URL:** `https://yourdomain.com/privacy.html`
- **Account Deletion URL:** `https://yourdomain.com/delete-account.html`
- **Website URL:** `https://yourdomain.com`

### Build TWA APK

Use **Bubblewrap** by Google:
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://yourdomain.com/manifest.json
bubblewrap build
```

This generates an `app-release-bundle.aab` you upload to Play Console.

### Play Console Required Screenshots
- 2–8 phone screenshots (1080×1920 or similar)
- 1 feature graphic (1024×500)
- App icon (512×512 — same as `icon512.png`)
- Short description (max 80 chars)
- Full description (max 4000 chars)

### Data Safety Form Answers (Play Console)

| Data Type | Collected? | Shared? | Purpose |
|---|---|---|---|
| Phone number | ✅ Yes | ❌ No | Account login (OTP) |
| Name | ✅ Yes | Within company only | App functionality |
| Employee data | ✅ Yes | Within company only | Core feature |
| Location | ❌ No | — | — |
| Photos/videos | ❌ No | — | — |
| Contacts | ❌ No | — | — |
| Financial info | ❌ No | — | — |

- Data is encrypted in transit (HTTPS)
- Users can request deletion (in-app + email + WhatsApp)
