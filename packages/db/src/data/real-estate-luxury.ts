import { PageModel } from '../content'

export const realEstateLuxuryData: PageModel = {
  title: 'Aura Estates - Luxury Real Estate',
  slug: 'real-estate-luxury',
  seo: {
    title: 'Aura Estates | Extraordinary Homes for Extraordinary Lives',
    description:
      'Discover the most exclusive luxury properties, estates, and architectural masterpieces around the globe.',
  },
  theme: {
    mode: 'dark',
    fontFamily: 'serif',
  },
  navLinks: [
    { label: 'Properties', url: '#properties' },
    { label: 'Neighborhoods', url: '#neighborhoods' },
    { label: 'Agents', url: '#agents' },
    { label: 'Contact', url: '#contact' },
  ],
  blocks: [
    {
      _type: 'hero',
      headline: 'Extraordinary homes\nfor extraordinary lives.',
      subheadline:
        "Curating the world's most exclusive architectural masterpieces and legacy estates for discerning clientele.",
      interactionType: 'carousel',
      states: [
        {
          label: 'Beverly Hills',
          headline: 'The Beverly Estate',
          subheadline: '$45,000,000 • 8 Beds • 12 Baths',
          media: {
            url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80',
            alt: 'Beverly Hills Estate',
          },
          ctas: [{ label: 'View Property', url: '#', variant: 'primary', icon: 'ArrowRight' }],
        },
        {
          label: 'Aspen',
          headline: 'Mountain Retreat',
          subheadline: '$18,900,000 • 6 Beds • 7 Baths',
          media: {
            url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=2000&q=80',
            alt: 'Aspen Retreat',
          },
          ctas: [{ label: 'View Property', url: '#', variant: 'primary', icon: 'ArrowRight' }],
        },
        {
          label: 'Manhattan',
          headline: 'Sky Penthouse',
          subheadline: '$28,500,000 • 4 Beds • 5 Baths',
          media: {
            url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=2000&q=80',
            alt: 'Manhattan Penthouse',
          },
          ctas: [{ label: 'View Property', url: '#', variant: 'primary', icon: 'ArrowRight' }],
        },
      ],
      badges: ['Est. 1998'],
    },
    {
      _type: 'feature_grid',
      title: 'The Aura Difference',
      subtitle: 'A bespoke approach to luxury real estate, tailored to your exact specifications.',
      features: [
        {
          title: 'Unrivaled Access',
          description: 'Off-market opportunities and private listings not available to the public.',
          icon: 'Key',
        },
        {
          title: 'Global Network',
          description: 'Connections with high-net-worth individuals and family offices worldwide.',
          icon: 'Globe',
        },
        {
          title: 'White-Glove Service',
          description: 'Comprehensive advisory, from viewing to acquisition and beyond.',
          icon: 'Shield',
        },
      ],
    },
    {
      _type: 'text_media',
      headline: 'Architectural Masterpieces',
      body: "Every property in our collection is vetted for its architectural significance, premium location, and unparalleled craftsmanship. We don't just sell homes; we curate legacies.",
      media: {
        url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
        alt: 'Modern Luxury Interior',
      },
      layout: 'media-right',
    },
    {
      _type: 'image_browser',
      title: 'Exclusive Listings',
      subtitle: 'A curated selection of our most distinguished active properties.',
      layout: 'thumbnail-rail',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
          alt: 'Beverly Hills',
          caption: 'The Beverly Estate — $45M',
        },
        {
          url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
          alt: 'Aspen',
          caption: 'Mountain Retreat — $18.9M',
        },
        {
          url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
          alt: 'Manhattan',
          caption: 'Sky Penthouse — $28.5M',
        },
        {
          url: 'https://images.unsplash.com/photo-1613490908571-9ce224ac117d?auto=format&fit=crop&w=1200&q=80',
          alt: 'Miami',
          caption: 'Oceanfront Villa — $32M',
        },
      ],
    },
    {
      _type: 'testimonials',
      title: 'Client Relationships',
      testimonials: [
        {
          quote:
            'Aura Estates handled the acquisition of our Malibu property with absolute discretion and unmatched professionalism. Their access to off-market listings is truly exceptional.',
          author: 'J. Reynolds',
          role: 'Private Client',
          metrics: 'Acquired $32M Estate',
        },
      ],
    },
    {
      _type: 'form',
      title: 'Private Consultation',
      formType: 'contact',
      buttonLabel: 'Request Callback',
      successMessage: 'An advisor will contact you shortly.',
    },
    {
      _type: 'hotspot_viewer',
      title: 'The Beverly Estate - Floorplan',
      baseImage: {
        url: 'https://images.unsplash.com/photo-1600607688126-7f41539665bc?auto=format&fit=crop&w=1200&q=80',
        alt: 'Floorplan Base',
      },
      hotspots: [
        {
          id: 'master',
          x: 25,
          y: 30,
          label: 'Master Suite',
          description: '2,000 sq ft with dual bathrooms and custom walk-in closets.',
        },
        {
          id: 'kitchen',
          x: 50,
          y: 50,
          label: "Chef's Kitchen",
          description: 'Professional grade appliances with dual islands and marble counters.',
        },
        {
          id: 'pool',
          x: 75,
          y: 70,
          label: 'Infinity Pool',
          description: '75ft zero-edge pool with panoramic city views.',
        },
      ],
    },
    {
      _type: 'service_selector',
      title: 'Global Neighborhoods',
      subtitle: 'Explore our prime real estate markets.',
      services: [
        {
          id: 'beverly-hills',
          label: 'Beverly Hills',
          headline: '90210: The Ultimate Address',
          description:
            "Home to the world's most prestigious estates, offering unparalleled privacy, security, and access to world-class dining and shopping.",
          media: {
            url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
            alt: 'Beverly Hills',
          },
          cta: { label: 'Explore Listings', url: '#' },
        },
        {
          id: 'aspen',
          label: 'Aspen',
          headline: 'Alpine Luxury Living',
          description:
            'A sanctuary for the elite, offering ski-in/ski-out access, majestic mountain views, and a vibrant cultural scene year-round.',
          media: {
            url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
            alt: 'Aspen',
          },
          cta: { label: 'Explore Listings', url: '#' },
        },
      ],
    },
    {
      _type: 'floating_dock',
      items: [
        { label: 'Inquire', icon: 'Phone', url: '#contact' },
        { label: 'Locations', icon: 'MapPin', url: '#neighborhoods' },
      ],
    },
  ],
}
