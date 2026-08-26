# Midnight Creative Platform

A campaign-first marketing management platform designed for small to mid-sized businesses, agencies, and internal marketing teams. It provides a simple, unified surface for managing creative assets and paid media without the need to navigate multiple ad-platform dashboards.

## Core Loop
1. **Make or upload creative:** Centralized asset management.
2. **Create a campaign:** Combine creative direction, platforms, budget, and dates.
3. **Deploy creative:** Push to various ad platforms.
4. **Track performance:** Monitor spend, outcomes, and CRM-lite metrics.
5. **Compare effectiveness:** Analyze creative and platform results.
6. **Iterate:** Use data to improve the next creative batch.

---

## Core Features

*   **Platform Integrations & Access**: Platform-specific complexity is handled internally, allowing users to create normalized campaigns. Deployments link internal creatives directly to external ad-platform objects to track impressions, clicks, spend, and conversions.
    *   **Phase 1 Priority (Active)**:
        *   Meta Ads
        *   Google Ads
        *   TikTok Ads
    *   **Planned Candidates (Future)**:
        *   LinkedIn Ads
        *   Microsoft Ads
        *   Reddit Ads
        *   Pinterest Ads
        *   Snapchat Ads
        *   YouTube-specific flows
*   **Landing Pages & Forms**: Built using structured, versioned manifests instead of freeform builders. Forms are first-class, reusable entities that can capture data across multiple landing pages.
*   **Click-Through Lifecycles**: Full attribution funnel tracking from an initial anonymous session (view → click) to a form submission (lead generation) and ultimately, a sale. The system seamlessly transitions anonymous click events into trackable contacts the moment a form is submitted.
*   **Automations**: Powerful rule-based engines (`Trigger → Wait → Condition → Action → Stop`). Triggers (e.g., `lead_created`, `message_sent`) fire regardless of the acquisition source, ensuring that a lead from a paid Meta ad can receive the same automated follow-up sequence as an organic lead.
*   **Unified CRM-Lite**: Integrated Contact, Lead, and Sale management tracking all interactions and timeline events in one place, avoiding the need for an external CRM for core acquisition paths.

---

## Architecture Overview (For Developers)

The platform is built on a **Unified Data Model** designed around one core principle: *Acquisition is plural, everything downstream is singular.*

### Key Concepts

*   **Unified Spine (`Contact → Lead → Sale → Interaction`)**: A business reaches people through paid media (Campaigns) and owned outreach (Messaging). Regardless of the channel, there is only one Contact record, one Lead pipeline, and one Automation engine per account.
*   **Source Abstraction**: A polymorphic pointer linking leads and interactions to their origin (`source_type: message | deployment | ad_unit`). 
*   **Unified Asset Library**: Atomic, reusable source material (images, text, video) shared by both **Templates** (Message-oriented) and **Creatives** (Campaign-oriented).
*   **Campaigns vs. Messages**:
    *   **Campaign**: A paid-media run (creatives, platforms, budget, deployments).
    *   **Message**: An owned/organic send (recipients, scheduling, templates).
*   **Landing Pages & Forms**: Built with a structured manifest. Forms are first-class, reusable entities. Form submissions resolve contacts and transition anonymous sessions into trackable leads.

---

## Documentation Links (For the Team)

Comprehensive project documentation is organized in the `/docs` directory:

*   [**Architecture**](./docs/architecture): Unified data model, IA, and platform design specs.
*   [**Features**](./docs/features): Campaign models, creative asset systems, automation rules, attribution funnels, and CRM-lite requirements.
*   [**Operations**](./docs/operations): SLA metrics, daily account operations, and client communication workflows.
*   [**Strategy**](./docs/strategy): Product vision, roadmap, scope, and business plans.
*   [**Sales & Marketing**](./docs/sales-marketing): Sales materials and marketing guidelines.
