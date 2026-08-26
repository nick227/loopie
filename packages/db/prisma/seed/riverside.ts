import { db } from '../../src/client'
import type { Prisma } from '@prisma/client'

export async function seedRiversideDemo(businessId: string) {
  const jane = await db.contact.upsert({
    where: { id: 'demo-contact-jane' },
    update: {},
    create: {
      id: 'demo-contact-jane',
      businessId,
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '512-555-0192',
      source: 'website',
      tags: ['past-customer'],
    },
  })

  const past90DaysAudience = await db.audience.upsert({
    where: { id: 'demo-audience-past-customers' },
    update: {},
    create: {
      id: 'demo-audience-past-customers',
      businessId,
      name: 'Past customers',
      type: 'PREDEFINED',
    },
  })

  const followUpTemplate = await db.template.upsert({
    where: { id: 'demo-template-followup' },
    update: {},
    create: {
      id: 'demo-template-followup',
      businessId,
      name: 'Past Customer Follow-Up',
      channel: 'EMAIL',
      subject: 'Still need help with {{service}}?',
      body: 'Hi {{first_name}}, it has been a while — want to book another detail?',
      personalizationTokens: ['first_name', 'service'],
      suggestedAudienceId: past90DaysAudience.id,
    },
  })

  const message = await db.message.upsert({
    where: { id: 'demo-message-summer' },
    update: {},
    create: {
      id: 'demo-message-summer',
      businessId,
      channel: 'EMAIL',
      subject: followUpTemplate.subject,
      body: followUpTemplate.body,
      audienceId: past90DaysAudience.id,
      templateId: followUpTemplate.id,
      status: 'SENT',
      sentAt: new Date(),
    },
  })

  await db.interaction.upsert({
    where: { id: 'demo-interaction-sent' },
    update: {},
    create: {
      id: 'demo-interaction-sent',
      businessId,
      contactId: jane.id,
      type: 'EMAIL_SENT',
      sourceType: 'MESSAGE',
      sourceMessageId: message.id,
    },
  })

  await db.lead.upsert({
    where: { id: 'demo-lead-jane' },
    update: {},
    create: {
      id: 'demo-lead-jane',
      businessId,
      contactId: jane.id,
      stage: 'QUALIFIED',
      estimatedValue: 850,
      sourceType: 'MESSAGE',
      sourceMessageId: message.id,
      openSlot: 'OPEN',
    },
  })

  const image = await db.asset.upsert({
    where: { id: 'demo-asset-photo' },
    update: {},
    create: {
      id: 'demo-asset-photo',
      businessId,
      type: 'IMAGE',
      name: 'Before & After Detail',
      url: 'https://example.com/assets/before-after.jpg',
    },
  })

  const creative = await db.creative.upsert({
    where: { id: 'demo-creative-raw-stories' },
    update: {},
    create: {
      id: 'demo-creative-raw-stories',
      businessId,
      name: 'Raw Customer Stories',
      hostedUrl: 'https://ads.example.com/c/demo123',
      assets: { create: [{ assetId: image.id }] },
    },
  })

  const campaign = await db.campaign.upsert({
    where: { id: 'demo-campaign-raw-stories' },
    update: {},
    create: {
      id: 'demo-campaign-raw-stories',
      businessId,
      name: 'Raw Customer Stories',
      budget: 2500,
      startDate: new Date(),
      destinationUrl: 'https://riversideauto.example.com/offer',
      status: 'ACTIVE',
      platforms: ['META', 'GOOGLE'],
      creativeLinks: { create: [{ creativeId: creative.id }] },
    },
  })

  const landingPage = await seedCapture(businessId, campaign.id, creative.id)
  return { jane, campaign, landingPage }
}

