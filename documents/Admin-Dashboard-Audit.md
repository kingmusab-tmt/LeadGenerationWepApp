# Admin Dashboard Audit Report

**Date:** February 8, 2026  
**Scope:** `app/admindashboard/` (UI) + `app/api/admin/` (API routes)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Critical Security Issues](#3-critical-security-issues)
4. [Layout & Navigation](#4-layout--navigation)
5. [Overview Page](#5-overview-page)
6. [User Management](#6-user-management)
7. [Content Management](#7-content-management)
8. [Financial Management](#8-financial-management)
9. [Tier Management](#9-tier-management)
10. [Help Management](#10-help-management)
11. [API Route Security Matrix](#11-api-route-security-matrix)
12. [Recommendations Summary](#12-recommendations-summary)

---

## 1. Executive Summary

The admin dashboard provides platform-wide management across 6 sections: Overview, User Management, Tier Management, Help Management, Financial Management, and Content Management. While the UI is functional, the audit reveals **critical security vulnerabilities** in the API layer (8 of 13 admin API routes have zero authentication), plus several architectural and UX issues that should be addressed.

### Severity Distribution

| Severity     | Count | Description                                                          |
| ------------ | ----- | -------------------------------------------------------------------- |
| **CRITICAL** | 4     | Unauthenticated admin API routes exposing sensitive data & mutations |
| **HIGH**     | 6     | Security gaps, hardcoded data, missing features                      |
| **MEDIUM**   | 8     | UX improvements, code quality, inconsistencies                       |
| **LOW**      | 5     | Minor polish, naming, dead code cleanup                              |

---

## 2. Architecture Overview

### Current Structure

```
app/admindashboard/
├── layout.tsx                    — Sidebar + AppBar shell (382 lines)
├── page.tsx                      — Root page (passes undefined children)
├── overview/                     — Dashboard KPIs + charts (720 lines)
├── user_management/              — CRUD users (546 lines)
├── content_management/           — Lead/call verification (717 lines)
├── financial_management/         — Transactions + payouts (796 lines)
├── tier_management/              — Subscription tier CRUD (945 lines)
└── help_management/              — FAQ + video tutorial CRUD (687 lines)

app/api/admin/
├── calls/route.ts
├── financial/{transactions,payouts}/route.ts
├── individualTier/route.ts
├── leads/route.ts
├── migrate-encryption/route.ts
├── overview/route.ts
├── tier/{route.ts, reorder/route.ts}
├── users/{route.ts, [id]/route.ts, [id]/status/route.ts}
└── [type]s/[id]/flag/route.ts
```

### Anti-Pattern: Manual Layout Wrapping

Every admin page manually imports and wraps content in `<AdminDashboard>`:

```tsx
// Every page does this:
import AdminDashboard from "../layout";
return (
  <AdminDashboard>
    <Content />
  </AdminDashboard>
);
```

In Next.js App Router, `layout.tsx` is **automatically applied** as a wrapping layout. The current approach causes **double-nesting** — Next.js wraps the page in the layout, then the page wraps itself again. This should be refactored to use the standard App Router layout pattern.

---

## 3. Critical Security Issues

### 3.1 Unauthenticated Admin API Routes (CRITICAL)

**8 of 13 admin API routes have NO authentication checks.** The `/api/admin/` URL path provides zero protection — anyone who knows the URL can access these endpoints.

**Most dangerous — public mutation endpoints:**

| Route                              | Risk                                             |
| ---------------------------------- | ------------------------------------------------ |
| `PUT /api/admin/users/[id]`        | **Anyone can change any user's role to "admin"** |
| `DELETE /api/admin/users/[id]`     | **Anyone can delete any user account**           |
| `PUT /api/admin/users/[id]/status` | **Anyone can suspend/activate any user**         |
| `PUT /api/admin/[type]s/[id]/flag` | Anyone can flag/unflag leads and calls           |

**Public read endpoints leaking sensitive data:**

| Route                                   | Data Exposed                                         |
| --------------------------------------- | ---------------------------------------------------- |
| `GET /api/admin/users`                  | All user emails, names, roles, status                |
| `GET /api/admin/overview`               | Full platform analytics, revenue, transaction counts |
| `GET /api/admin/financial/transactions` | All transaction amounts, user names, metadata        |
| `GET /api/admin/leads`                  | All lead data including form field values, AI scores |
| `GET /api/admin/calls`                  | All call records with buyer/seller data              |

### 3.2 No CSRF Protection on Any Admin Route (HIGH)

None of the 13 admin API routes validate CSRF tokens, despite the project having `csrfMiddleware.ts` available. All POST/PUT/DELETE endpoints are vulnerable to cross-site request forgery attacks.

### 3.3 Regex Injection in User Search (HIGH)

```typescript
// app/api/admin/users/route.ts
{ name: { $regex: search, $options: "i" } }
```

The `search` query parameter is passed directly into a MongoDB `$regex` without escaping. This enables:

- **ReDoS attacks** (malicious regex causing CPU exhaustion)
- **NoSQL regex injection** (crafted patterns to extract data)

### 3.4 Unsanitized Input to findByIdAndUpdate (MEDIUM)

`PUT /api/admin/individualTier` and `PUT /api/admin/users/[id]` pass raw request body directly to `findByIdAndUpdate` without validation, allowing attackers to set arbitrary fields.

---

## 4. Layout & Navigation

**File:** `app/admindashboard/layout.tsx` (382 lines)

### Issues Found

| #   | Severity   | Issue                             | Details                                                                                                                      |
| --- | ---------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | **HIGH**   | Double layout nesting             | Layout is both auto-applied by Next.js AND manually imported/wrapped by each page                                            |
| 2   | **MEDIUM** | No active route highlighting      | Sidebar items don't indicate which page is currently active                                                                  |
| 3   | **MEDIUM** | Hardcoded colors                  | Uses `color: "blue"`, `backgroundColor: "white"` instead of MUI theme tokens                                                 |
| 4   | **MEDIUM** | Sign Out button shows wrong text  | `loading                                                                                                                     |     | "Sign Out"`— when`loading`is`false`, the expression evaluates to `"Sign Out"`, but the logic is confusing and fragile |
| 5   | **MEDIUM** | Drawer sidebar items duplicated   | 6 nav items with identical sx styling — should be extracted into a reusable component                                        |
| 6   | **LOW**    | Unused submenu state              | `subMenuAnchorEl`, `subMenuVisible`, `subMenuTimeout`, `handleSubMenuOpen`, `handleSubMenuClose` are declared but never used |
| 7   | **LOW**    | Commented-out code                | ~60 lines of commented-out nav items and redirect logic                                                                      |
| 8   | **LOW**    | Wrong icon for Content Management | Uses `<LocalAtm>` (money icon) for "Content Management" — should use a content-related icon                                  |
| 9   | **LOW**    | Wrong icon for Tier Management    | Uses `<TireRepair>` (car tire icon) for "Tier Management" — should use a layer/stack icon                                    |
| 10  | **MEDIUM** | Settings link in profile menu     | Points to `/admindashboard/settings` which doesn't exist                                                                     |
| 11  | **MEDIUM** | No breadcrumbs                    | No way to tell current location besides the sidebar (which has no active state)                                              |

### Recommendation: Navigation Refactor

```tsx
// Extract nav items into a config array
const navItems = [
  { label: "Overview", path: "overview", icon: <Dashboard /> },
  { label: "User Management", path: "user_management", icon: <People /> },
  { label: "Tier Management", path: "tier_management", icon: <Layers /> },
  { label: "Help Management", path: "help_management", icon: <HelpOutline /> },
  {
    label: "Financial Management",
    path: "financial_management",
    icon: <AccountBalance />,
  },
  {
    label: "Content Management",
    path: "content_management",
    icon: <Article />,
  },
];

// Render with active state
navItems.map((item) => (
  <ListItemButton
    key={item.path}
    selected={pathname.includes(item.path)}
    onClick={() => handleNavigation(item.path)}
  >
    ...
  </ListItemButton>
));
```

---

## 5. Overview Page

**File:** `app/admindashboard/overview/overview.tsx` (720 lines)

### Issues Found

| #   | Severity   | Issue                                | Details                                                                                                                                                                                   |
| --- | ---------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **HIGH**   | Hardcoded fallback data              | When the API call fails, the overview displays **hardcoded dummy data** (`totalUsers: 1245`, `totalRevenue: 582500`, etc.) instead of showing an error — this is misleading in production |
| 2   | **HIGH**   | Random chart data on API failure     | `userGrowth` and `revenueTrend` are populated with `Math.random()` values when the API fails                                                                                              |
| 3   | **MEDIUM** | `redirect()` called inside useEffect | Should use `router.push()` — `redirect()` is for Server Components and throws an error in client components                                                                               |
| 4   | **MEDIUM** | Timeframe selector unused            | `timeframe` state and `handleTimeframeChange` are defined but never rendered in the UI                                                                                                    |
| 5   | **MEDIUM** | TrendIndicator values hardcoded      | `<TrendIndicator value={12} />` and `<TrendIndicator value={8} />` are always static, not from API data                                                                                   |
| 6   | **LOW**    | Many unused icon imports             | `BarChartIcon`, `PieChartIcon`, `Star`, `Timeline`, `LocalAtm` imported but never used                                                                                                    |

### Recommendations

- Remove all hardcoded fallback data — show an error state or empty state when API fails
- Actually pass timeframe to the API call or remove the state
- Compute trend indicators from real data (compare current vs previous period)

---

## 6. User Management

**File:** `app/admindashboard/user_management/usermanagement.tsx` (546 lines)

### Issues Found

| #   | Severity   | Issue                                    | Details                                                                                                                             |
| --- | ---------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **HIGH**   | No CSRF tokens on mutations              | PUT (edit user), DELETE, PUT (status toggle) — none include CSRF headers                                                            |
| 2   | **HIGH**   | Client-side filtering after server-fetch | Fetches users with query params AND re-filters on the client — either server-side or client-side filtering should be used, not both |
| 3   | **MEDIUM** | No confirmation dialog for delete        | Uses browser `confirm()` — should use a proper MUI Dialog for consistency                                                           |
| 4   | **MEDIUM** | `window.location.reload()` for refresh   | Should re-fetch data instead of full page reload                                                                                    |
| 5   | **MEDIUM** | Two identical loading states             | `userLoading` and `loading` both render the exact same loading component — could be consolidated                                    |
| 6   | **MEDIUM** | No bulk operations                       | Cannot select multiple users for bulk suspend/delete/role change                                                                    |
| 7   | **LOW**    | `handleCloseSnackbar` is empty           | Function exists but does nothing — notifications are managed elsewhere                                                              |
| 8   | **LOW**    | No email validation in edit dialog       | Email field allows any value                                                                                                        |

### Missing Features

- **Bulk actions** (select multiple users → suspend/activate/delete)
- **Export users** to CSV
- **User activity log** (last actions, login history)
- **Impersonation** (view platform as a specific user for support)
- **Password reset** trigger for support scenarios

---

## 7. Content Management

**File:** `app/admindashboard/content_management/content.tsx` (717 lines)

### Issues Found

| #   | Severity   | Issue                                 | Details                                                                                       |
| --- | ---------- | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | **HIGH**   | No CSRF tokens on flag operations     | `handleFlagContent` sends PUT without CSRF headers                                            |
| 2   | **MEDIUM** | No status filter for leads            | Can search by seller name or field values, but can't filter by lead status (new/sold/flagged) |
| 3   | **MEDIUM** | No unflag action                      | Can flag content but cannot unflag it through the UI                                          |
| 4   | **MEDIUM** | No approval/rejection workflow        | Flagged items just get flagged — no resolution workflow (approve, reject, remove)             |
| 5   | **LOW**    | `FilterList` icon imported but unused |                                                                                               |

### Missing Features

- **Content moderation queue** — prioritized list of flagged items awaiting review
- **Auto-flag rules** — suspicious patterns (duplicate leads, spam keywords) automatically flagged
- **Moderation history** — who flagged what and when, and what action was taken
- **Lead quality audit** — spot-check AI scoring accuracy

---

## 8. Financial Management

**File:** `app/admindashboard/financial_management/financial.tsx` (796 lines)

### Issues Found

| #   | Severity   | Issue                                | Details                                                                                                                                                     |
| --- | ---------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **HIGH**   | Payouts API is broken                | `financial/payouts/route.ts` has its success response commented out — request handler returns nothing                                                       |
| 2   | **HIGH**   | Export button is non-functional      | "Export" button renders but has no `onClick` handler                                                                                                        |
| 3   | **MEDIUM** | No refund action                     | Can view transactions but cannot initiate refunds from the admin panel                                                                                      |
| 4   | **MEDIUM** | No revenue summaries                 | No totals/aggregations shown (total revenue, total payouts, net revenue, etc.)                                                                              |
| 5   | **MEDIUM** | Hydration risk in transaction dialog | `ListItemText secondary` receives `<Box>` and `<Chip>` — these render as `<div>` inside `<p>`, causing hydration errors (same pattern fixed in content.tsx) |
| 6   | **LOW**    | `InputAdornment` imported but unused |                                                                                                                                                             |

### Missing Features

- **Revenue dashboard** — daily/weekly/monthly revenue charts, top-line KPIs
- **Refund management** — initiate and track refunds from admin panel
- **Payout processing** — currently broken; needs actual implementation
- **Invoice generation** — generate invoices for transactions
- **Date range filters** — filter transactions by date range

---

## 9. Tier Management

**File:** `app/admindashboard/tier_management/tier.tsx` (945 lines)

### Issues Found

| #   | Severity   | Issue                         | Details                                                         |
| --- | ---------- | ----------------------------- | --------------------------------------------------------------- |
| 1   | **MEDIUM** | No confirmation for delete    | `handleDeleteTier` deletes immediately without confirmation     |
| 2   | **MEDIUM** | No CSRF tokens on mutations   | POST/PUT/DELETE tier operations don't include CSRF headers      |
| 3   | **MEDIUM** | No tier preview               | No way to preview how the tier looks on the public pricing page |
| 4   | **LOW**    | `Divider` imported but unused |                                                                 |
| 5   | **LOW**    | No tier usage statistics      | Does not show how many users are on each tier                   |

### Positive Notes

- Drag-and-drop reordering with `@dnd-kit` is well-implemented
- Tier limits configuration is comprehensive
- Pricing preview in the dialog is helpful
- Feature list management works well

---

## 10. Help Management

**File:** `app/admindashboard/help_management/page.tsx` (687 lines)

### Issues Found

| #   | Severity   | Issue                                         | Details                                                                                                   |
| --- | ---------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | **HIGH**   | No authentication check                       | Page doesn't verify user is admin — any logged-in user could access `/admindashboard/help_management`     |
| 2   | **HIGH**   | No AdminDashboard wrapper                     | Page renders without the admin sidebar/appbar — inconsistent with other admin pages                       |
| 3   | **MEDIUM** | No CSRF tokens on mutations                   | POST/PUT/DELETE for videos and FAQs don't include CSRF headers                                            |
| 4   | **MEDIUM** | Edit dialog duplicates form                   | The edit dialog for mobile repeats the same form fields from the sidebar — could share the form component |
| 5   | **MEDIUM** | Uses `React.useEffect` instead of `useEffect` | Inconsistent with the import at the top (which already imports `useEffect`)                               |
| 6   | **MEDIUM** | Manual responsive detection                   | `window.innerWidth < 600` — should use MUI's `useMediaQuery` like other pages                             |
| 7   | **LOW**    | No video preview                              | Cannot preview embedded YouTube videos in the admin panel                                                 |
| 8   | **LOW**    | No drag-and-drop ordering                     | Videos and FAQs cannot be reordered (unlike the tier management page)                                     |

---

## 11. API Route Security Matrix

| Route                                   | Auth | Admin Check | CSRF | Input Validation   | Status                       |
| --------------------------------------- | ---- | ----------- | ---- | ------------------ | ---------------------------- |
| `GET /api/admin/overview`               | ❌   | ❌          | N/A  | N/A                | **VULNERABLE**               |
| `GET /api/admin/users`                  | ❌   | ❌          | N/A  | ❌ Regex injection | **VULNERABLE**               |
| `PUT /api/admin/users/[id]`             | ❌   | ❌          | ❌   | ❌ Raw body to DB  | **CRITICAL**                 |
| `DELETE /api/admin/users/[id]`          | ❌   | ❌          | ❌   | N/A                | **CRITICAL**                 |
| `PUT /api/admin/users/[id]/status`      | ❌   | ❌          | ❌   | ❌                 | **CRITICAL**                 |
| `GET /api/admin/leads`                  | ❌   | ❌          | N/A  | N/A                | **VULNERABLE**               |
| `GET /api/admin/calls`                  | ❌   | ❌          | N/A  | N/A                | **VULNERABLE**               |
| `PUT /api/admin/[type]s/[id]/flag`      | ❌   | ❌          | ❌   | Partial            | **VULNERABLE**               |
| `GET /api/admin/financial/transactions` | ❌   | ❌          | N/A  | N/A                | **VULNERABLE**               |
| `GET /api/admin/financial/payouts`      | ❌   | ❌          | N/A  | N/A                | **BROKEN**                   |
| `GET/POST/PUT /api/admin/tier`          | ✅   | ✅          | ❌   | Partial            | OK (needs CSRF)              |
| `PUT /api/admin/tier/reorder`           | ✅   | ✅          | ❌   | Partial            | OK (needs CSRF)              |
| `GET/PUT/DEL /api/admin/individualTier` | ✅   | ✅          | ❌   | ❌                 | OK (needs CSRF + validation) |
| `POST /api/admin/migrate-encryption`    | ✅   | ✅          | ❌   | ✅                 | OK (needs CSRF)              |

---

## 12. Recommendations Summary

### Priority 1 — Security (Do Immediately)

1. **Add authentication + admin role check to all 8 unprotected API routes** — this is the most critical issue. Use the same pattern as `tier/route.ts`:

   ```typescript
   const session = await getServerSession(authOptions);
   if (!session?.user) return unauthorized();
   const user = await User.findById(session.user.id);
   if (user.role !== "admin") return forbidden();
   ```

2. **Add CSRF validation to all mutating admin endpoints** (POST, PUT, DELETE) using the existing `csrfMiddleware.ts`

3. **Escape regex in user search** — use `escapeRegExp()` utility before passing to MongoDB `$regex`

4. **Validate and sanitize request bodies** — use Zod schemas for all admin mutation endpoints, especially `users/[id]` PUT and `individualTier` PUT

5. **Add admin role check to Help Management page** — currently any authenticated user can access it

### Priority 2 — Bugs & Data Integrity

6. **Fix payouts API** — the GET handler's success response is commented out
7. **Remove hardcoded dummy data from overview** — display error/empty state when API fails
8. **Fix hydration errors in financial management** — `Chip`/`Box` inside `ListItemText secondary` needs `component="span"`
9. **Fix the admin page** (`app/admindashboard/page.tsx`) — currently renders `<AdminDashboard children={undefined} />`, should redirect to `/admindashboard/overview`
10. **Fix `redirect()` in overview** — replace with `router.push()` for client components

### Priority 3 — Architecture

11. **Remove manual `<AdminDashboard>` wrapping** from all pages — let Next.js App Router handle layout nesting automatically. Each page component should only render its own content.

12. **Extract sidebar nav config** into array and add active route highlighting using `usePathname()`

13. **Use consistent data fetching** — standardize on either axios (used in help management) or fetch (used everywhere else)

14. **Add CSRF tokens to all frontend mutation calls** — import and use the `useCSRF()` hook

### Priority 4 — UX Improvements

15. **Add breadcrumbs** for navigation context
16. **Replace `window.location.reload()`** with data re-fetching in User Management and Content Management
17. **Add confirmation dialogs** for destructive actions (delete user, delete tier) — use MUI Dialog instead of `window.confirm()`
18. **Add Export functionality** to Financial Management (button exists but does nothing)
19. **Add bulk operations** to User Management (multi-select → bulk suspend/delete)
20. **Add date range filters** to Financial Management and Content Management
21. **Fix sidebar icons** — Content Management should use `<Article>` or `<Fact_Check>`, Tier Management should use `<Layers>` or `<WorkspacePremium>`
22. **Add revenue summary cards** at top of Financial Management page
23. **Add active user count per tier** in Tier Management

### Priority 5 — Code Quality

24. **Remove unused imports** across all files (FilterList, InputAdornment, unused icons)
25. **Remove dead/commented-out code** (~60 lines in layout.tsx, payouts route)
26. **Extract duplicated sidebar item styles** into a shared sx object or styled component
27. **Use MUI `useMediaQuery`** in Help Management instead of manual `window.innerWidth` check
28. **Remove unused state variables** (`subMenuAnchorEl`, `subMenuVisible`, etc. in layout)

---

## Effort Estimates

| Priority          | Items  | Estimated Effort |
| ----------------- | ------ | ---------------- |
| P1 — Security     | 5      | 1–2 days         |
| P2 — Bugs         | 5      | 0.5–1 day        |
| P3 — Architecture | 4      | 1–2 days         |
| P4 — UX           | 9      | 2–3 days         |
| P5 — Code Quality | 5      | 0.5 day          |
| **Total**         | **28** | **5–8 days**     |
