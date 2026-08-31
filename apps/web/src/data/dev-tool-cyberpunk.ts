import { PageModel } from '../types/content'

export const devToolCyberpunkData: PageModel = {
  title: 'NEURAL_CORE - Dev Tool',
  slug: 'dev-tool-cyberpunk',
  seo: {
    title: 'NEURAL_CORE | Compute at bare metal speed.',
    description:
      'The high-performance, memory-safe data processing engine built for the absolute limits of modern hardware.',
  },
  theme: {
    mode: 'dark',
    fontFamily: 'mono',
  },
  navLinks: [
    { label: '/docs', url: '#' },
    { label: '/api', url: '#' },
    { label: '/github', url: '#' },
  ],
  blocks: [
    {
      _type: 'hero',
      badges: ['SYSTEM_STATUS: ONLINE // V2.0.4'],
      headline: 'Compute at\nbare metal speed.',
      subheadline:
        'The high-performance, memory-safe data processing engine built for the absolute limits of modern hardware. Zero-cost abstractions. Pure execution.',
      ctas: [
        { label: 'NPM INSTALL', url: '#', variant: 'primary', icon: 'ChevronRight' },
        { label: 'READ DOCS', url: '#', variant: 'outline', icon: 'Terminal' },
      ],
      variant: 'split',
    },
    {
      _type: 'service_selector',
      title: 'INTEGRATE_IN_SECONDS',
      subtitle: 'Native bindings for your entire stack.',
      services: [
        {
          id: 'react',
          label: 'REACT',
          headline: 'React Integration',
          description: 'Drop-in Provider with Suspense support.',
          icon: 'Code',
        },
        {
          id: 'vue',
          label: 'VUE',
          headline: 'Vue Integration',
          description: 'First-class Composition API composables.',
          icon: 'Code',
        },
        {
          id: 'node',
          label: 'NODE.JS',
          headline: 'Node.js Backend Integration',
          description: 'Native C++ bindings via N-API for backend processing.',
          icon: 'Terminal',
        },
        {
          id: 'rust',
          label: 'RUST',
          headline: 'Native Rust Core',
          description: 'The core library, available on crates.io.',
          icon: 'Cpu',
        },
      ],
    },
    {
      _type: 'feature_grid',
      title: 'SYSTEM_ARCHITECTURE',
      subtitle:
        'Built from the ground up for maximum developer experience and runtime performance.',
      features: [
        {
          title: '0ms LATENCY',
          description:
            'Direct hardware access bypasses standard OS bottlenecks for instant execution.',
          icon: 'Zap',
        },
        {
          title: 'MEMORY SAFE',
          description:
            'Written in pure Rust with strict borrow checking. No garbage collection pauses.',
          icon: 'Cpu',
        },
        {
          title: 'DISTRIBUTED',
          description:
            'Automatically scales across available nodes in your local or cloud cluster.',
          icon: 'Network',
        },
        {
          title: 'TYPE SAFE',
          description: '100% TypeScript support out of the box with auto-generated definitions.',
          icon: 'Terminal',
        },
        {
          title: 'HOT RELOAD',
          description: 'Instant HMR via WebSockets without losing application state.',
          icon: 'Copy',
        },
        {
          title: 'EDGE READY',
          description:
            'Compiles to WebAssembly for execution in Cloudflare Workers and Vercel Edge.',
          icon: 'Check',
        },
      ],
      columns: 3,
    },
    {
      _type: 'sticky_media',
      sections: [
        {
          id: 'configure.ts',
          headline: 'INITIALIZE<br/>THE CORE',
          body: 'Setup is a single line. Import the module, pass your configuration, and the daemon spins up instantly in the background.',
          media: {
            url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
            alt: 'Code Editor showing setup',
          },
        },
        {
          id: 'connect.ts',
          headline: 'ESTABLISH<br/>CONNECTION',
          body: 'WebSockets are handled natively. Subscribe to data streams and let NEURAL_CORE manage backpressure and dropped packets.',
          media: {
            url: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80',
            alt: 'Terminal showing connection',
          },
        },
        {
          id: 'deploy.sh',
          headline: 'EXECUTE<br/>DEPLOYMENT',
          body: 'Push to edge locations worldwide. Our WASM runtime ensures your code executes milliseconds from your users.',
          media: {
            url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80',
            alt: 'Global map',
          },
        },
      ],
    },
    {
      _type: 'comparison',
      title: 'PERFORMANCE METRICS',
      items: [
        { feature: 'Garbage Collection', us: 'Zero-Pause (Rust)', them: 'Mark & Sweep (V8)' },
        { feature: 'Memory Footprint', us: '< 5MB', them: '150MB+' },
        { feature: 'Thread Model', us: 'Actor-based M:N', them: 'Single-threaded' },
        { feature: 'Cold Start', us: '0.4ms', them: '150ms+' },
        { feature: 'Type Safety', us: true, them: 'Optional / Any' },
      ],
    },
  ],
}
