import { PageModel } from '../types/content'

export const agencyOrganicData: PageModel = {
  title: 'OAK & AURA - Digital Agency',
  slug: 'agency-organic',
  seo: {
    title: 'OAK & AURA | Shaping digital legacies',
    description:
      'We are an independent design studio partnering with visionary founders to build timeless brand identities.',
  },
  theme: {
    mode: 'light',
    fontFamily: 'serif',
  },
  navLinks: [
    { label: 'Work', url: '#work' },
    { label: 'Services', url: '#services' },
    { label: 'Studio', url: '#studio' },
    { label: 'Contact', url: '#contact' },
  ],
  blocks: [
    {
      _type: 'hero',
      headline: 'Shaping digital legacies with quiet confidence.',
      subheadline:
        'We are an independent design studio partnering with visionary founders to build timeless brand identities, editorial web design, and profound user experiences that endure.',
      interactionType: 'before-after',
      ctas: [{ label: 'Explore our work', url: '#work', variant: 'primary', icon: 'ArrowUpRight' }],
      media: {
        url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80',
        alt: 'Final Brand Design',
      },
      variant: 'centered',
    },
    {
      _type: 'before_after',
      title: 'Transformation through design',
      beforeImage: {
        url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        alt: 'Original Identity',
      },
      afterImage: {
        url: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=1200&q=80',
        alt: 'Redesigned Identity',
      },
      beforeLabel: 'Before',
      afterLabel: 'After',
    },
    {
      _type: 'text_media',
      headline: '"Good design is obvious. Great design is transparent."',
      body: "Our philosophy is simple: we remove the superfluous. In a world saturated with noise, we craft digital spaces that breathe. By honoring white space, typography, and purposeful motion, we allow your brand's true narrative to surface without obstruction.",
      media: {
        url: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=2000&q=80',
        alt: 'Studio Workspace',
      },
      layout: 'media-right',
    },
    {
      _type: 'image_browser',
      title: 'Selected Works',
      subtitle: 'A curated selection of our recent projects.',
      layout: 'masonry',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
          alt: 'KINFOLK',
          caption: 'KINFOLK — Editorial Design',
        },
        {
          url: 'https://images.unsplash.com/photo-1541888055627-94d010c710db?auto=format&fit=crop&w=800&q=80',
          alt: 'AESOP',
          caption: 'AESOP — Brand Identity',
        },
        {
          url: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&w=800&q=80',
          alt: 'CEREAL',
          caption: 'CEREAL — Art Direction',
        },
        {
          url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
          alt: 'FRAMA',
          caption: 'FRAMA — Digital Experience',
        },
        {
          url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
          alt: 'VOGUE',
          caption: 'VOGUE — Typography',
        },
      ],
    },
    {
      _type: 'testimonials',
      title: 'What our clients say',
      layout: 'slider',
      testimonials: [
        {
          quote:
            'OAK & AURA fundamentally transformed how our brand is perceived. Their attention to detail is unmatched.',
          author: 'Sarah Jenkins',
          role: 'Founder, KINFOLK',
        },
        {
          quote:
            'Working with this studio felt less like an agency engagement and more like finding a true creative partner.',
          author: 'Marcus Sterling',
          role: 'CEO, AESOP',
        },
        {
          quote:
            'They understand the delicate balance between aesthetic beauty and functional commerce.',
          author: 'Elena Rodriguez',
          role: 'Creative Director, FRAMA',
        },
      ],
    },
    {
      _type: 'case_study_browser',
      title: 'Selected Case Studies',
      caseStudies: [
        {
          id: 'frama',
          client: 'FRAMA',
          headline: 'Digital flagship for a multi-disciplinary design brand',
          results: [
            { label: 'Conversion Rate', value: '+142%' },
            { label: 'Time on site', value: '+3m 45s' },
          ],
          media: {
            url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
            alt: 'FRAMA Studio',
          },
        },
        {
          id: 'kinfolk',
          client: 'KINFOLK',
          headline: 'Reimagining editorial commerce for the modern era',
          results: [
            { label: 'Global reach', value: '45 countries' },
            { label: 'Subscriptions', value: '+85%' },
          ],
          media: {
            url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
            alt: 'KINFOLK Magazine',
          },
        },
        {
          id: 'aesop',
          client: 'AESOP',
          headline: 'A tactile digital experience for skincare',
          results: [
            { label: 'Bounce rate', value: '-24%' },
            { label: 'Revenue', value: '+68%' },
          ],
          media: {
            url: 'https://images.unsplash.com/photo-1541888055627-94d010c710db?auto=format&fit=crop&w=1200&q=80',
            alt: 'AESOP Store',
          },
        },
      ],
    },
    {
      _type: 'marquee',
      direction: 'left',
      speed: 'slow',
      items: [
        { text: 'Awwwards Site of the Month' },
        { text: 'FWA of the Day' },
        { text: 'Webby Nominee' },
        { text: 'CSS Design Awards' },
      ],
    },
    {
      _type: 'feature_grid',
      title: 'The Partners',
      subtitle:
        'Led by industry veterans, our studio brings together decades of collective experience in design and strategy.',
      features: [
        { title: 'Julian Vance', description: 'Creative Director' },
        { title: 'Maya Sterling', description: 'Strategy Director' },
        { title: 'Elias Thorne', description: 'Technical Director' },
      ],
      columns: 3,
    },
    {
      _type: 'feature_grid',
      title: 'Our methodology is rooted in substance.',
      subtitle:
        'We believe in stripping away the unnecessary to reveal the core essence of your brand.',
      features: [
        {
          title: 'Brand Strategy',
          description: 'Defining your unique voice, position, and narrative.',
          icon: 'Coffee',
        },
        {
          title: 'Visual Identity',
          description: 'Creating timeless, adaptable, and robust design systems.',
          icon: 'Layers',
        },
        {
          title: 'Web Development',
          description: 'Building performant, accessible digital platforms.',
          icon: 'Code',
        },
        {
          title: 'Digital Marketing',
          description: 'Growing your audience organically and sustainably.',
          icon: 'ArrowUpRight',
        },
      ],
      columns: 2,
    },
  ],
}
