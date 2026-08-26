# Midnight Creative - Site Design & Screen Specification

This document provides a comprehensive, concrete specification of the Midnight Creative interface. It merges the internal managed-service model with a unified application architecture designed for extreme simplicity and clarity. 

## 1. Design Summary: What This Software Does

This software helps small and mid-sized businesses find customers, talk to them, and close sales without needing to learn complex marketing tools. 

It provides a single place for a business to:
- Run online ads and first-party Ad Units to get new leads.
- Build and host high-converting Landing Pages with lead-capture forms.
- Keep a list of all their contacts and customers.
- Send emails and text messages to those contacts.
- Set up automatic reminders so they never forget to follow up with a lead.
- See exactly which ads and messages resulted in actual sales.

Because we operate as a managed service, we do the heavy lifting in the background. The business owner uses this software primarily to review and approve the campaigns we recommend, reply to their customers, and see their results in plain numbers.

---

## 2. Global Navigation & Architecture
- **App Background:** Deep Slate (`#0F172A`).
- **Cards/Panels:** Midnight Blue (`#1E293B`) with 8px radius.
- **Top Navigation (Simplified 3-Tab Architecture):**
  - **Left:** Logo.
  - **Center:** `[ Home ]` `[ Messages ]` `[ Advertising ]`.
  - **Right:** Search, Notifications (Action Queue), User Settings.

*Note: Navigation has been radically simplified. "Contacts" lives natively within Messages, and "Reports/Results" have been collapsed into the Home dashboard for a unified macro-view.*

---

## 3. SURFACE 1: HOME (Operational Dashboard & Results)
*The default view upon login. A consolidated cross-domain control surface that answers both "What needs me today?" and "What worked?"*

- **The Action Queue (Approvals & Alerts):**
  - Displays a clean, vertical list for pending actions (e.g., "Approve new Campaign", "3 Unanswered Replies").
- **The Approval UI (Modal):**
  - Displays a business proposal (Proposal, Audience, Message, Follow-Up) with actions: `[ Approve ]`, `[ Request Changes ]`, `[ Decline ]`.
- **Consolidated Performance (The Reports View):**
  - Avoids a giant analytics dashboard. Tells a compact story from money spent to actual business result.
  - Displays the cross-channel Attribution Funnel: `Views → Clicks → Leads → Sales`.
  - Blends Advertising spend (CPL, ROAS) side-by-side with organic reply rates and won sales from Messages.

---

## 4. SURFACE 2: ADVERTISING (Paid Campaigns, Landing Pages, Ad Units)
*The dedicated surface for managing the full acquisition path.*

### A. Advertising Dashboard (The List View)
- **Top-Line Metrics Bar:** Total `Spend`, `Leads`, `CPL`, and `Active Campaigns`.
- **List Tabs:** `[ Campaigns ]` `[ Landing Pages ]` `[ Ad Units ]`.

### B. Campaign Setup Experience (Creation)
- **Layout:** A clean, vertical, single-page form.
- **Destination:** A seamless dropdown to select a created Landing Page as the destination URL.
- **Creative & Platforms:** Vertical list of assets and platform checkboxes (Meta, Google, TikTok). Includes standard OAuth pop-ups for unauthenticated platforms.
- **Budget & Schedule:** Number inputs for daily budget and date pickers.

### C. Landing Page Management & Configurator
*Landing Pages are major, reusable managed assets. They are configured here and can be seamlessly attached to any Campaign.*
- **The Configurator (Split-Screen Overlay):**
  - **Left Panel (Settings & Inputs):** 
    - **Content:** Textareas to map the Headline, Subheadline, Body copy, and CTA.
    - **Theme:** Color pickers and typography toggles to match brand identity.
    - **Forms:** A dropdown to attach reusable Lead Capture Forms.
    - **Publish/Export:** Primary buttons to `[ Publish via LOOPIE ]` (providing a stable, hosted URL) or `[ Export HTML ]` for external hosting.
  - **Right Panel (Live Site Preview):**
    - A live-rendering iframe that instantly updates as content or themes are changed on the left.
- **Asset Hub:** The dashboard lists all created landing pages, showing total views and form submissions, and allows them to be reused across multiple campaigns.

### D. Ad Units (First-Party Ad Serving)
*First-party ad serving is treated as a major backend capability natively available in the UX.*
- **Ad Unit Manager:** Allows users to configure and deploy first-party display ads or embeddable banners.
- **Configuration:** Users upload creative assets and copy. The system generates embed codes or LOOPIE-hosted tags.
- **Integration:** These Ad Units flow into the same Attribution Funnel (View → Click → Lead → Sale) as third-party platform ads, providing a unified performance view.

### E. Running Campaign View (Detail Panel)
*Triggered by clicking a Campaign row. Slides out as a clean overlay panel.*
- **Header:** Campaign Name, Standard Status Dropdown.
- **Event History & Metrics Insight:** A vertical timeline showing chronological history combined with metrics insight (Spend vs. Budget, Impressions, Leads, Sales).
- **Execution Assets:** Explicitly lists the attached Landing Pages, Forms, external Platform Deployments, and internal Ad Units.

---

## 5. SURFACE 3: MESSAGES (Owned Outreach & CRM Lite)
*The dedicated surface for owned communication, follow-up automation, and contact management.*

### A. Messages Dashboard
- **Layout:** 30/70 Split Screen.
- **Left Column:** `[ Compose New ]` button, scheduled lists, active automations, and templates.
- **Right Column (The Composer):** Template picker, smart Audience Selector, Rich Text editor, and the Automation Follow-Up rule builder (`Trigger → Wait → Condition → Action → Stop`).

### B. Contacts (CRM Lite - Nested in Messages)
*Managing people is completely decoupled from the top-level navigation and lives contextually where communication happens.*
- **Contact List:** Searchable, vertical list of all known entities accessible from a tab in the Left Column.
- **Contact Detail (The Timeline):**
  - **Header:** Name, Status Badges (`Lead`, `Customer`).
  - **Sales Flow:** Contextual dropdown for Sales Stage (`New · Contacted · Qualified · Quoted · Won · Lost`).
  - **Body:** Chronological history of the relationship.
  - **Silent Attribution:** Marking a stage as `Won` prompts for a value. The system silently attributes this back through the funnel (Ad → Landing Page → Form → Attributed Lead → Follow-up → Sale).

---

## 6. Page & View Inventory
*A definitive list of all discrete screens, overlays, and modals required for Phase 1.*

### Top-Level Pages (The Simplified 3-Tab Architecture)
1. **Home:** The Action Queue, Approvals dashboard, and consolidated Results/Reporting.
2. **Messages:** The 30/70 split view for audience selection, composing, and the nested Contact list.
3. **Advertising:** The unified dashboard for Campaigns, Landing Pages, and Ad Units.

### Modals & Overlays (Contextual Views)
4. **Approval Modal (Home):** Focused pop-up for reviewing and approving a playbook proposal.
5. **Contact Detail Panel (Messages):** Slide-out overlay showing a contact's timeline and sales pipeline.
6. **Campaign Setup Form (Advertising):** Single-page vertical form for creating an ad campaign.
7. **Running Campaign Panel (Advertising):** Slide-out overlay showing event history and metrics.
8. **Landing Page Configurator (Advertising):** Split-screen overlay for live site preview, Content, Theme, Form, and Publish/Export capabilities.
9. **Ad Unit Configurator (Advertising):** Modal for creating and generating first-party embed codes.
10. **Platform OAuth Modal (Advertising):** Pop-up for authenticating with external platforms.
