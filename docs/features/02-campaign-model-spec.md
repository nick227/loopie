# Campaign Model Spec

## Definition
A campaign is a named creative direction run across one or more platforms for a defined period and budget.

Campaign names should usually describe the art style, concept, or ad tone, for example:
- Raw Customer Stories
- Clean Luxury
- Founder Direct
- Neighborhood Humor
- Before & After

## Required fields
- Name
- Creative(s)
- Platform(s)
- Budget
- Start date
- End date
- Destination
- Status

## Lifecycle
Draft → Active → Paused → Active → Ended

## Core actions
- Pause / Resume
- Extend
- Duplicate
- End

## Rules
Pause/resume and extend preserve campaign identity and history. Duplicate creates a new campaign with its own identity and performance history. End stops the campaign and freezes it for historical reporting.

## Creative changes mid-campaign
Users may add or replace active creative, but historical creative must never be overwritten. A meaningful creative change creates a new creative version or deployment so performance remains attributable to the correct creative.

## Minimal relationship
Campaign
- Creatives
- Platforms
- Budget
- Dates
- Deployments
- Performance