async function seedCapture(businessId: string, campaignId: string, creativeId: string) {
  const leadGenTemplate = await db.landingPageTemplate.upsert({
    where: { id: 'system-template-lead-gen' },
    update: {},
    create: {
      id: 'system-template-lead-gen',
      isSystem: true,
      name: 'Simple Lead Gen',
      description:
        'Hero, feature grid, embedded form, footer — a single-purpose lead capture page.',
      category: 'lead-gen',
      formatVersion: '1.0',
      schema: {
        sections: [
          {
            key: 'hero',
            type: 'hero',
            order: 0,
            hideable: false,
            editable: ['headline', 'subheadline', 'ctaLabel', 'ctaLink'],
          },
          { key: 'features', type: 'feature-grid', order: 1, hideable: true, editable: ['items'] },
          { key: 'form', type: 'form-embed', order: 2, hideable: false, editable: [] },
          { key: 'footer', type: 'footer', order: 3, hideable: true, editable: ['text'] },
        ],
        themeTokens: ['primaryColor', 'backgroundColor', 'fontFamily'],
      },
    },
  })

  const bookingForm = await db.form.upsert({
    where: { id: 'demo-form-booking' },
    update: {},
    create: {
      id: 'demo-form-booking',
      businessId,
      name: 'Book a Detail',
      submitLabel: 'Get My Quote',
      successMessage: "Thanks — we'll text you within the hour.",
      fields: {
        create: [
          { label: 'Name', fieldKey: 'name', type: 'TEXT', required: true, order: 0 },
          { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 1 },
          { label: 'Phone', fieldKey: 'phone', type: 'PHONE', required: false, order: 2 },
        ],
      },
    },
  })

  const content: Prisma.InputJsonValue = {
    sections: {
      hero: {
        hidden: false,
        headline: 'Your Car, Detailed Right',
        subheadline: 'Riverside Auto Detailing — book in 60 seconds.',
        ctaLabel: 'Book Now',
        ctaLink: '#form',
      },
      features: {
        hidden: false,
        items: [
          { title: 'Mobile Service', body: 'We come to you.' },
          { title: 'Eco Products', body: 'Safe for your driveway.' },
        ],
      },
      form: { hidden: false },
      footer: { hidden: false, text: 'Riverside Auto Detailing · Austin, TX' },
    },
  }
  const theme: Prisma.InputJsonValue = {
    primaryColor: '#1d4ed8',
    backgroundColor: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
  }

  const landingPage = await db.landingPage.upsert({
    where: { id: 'demo-landing-page-raw-stories' },
    update: {},
    create: {
      id: 'demo-landing-page-raw-stories',
      businessId,
      templateId: leadGenTemplate.id,
      formId: bookingForm.id,
      name: 'Raw Customer Stories — Landing Page',
      slug: 'raw-customer-stories',
      status: 'PUBLISHED',
      content,
      theme,
    },
  })

  const publishedVersion = await db.publishedPageVersion.upsert({
    where: { landingPageId_version: { landingPageId: landingPage.id, version: 1 } },
    update: {},
    create: {
      landingPageId: landingPage.id,
      version: 1,
      content,
      theme,
      formId: bookingForm.id,
    },
  })
  await db.landingPage.update({
    where: { id: landingPage.id },
    data: { publishedVersionId: publishedVersion.id },
  })

  await db.deployment.upsert({
    where: { id: 'demo-deployment-meta' },
    update: {},
    create: {
      id: 'demo-deployment-meta',
      campaignId,
      creativeId,
      platform: 'META',
      status: 'ACTIVE',
      spend: 1240,
      impressions: 42100,
      clicks: 812,
      destinationLandingPageId: landingPage.id,
    },
  })

  await db.adUnit.upsert({
    where: { id: 'demo-ad-unit-native' },
    update: {},
    create: {
      id: 'demo-ad-unit-native',
      businessId,
      campaignId,
      creativeId,
      format: 'NATIVE',
      status: 'ACTIVE',
      destinationLandingPageId: landingPage.id,
      impressions: 3200,
      clicks: 140,
    },
  })

  return landingPage
}
