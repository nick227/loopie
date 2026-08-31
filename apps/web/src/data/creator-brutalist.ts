import { PageModel } from '../types/content'

export const creatorBrutalistData: PageModel = {
  title: 'MASTERCLASS. - Digital Leverage',
  slug: 'creator-brutalist',
  seo: {
    title: 'MASTERCLASS. | Stop trading time for money.',
    description:
      'A 6-week intensive bootcamp designed to rewire your brain, build audience, and accelerate your wealth.',
  },
  theme: {
    mode: 'light',
    fontFamily: 'sans',
  },
  navLinks: [
    { label: 'SYLLABUS', url: '#' },
    { label: 'PRICING', url: '#' },
    { label: 'FAQ', url: '#' },
  ],
  blocks: [
    {
      _type: 'hero',
      badges: ['THE DEFINITIVE GUIDE TO DIGITAL LEVERAGE'],
      headline: 'STOP TRADING\nTIME FOR MONEY.',
      subheadline:
        'A 6-WEEK INTENSIVE BOOTCAMP DESIGNED TO REWIRE YOUR BRAIN, BUILD AUDIENCE, AND ACCELERATE YOUR WEALTH. NO FLUFF. JUST RESULTS.',
      ctas: [{ label: 'GET ACCESS $997', url: '#', variant: 'primary', icon: 'ArrowRight' }],
      media: {
        url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
        alt: 'Creator',
      },
      variant: 'split',
    },
    {
      _type: 'feature_grid',
      title: 'WHO THIS IS FOR',
      features: [
        { title: 'CREATORS WANTING TO MONETIZE', description: '' },
        { title: 'FOUNDERS SEEKING LEVERAGE', description: '' },
        { title: 'FREELANCERS TIRED OF CLIENT WORK', description: '' },
        { title: 'ANYONE WILLING TO PUT IN THE WORK', description: '' },
      ],
      columns: 2,
    },
    {
      _type: 'text_media',
      headline: "HI, I'M JASON. I'VE BEEN THERE.",
      body: "5 YEARS AGO I WAS BROKE, BURNT OUT, AND WORKING 80 HOURS A WEEK FOR CLIENTS WHO HATED ME. I realized that if I didn't decouple my time from my income, I would be stuck forever. So I spent 3 years obsessively studying audience building, systems, and productization. Now, I generate 7-figures a year working 4 hours a day. I'm going to show you exactly how I did it.",
      media: {
        url: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=800&q=80',
        alt: 'Instructor',
      },
      layout: 'media-left',
    },
    {
      _type: 'image_browser',
      title: 'STUDENT WINS.',
      subtitle: 'REAL RESULTS FROM THE TRENCHES.',
      layout: 'masonry',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
          alt: 'Analytics Dashboard',
          caption: '100K IMPRESSIONS / MONTH',
        },
        {
          url: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=800&q=80',
          alt: 'Stripe Dashboard',
          caption: '$50K LAUNCH DAY',
        },
        {
          url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80',
          alt: 'Twitter Growth',
          caption: '+25K FOLLOWERS',
        },
      ],
    },
    {
      _type: 'video_chapter',
      title: 'SNEAK PEEK.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      chapters: [
        { title: 'THE MINDSET SHIFT', timestamp: '00:00' },
        { title: 'BUILDING YOUR LEVERAGE MACHINE', timestamp: '15:20' },
        { title: 'THE ART OF THE HOOK', timestamp: '28:45' },
        { title: 'MONETIZATION FRAMEWORKS', timestamp: '42:10' },
      ],
    },
    {
      _type: 'metrics',
      metrics: [
        { label: 'STUDENTS', value: '4,500+', description: 'AROUND THE GLOBE' },
        { label: 'AVERAGE ROI', value: '10X', description: 'IN FIRST 90 DAYS' },
        { label: 'SATISFACTION', value: '99%', description: 'OR YOUR MONEY BACK' },
      ],
    },
    {
      _type: 'floating_dock',
      items: [
        { label: 'ENROLL $997', icon: 'Check', url: '#checkout' },
        { label: 'SYLLABUS', icon: 'Star', url: '#syllabus' },
      ],
    },
    {
      _type: 'testimonials',
      title: 'THE PROOF.',
      testimonials: [
        {
          quote:
            'Just hit my first $10k month. This course completely rewired how I approach content. No more client work for me.',
          author: '@sarahcreates',
          metrics: '$10K/MO',
        },
        {
          quote:
            "The systems in Week 3 alone saved me 20 hours a week. I'm literally working less and making double. Best ROI ever.",
          author: '@dev_mike',
          metrics: '+20 HRS',
        },
        {
          quote:
            "I was skeptical, but Jason's framework is bulletproof. Built my audience from 0 to 15k in 3 months. Let's go.",
          author: '@designbyjen',
          metrics: '15K SUBS',
        },
        {
          quote:
            'Quit my 9-5 yesterday. The Endgame module gave me the exact blueprint to scale my agency. Worth 10x the price.',
          author: '@marketing_tom',
          metrics: 'FULL-TIME',
        },
      ],
    },
    {
      _type: 'faq',
      title: 'NO MORE EXCUSES.',
      questions: [
        {
          question: 'HOW MUCH TIME DO I NEED EACH WEEK?',
          answer:
            "Expect to spend 4-6 hours per week on video lessons and execution. If you don't have that time, don't buy this.",
        },
        {
          question: 'IS THIS FOR BEGINNERS?',
          answer: "Yes, but it's intense. You need to be comfortable feeling uncomfortable.",
        },
        {
          question: 'DO I GET LIFETIME ACCESS?',
          answer: 'Yes. Buy once, get access to all future updates for free forever.',
        },
      ],
    },
  ],
}
