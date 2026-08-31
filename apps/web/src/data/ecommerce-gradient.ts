import { PageModel } from '../types/content'

export const ecommerceGradientData: PageModel = {
  title: 'AURA - Spatial Audio Headphones',
  slug: 'ecommerce-gradient',
  seo: {
    title: 'AURA | Hear the color. Feel the sound.',
    description:
      'The first truly immersive spatial audio headset that physically adapts its driver acoustics to your surroundings in real-time.',
  },
  theme: {
    mode: 'light',
    fontFamily: 'sans',
  },
  navLinks: [
    { label: 'Features', url: '#' },
    { label: 'Tech Specs', url: '#' },
    { label: 'Reviews', url: '#' },
  ],
  blocks: [
    {
      _type: 'hero',
      badges: ['Limited Edition Drop'],
      headline: 'Hear the color.\nFeel the sound.',
      subheadline:
        'The first truly immersive spatial audio headset that physically adapts its driver acoustics to your surroundings in real-time. Pure, visceral sound.',
      interactionType: 'carousel',
      states: [
        {
          label: 'Midnight Black',
          headline: 'Hear the color.\nFeel the sound.',
          subheadline: 'The first truly immersive spatial audio headset.',
          media: {
            url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=1200&q=80',
            alt: 'Aura Headphones in Black',
          },
          ctas: [
            {
              label: 'Pre-order Midnight — $299',
              url: '#',
              variant: 'primary',
              icon: 'ArrowRight',
            },
          ],
        },
        {
          label: 'Lunar White',
          headline: 'Pure sound.\nFlawless design.',
          subheadline: 'Stunningly clean, undeniably powerful.',
          media: {
            url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80',
            alt: 'Aura Headphones in White',
          },
          ctas: [
            { label: 'Pre-order Lunar — $299', url: '#', variant: 'primary', icon: 'ArrowRight' },
          ],
        },
        {
          label: 'Crimson Red',
          headline: 'Bold.\nUnapologetic.',
          subheadline: 'Make a statement with every beat.',
          media: {
            url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80',
            alt: 'Aura Headphones in Red',
          },
          ctas: [
            { label: 'Pre-order Crimson — $299', url: '#', variant: 'primary', icon: 'ArrowRight' },
          ],
        },
      ],
      media: {
        url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=1200&q=80',
        alt: 'Aura Headphones',
      },
      variant: 'split',
    },
    {
      _type: 'feature_grid',
      features: [
        {
          title: 'Spatial Audio',
          description:
            'Experience 360-degree sound that puts you at the absolute center of your music.',
          icon: 'Star',
        },
        {
          title: 'Adaptive ANC',
          description:
            'Block out the world and focus on what matters with intelligent noise cancellation.',
          icon: 'Star',
        },
        {
          title: '40 Hour Battery',
          description:
            'Listen for days on a single charge. Quick charge gives 5 hours in just 10 mins.',
          icon: 'Star',
        },
      ],
      columns: 3,
    },
    {
      _type: 'before_after',
      title: 'Active Noise Cancellation',
      subtitle: 'See the difference our adaptive ANC makes.',
      beforeImage: {
        url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
        alt: 'Crowded noisy street',
      },
      beforeLabel: 'Standard Mode (Traffic Noise)',
      afterImage: {
        url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
        alt: 'Calm serene forest',
      },
      afterLabel: 'Aura ANC Active (Pure Silence)',
    },
    {
      _type: 'image_browser',
      title: 'The Gallery.',
      subtitle: 'See the Aura from every angle.',
      layout: 'thumbnail-rail',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=1200&q=80',
          alt: 'Aura Headphones',
          caption: 'Midnight Black',
        },
        {
          url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80',
          alt: 'Lifestyle',
          caption: 'Lunar White',
        },
        {
          url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80',
          alt: 'Red Headphones',
          caption: 'Crimson Red',
        },
        {
          url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80',
          alt: 'Listening to music',
          caption: 'Pure Comfort',
        },
      ],
    },
    {
      _type: 'product_browser',
      title: 'The Collection',
      products: [
        {
          id: 'midnight',
          name: 'Aura Midnight',
          description:
            'Deep, rich, and mysterious. The classic black colorway for the modern listener.',
          price: '$299',
          media: {
            url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80',
            alt: 'Midnight Black',
          },
          cta: { label: 'Buy Midnight', url: '#' },
        },
        {
          id: 'lunar',
          name: 'Aura Lunar',
          description: 'Clean and striking. A minimal aesthetic that matches everything.',
          price: '$299',
          media: {
            url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
            alt: 'Lunar White',
          },
          cta: { label: 'Buy Lunar', url: '#' },
        },
        {
          id: 'crimson',
          name: 'Aura Crimson',
          description: 'Bold and unapologetic. Stand out from the crowd with our signature red.',
          price: '$319',
          media: {
            url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
            alt: 'Crimson Red',
          },
          cta: { label: 'Buy Crimson', url: '#' },
        },
      ],
    },
    {
      _type: 'calculator',
      title: 'Aura Custom Build',
      subtitle: 'Build your own custom Aura headset with premium materials.',
      inputs: [
        {
          id: 'warranty',
          label: 'Extended Warranty (Years)',
          type: 'slider',
          min: 0,
          max: 5,
          step: 1,
          defaultValue: 1,
        },
        {
          id: 'earpads',
          label: 'Premium Earpads (Sets)',
          type: 'slider',
          min: 0,
          max: 3,
          step: 1,
          defaultValue: 0,
        },
      ],
    },
    {
      _type: 'feature_grid',
      title: "What's in the box.",
      features: [
        { title: 'Aura Headphones', description: '' },
        { title: 'Vegan Leather Case', description: '' },
        { title: 'Braided USB-C Cable', description: '' },
        { title: '3.5mm Audio Cable', description: '' },
      ],
      columns: 4,
    },
    {
      _type: 'testimonials',
      title: "Don't just take our word for it.",
      testimonials: [
        {
          quote: "The adaptive ANC is unlike anything I've experienced. It truly feels like magic.",
          author: 'TechRadar',
        },
        {
          quote:
            'Aura has set a new standard for premium wireless audio. The bass response is incredible.',
          author: 'The Verge',
        },
        {
          quote:
            'Not only do they sound phenomenal, but they are the most comfortable headphones I own.',
          author: 'Wired',
        },
      ],
    },
  ],
}
