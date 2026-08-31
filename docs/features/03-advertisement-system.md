# Advertisement & Asset System

## Asset types

- Image
- Text
- Image + Text composition
- Video
- Audio

## The Ad-First Architecture

LOOPIE treats Advertisements (Ads) as the primary product object for paid messaging. Campaigns are optional or deferred grouping mechanisms.

### Media vs. Ads vs. Runs

1. **Media (Assets)**: Reusable raw materials (images, video, audio, text snippets, logos).
2. **Advertisement (Ad)**: The conceptual, finished message that the user understands and manages. It acts as a container for multiple media variants (e.g., a square image, a vertical video, text).
3. **Ad Run (Deployment)**: The internal, platform-specific execution of an Ad (e.g., Meta Feed, TikTok).

## 1 Ad, Multiple Platforms

One Ad may run on multiple platforms simultaneously. However, LOOPIE does not assume every Ad works everywhere.
Each `AdRun` validates its own requirements against the parent `Advertisement`'s media pool.

Example:

- Parent Ad contains: 1:1 image, 9:16 video.
- Meta Feed Run: Validates and selects the 1:1 image. (✓)
- TikTok Run: Validates and selects the 9:16 video. (✓)
- Google Search Run: Looks for text-only constraints. (✕ Unsupported).

## Toggling and Status

Users manage live state primarily at the Ad level:

- **Global Off**: Pausing the parent Ad cascades a pause down to all active platform AdRuns.
- **Global On**: Activating the parent Ad activates all _valid_ configured AdRuns.
- **Local Toggles**: Users can pause individual AdRuns (e.g., pause the TikTok run while keeping Meta active) directly from the Ad management page.

## The Ad Page UX

The Ad detail page is the central hub for managing an advertisement's lifecycle. It emphasizes:

- **Live Preview**: Displaying how the Ad looks on specific platforms.
- **Compatibility**: Showing which platforms the Ad is valid for based on its media pool.
- **Live Status & Spend**: Real-time tracking per platform run.
- **View Live**: Providing a click-through link (`previewUrl`) to see the real platform ad in the wild.

## Principle

Ads are the primary message objects. Platform-specific execution stays an internal run concept.
