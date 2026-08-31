import { PageModel } from '../types/content'

export const healthcareTelehealthData: PageModel = {
  title: 'CareSync - Telehealth Platform',
  slug: 'healthcare-telehealth',
  seo: {
    title: 'CareSync | Virtual Healthcare You Can Trust',
    description:
      'Connect with board-certified doctors in minutes. 24/7 access to quality healthcare from the comfort of your home.',
  },
  theme: {
    mode: 'light',
    fontFamily: 'sans',
  },
  navLinks: [
    { label: 'How it Works', url: '#how-it-works' },
    { label: 'Providers', url: '#providers' },
    { label: 'Services', url: '#services' },
    { label: 'Pricing', url: '#pricing' },
  ],
  blocks: [
    {
      _type: 'hero',
      headline: 'Quality healthcare,\nanytime, anywhere.',
      subheadline:
        'Connect with board-certified physicians and specialists in minutes from your phone or computer. No waiting rooms, no hassle.',
      interactionType: 'inline-form',
      ctas: [
        { label: 'Check Availability', url: '#booking', variant: 'primary', icon: 'ArrowRight' },
      ],
      media: {
        url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
        alt: 'Doctor on video call with patient',
      },
      badges: ['HIPAA Compliant', '24/7 Support'],
      proof: {
        rating: 4.9,
        text: 'from 10,000+ patient reviews',
      },
    },
    {
      _type: 'feature_grid',
      title: 'Care designed for you',
      subtitle: 'Experience healthcare that prioritizes your comfort, time, and well-being.',
      features: [
        {
          title: 'Board-Certified Doctors',
          description:
            'Our network includes top-tier physicians across 50+ specialties, ready to help you.',
          icon: 'ShieldCheck',
        },
        {
          title: 'Instant Prescriptions',
          description:
            'Get prescriptions sent directly to your local pharmacy immediately after your visit.',
          icon: 'Pill',
        },
        {
          title: 'Secure & Private',
          description:
            'Your data is encrypted and protected with industry-leading HIPAA-compliant security.',
          icon: 'Lock',
        },
      ],
    },
    {
      _type: 'text_media',
      headline: 'A better way to get better',
      body: "We believe that everyone deserves access to high-quality healthcare. That's why we built a platform that removes the barriers of traditional medicine—no long commutes, no crowded waiting rooms, and no rushed appointments.",
      media: {
        url: 'https://images.unsplash.com/photo-1551076805-e18690c5e561?auto=format&fit=crop&w=1200&q=80',
        alt: 'Patient using telehealth app',
      },
      layout: 'media-left',
    },
    {
      _type: 'service_selector',
      title: 'What we treat',
      subtitle: 'Comprehensive care for your body and mind.',
      services: [
        {
          id: 'urgent',
          label: 'Urgent Care',
          icon: 'Activity',
          headline: 'Immediate care for non-emergencies.',
          description:
            'Cold & flu, allergies, pink eye, sinus infections, and more. Get diagnosed and prescribed medication within minutes.',
          media: {
            url: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=800&q=80',
            alt: 'Doctor with stethoscope',
          },
          cta: { label: 'Book Urgent Care', url: '#', icon: 'ArrowRight' },
        },
        {
          id: 'mental',
          label: 'Mental Health',
          icon: 'Heart',
          headline: 'Support when you need it most.',
          description:
            'Confidential therapy and psychiatry for anxiety, depression, stress, and more from licensed professionals.',
          media: {
            url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80',
            alt: 'Therapist session',
          },
          cta: { label: 'Find a Therapist', url: '#', icon: 'ArrowRight' },
        },
        {
          id: 'primary',
          label: 'Primary Care',
          icon: 'Clipboard',
          headline: 'Your long-term health partner.',
          description:
            'Routine checkups, lab requests, chronic condition management, and preventative care with a dedicated physician.',
          media: {
            url: 'https://images.unsplash.com/photo-1638202993928-7267aad84c31?auto=format&fit=crop&w=800&q=80',
            alt: 'Patient consulting doctor',
          },
          cta: { label: 'Choose a Provider', url: '#', icon: 'ArrowRight' },
        },
      ],
    },
    {
      _type: 'faq',
      title: 'Common Questions',
      questions: [
        {
          question: 'Do you accept my insurance?',
          answer:
            'We accept most major insurance plans including Aetna, Cigna, Blue Cross Blue Shield, and UnitedHealthcare. You can verify your coverage during sign-up.',
        },
        {
          question: 'How much does a visit cost without insurance?',
          answer:
            'Without insurance, a standard urgent care visit is $79. Mental health and primary care visits vary by provider and session length.',
        },
        {
          question: 'Can doctors prescribe medication?',
          answer:
            'Yes. Our board-certified doctors can prescribe most medications, which are electronically sent to your local pharmacy. We do not prescribe controlled substances.',
        },
        {
          question: 'Is my medical information secure?',
          answer:
            'Absolutely. CareSync is 100% HIPAA compliant. We use bank-level encryption to ensure your personal health information is strictly confidential.',
        },
      ],
    },
    {
      _type: 'testimonials',
      title: 'Patient Stories',
      testimonials: [
        {
          quote:
            'I woke up feeling terrible and was able to see a doctor within 10 minutes on CareSync. My prescription was ready at my local pharmacy an hour later. Truly a lifesaver!',
          author: 'Sarah M.',
          role: 'Verified Patient',
          metrics: '5/5 Stars',
        },
      ],
    },
    {
      _type: 'before_after',
      title: 'The Telehealth Difference',
      beforeImage: {
        url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80',
        alt: 'Crowded waiting room',
      },
      afterImage: {
        url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
        alt: 'Relaxed at home consultation',
      },
      beforeLabel: 'Traditional Waiting Room',
      afterLabel: 'CareSync Experience',
    },
    {
      _type: 'timeline',
      title: 'How it works',
      steps: [
        {
          title: 'Create Account',
          description: 'Sign up in seconds and fill out a brief medical history form.',
        },
        {
          title: 'Choose Provider',
          description: 'Select an available doctor or therapist that fits your needs.',
        },
        {
          title: 'Virtual Visit',
          description: 'Connect via secure high-definition video directly from your device.',
        },
        {
          title: 'Get Treatment',
          description:
            'Receive your diagnosis, treatment plan, and any necessary prescriptions instantly.',
        },
      ],
    },
    {
      _type: 'booking_picker',
      title: 'Book an Appointment',
      subtitle: 'Select a time that works for you. Availability is updated in real-time.',
      options: [
        { label: '09:00 AM', value: '09:00' },
        { label: '09:30 AM', value: '09:30' },
        { label: '10:00 AM', value: '10:00' },
        { label: '10:30 AM', value: '10:30' },
        { label: '11:00 AM', value: '11:00' },
        { label: '11:30 AM', value: '11:30' },
        { label: '01:00 PM', value: '13:00' },
        { label: '01:30 PM', value: '13:30' },
        { label: '02:00 PM', value: '14:00' },
        { label: '02:30 PM', value: '14:30' },
        { label: '03:00 PM', value: '15:00' },
        { label: '03:30 PM', value: '15:30' },
      ],
    },
    {
      _type: 'form',
      title: 'Start your visit',
      formType: 'contact',
      buttonLabel: 'Create Account',
      successMessage: 'Welcome to CareSync! We are setting up your portal.',
    },
  ],
}
