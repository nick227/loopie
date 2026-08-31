import { PageModel } from '../types/content'

export const eventPastelData: PageModel = {
  title: 'BloomSummit. - Virtual Event',
  slug: 'event-pastel',
  seo: {
    title: 'BloomSummit. | Design differently.',
    description:
      'Join 5,000+ creatives for two days of inspiring keynotes, hands-on workshops, and community building.',
  },
  theme: {
    mode: 'light',
    fontFamily: 'sans',
  },
  navLinks: [
    { label: 'Schedule', url: '#' },
    { label: 'Speakers', url: '#' },
    { label: 'Tickets', url: '#' },
    { label: 'FAQ', url: '#' },
  ],
  blocks: [
    {
      _type: 'hero',
      badges: ['Live Virtual Event • Oct 24-25, 2026'],
      headline: 'Design\ndifferently.',
      subheadline:
        'Join 5,000+ creatives for two days of inspiring keynotes, hands-on workshops, and community building.',
      ctas: [{ label: 'Claim your free ticket', url: '#', variant: 'primary', icon: 'ArrowRight' }],
      variant: 'split',
    },
    {
      _type: 'feature_grid',
      features: [
        { title: 'October 24-25, 2026', description: '', icon: 'Calendar' },
        { title: '9:00 AM - 5:00 PM EST', description: '', icon: 'Clock' },
        { title: 'Virtual & Interactive', description: '', icon: 'Users' },
      ],
    },
    {
      _type: 'feature_grid',
      title: 'Learn from the best.',
      subtitle: 'Industry leaders sharing their exact frameworks.',
      features: [
        { title: 'Sarah Chen', description: 'VP Design @ Figma' },
        { title: 'Marcus Johnson', description: 'Founder @ StudioX' },
        { title: 'Elena Rodriguez', description: 'Creative Director' },
        { title: 'David Kim', description: 'Product Designer' },
      ],
      columns: 4,
    },
    {
      _type: 'feature_grid',
      title: "What you'll learn.",
      subtitle: 'Two days packed with actionable insights.',
      features: [
        { title: 'The Future of Spatial Interfaces', description: 'Keynote (9:00 AM)' },
        { title: 'Building Accessible Design Systems', description: 'Workshop (11:30 AM)' },
        { title: 'AI-Assisted Prototyping', description: 'Masterclass (2:00 PM)' },
        { title: 'The Business of Freelance Design', description: 'Panel (4:00 PM)' },
      ],
    },
    {
      _type: 'text_media',
      headline: 'More than just video streams.',
      body: 'Join our exclusive Slack community the moment you register. Participate in 1-on-1 networking roulette, ask questions during live AMAs, and find your next co-founder or client.',
      media: {
        url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
        alt: 'Community',
      },
      layout: 'media-right',
    },
    {
      _type: 'service_selector',
      title: 'Choose your pass.',
      subtitle: 'Select the tier that fits your needs.',
      services: [
        {
          id: 'ga',
          label: 'General Admission',
          headline: 'General Admission',
          description:
            'Access to all main stage keynotes and panel discussions. Includes entry to the public Slack community.',
          price: 'Free',
        },
        {
          id: 'vip',
          label: 'VIP Pass',
          headline: 'VIP Pass',
          description:
            'Everything in GA, plus access to all hands-on workshops, masterclasses, and post-event recordings.',
          price: '$149',
        },
        {
          id: 'backstage',
          label: 'Backstage Pass',
          headline: 'Backstage Pass',
          description:
            'The ultimate experience. Intimate Q&A sessions with speakers, VIP Slack channel, and personalized portfolio reviews.',
          price: '$499',
        },
      ],
    },
    {
      _type: 'hotspot_viewer',
      title: 'The Venue Map',
      image: {
        url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
        alt: 'Festival Map',
      },
      hotspots: [
        {
          id: '1',
          x: 25,
          y: 30,
          label: 'Main Stage',
          description: 'Where the biggest keynotes happen.',
        },
        {
          id: '2',
          x: 75,
          y: 40,
          label: 'Workshop Tents',
          description: 'Hands-on sessions and masterclasses.',
        },
        { id: '3', x: 50, y: 70, label: 'Food Trucks', description: 'Fuel up for the day.' },
      ],
    },
    {
      _type: 'booking_picker',
      title: 'Book Your Spot',
      subtitle: 'Select a date and time to attend.',
    },
    {
      _type: 'form',
      title: "Don't miss the biggest design event of the year.",
      formType: 'registration',
      buttonLabel: 'Register Free',
      successMessage: "You're registered! Check your inbox for the calendar invite.",
    },
  ],
}
