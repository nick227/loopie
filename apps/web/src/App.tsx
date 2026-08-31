import { lazy, Suspense, useEffect } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CreativeToAd, CreativeEditToAd } from '@/pages/ads/CreativeRedirects'
const RegisterPage = lazy(() =>
  import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const ContactsPage = lazy(() =>
  import('@/pages/contacts/ContactsPage').then((m) => ({ default: m.ContactsPage })),
)
const CreateContactPage = lazy(() =>
  import('@/pages/contacts/CreateContactPage').then((m) => ({ default: m.CreateContactPage })),
)
const ContactPage = lazy(() =>
  import('@/pages/contacts/ContactPage').then((m) => ({ default: m.ContactPage })),
)
const UpdateContactPage = lazy(() =>
  import('@/pages/contacts/UpdateContactPage').then((m) => ({ default: m.UpdateContactPage })),
)
const ContactInteractionsPage = lazy(() =>
  import('@/pages/contacts/ContactInteractionsPage').then((m) => ({
    default: m.ContactInteractionsPage,
  })),
)
const ContactMatchesPage = lazy(() =>
  import('@/pages/crm/ContactMatchesPage').then((m) => ({ default: m.ContactMatchesPage })),
)
const IntegrationsPage = lazy(() =>
  import('@/pages/crm/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage })),
)
const AudiencesPage = lazy(() =>
  import('@/pages/audiences/AudiencesPage').then((m) => ({ default: m.AudiencesPage })),
)
const CreateAudiencePage = lazy(() =>
  import('@/pages/audiences/CreateAudiencePage').then((m) => ({ default: m.CreateAudiencePage })),
)
const AudiencePage = lazy(() =>
  import('@/pages/audiences/AudiencePage').then((m) => ({ default: m.AudiencePage })),
)
const UpdateAudiencePage = lazy(() =>
  import('@/pages/audiences/UpdateAudiencePage').then((m) => ({ default: m.UpdateAudiencePage })),
)
const AudienceContactsPage = lazy(() =>
  import('@/pages/audiences/AudienceContactsPage').then((m) => ({
    default: m.AudienceContactsPage,
  })),
)
const MediaPage = lazy(() =>
  import('@/pages/media/MediaPage').then((m) => ({ default: m.MediaPage })),
)
const MediaItemPage = lazy(() =>
  import('@/pages/media/MediaItemPage').then((m) => ({ default: m.MediaItemPage })),
)
const AssetToMedia = lazy(() =>
  import('@/pages/media/MediaRedirects').then((m) => ({ default: m.AssetToMedia })),
)
const TemplatesPage = lazy(() =>
  import('@/pages/templates/TemplatesPage').then((m) => ({ default: m.TemplatesPage })),
)
const CreateTemplatePage = lazy(() =>
  import('@/pages/templates/CreateTemplatePage').then((m) => ({ default: m.CreateTemplatePage })),
)
const TemplatePage = lazy(() =>
  import('@/pages/templates/TemplatePage').then((m) => ({ default: m.TemplatePage })),
)
const UpdateTemplatePage = lazy(() =>
  import('@/pages/templates/UpdateTemplatePage').then((m) => ({ default: m.UpdateTemplatePage })),
)
const AdsPage = lazy(() => import('@/pages/ads/AdsPage').then((m) => ({ default: m.AdsPage })))
const CreateAdPage = lazy(() =>
  import('@/pages/ads/CreateAdPage').then((m) => ({ default: m.CreateAdPage })),
)
const AdPage = lazy(() => import('@/pages/ads/AdPage').then((m) => ({ default: m.AdPage })))
const UpdateAdPage = lazy(() =>
  import('@/pages/ads/UpdateAdPage').then((m) => ({ default: m.UpdateAdPage })),
)
const InboxThreadPage = lazy(() =>
  import('@/pages/inbox/InboxThreadPage').then((m) => ({ default: m.InboxThreadPage })),
)
const MessagesPage = lazy(() =>
  import('@/pages/messages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
)
const CreateMessagePage = lazy(() =>
  import('@/pages/messages/CreateMessagePage').then((m) => ({ default: m.CreateMessagePage })),
)
const MessagePage = lazy(() =>
  import('@/pages/messages/MessagePage').then((m) => ({ default: m.MessagePage })),
)
const UpdateMessagePage = lazy(() =>
  import('@/pages/messages/UpdateMessagePage').then((m) => ({ default: m.UpdateMessagePage })),
)
const SendMessagePage = lazy(() =>
  import('@/pages/messages/SendMessagePage').then((m) => ({ default: m.SendMessagePage })),
)
const TestSendMessagePage = lazy(() =>
  import('@/pages/messages/TestSendMessagePage').then((m) => ({ default: m.TestSendMessagePage })),
)
const MessagePerformancePage = lazy(() =>
  import('@/pages/messages/MessagePerformancePage').then((m) => ({
    default: m.MessagePerformancePage,
  })),
)
const AutomationsPage = lazy(() =>
  import('@/pages/automations/AutomationsPage').then((m) => ({ default: m.AutomationsPage })),
)
const CreateAutomationPage = lazy(() =>
  import('@/pages/automations/CreateAutomationPage').then((m) => ({
    default: m.CreateAutomationPage,
  })),
)
const AutomationPage = lazy(() =>
  import('@/pages/automations/AutomationPage').then((m) => ({ default: m.AutomationPage })),
)
const UpdateAutomationPage = lazy(() =>
  import('@/pages/automations/UpdateAutomationPage').then((m) => ({
    default: m.UpdateAutomationPage,
  })),
)
const PauseAutomationPage = lazy(() =>
  import('@/pages/automations/PauseAutomationPage').then((m) => ({
    default: m.PauseAutomationPage,
  })),
)
const ResumeAutomationPage = lazy(() =>
  import('@/pages/automations/ResumeAutomationPage').then((m) => ({
    default: m.ResumeAutomationPage,
  })),
)
const AutomationLogsPage = lazy(() =>
  import('@/pages/automations/AutomationLogsPage').then((m) => ({ default: m.AutomationLogsPage })),
)
const CampaignsPage = lazy(() =>
  import('@/pages/campaigns/CampaignsPage').then((m) => ({ default: m.CampaignsPage })),
)
const CreateCampaignPage = lazy(() =>
  import('@/pages/campaigns/CreateCampaignPage').then((m) => ({ default: m.CreateCampaignPage })),
)
const CampaignPage = lazy(() =>
  import('@/pages/campaigns/CampaignPage').then((m) => ({ default: m.CampaignPage })),
)
const UpdateCampaignPage = lazy(() =>
  import('@/pages/campaigns/UpdateCampaignPage').then((m) => ({ default: m.UpdateCampaignPage })),
)
const PauseCampaignPage = lazy(() =>
  import('@/pages/campaigns/PauseCampaignPage').then((m) => ({ default: m.PauseCampaignPage })),
)
const ResumeCampaignPage = lazy(() =>
  import('@/pages/campaigns/ResumeCampaignPage').then((m) => ({ default: m.ResumeCampaignPage })),
)
const EndCampaignPage = lazy(() =>
  import('@/pages/campaigns/EndCampaignPage').then((m) => ({ default: m.EndCampaignPage })),
)
const DuplicateCampaignPage = lazy(() =>
  import('@/pages/campaigns/DuplicateCampaignPage').then((m) => ({
    default: m.DuplicateCampaignPage,
  })),
)
const CampaignPerformancePage = lazy(() =>
  import('@/pages/campaigns/CampaignPerformancePage').then((m) => ({
    default: m.CampaignPerformancePage,
  })),
)
const CampaignBudgetPage = lazy(() =>
  import('@/pages/campaigns/CampaignBudgetPage').then((m) => ({ default: m.CampaignBudgetPage })),
)
const CampaignCreativesPage = lazy(() =>
  import('@/pages/campaigns/CampaignCreativesPage').then((m) => ({
    default: m.CampaignCreativesPage,
  })),
)
const CampaignCreateCreativePage = lazy(() =>
  import('@/pages/campaigns/CampaignCreateCreativePage').then((m) => ({
    default: m.CampaignCreateCreativePage,
  })),
)
const CampaignAdUnitsPage = lazy(() =>
  import('@/pages/campaigns/CampaignAdUnitsPage').then((m) => ({ default: m.CampaignAdUnitsPage })),
)
const CampaignCreateAdUnitPage = lazy(() =>
  import('@/pages/campaigns/CampaignCreateAdUnitPage').then((m) => ({
    default: m.CampaignCreateAdUnitPage,
  })),
)
const CampaignLeadsPage = lazy(() =>
  import('@/pages/campaigns/CampaignLeadsPage').then((m) => ({ default: m.CampaignLeadsPage })),
)
const DeploymentsPage = lazy(() =>
  import('@/pages/deployments/DeploymentsPage').then((m) => ({ default: m.DeploymentsPage })),
)
const CreateDeploymentPage = lazy(() =>
  import('@/pages/deployments/CreateDeploymentPage').then((m) => ({
    default: m.CreateDeploymentPage,
  })),
)
const UpdateDeploymentPage = lazy(() =>
  import('@/pages/deployments/UpdateDeploymentPage').then((m) => ({
    default: m.UpdateDeploymentPage,
  })),
)
const LandingPageTemplatesPage = lazy(() =>
  import('@/pages/landing-pages/LandingPageTemplatesPage').then((m) => ({
    default: m.LandingPageTemplatesPage,
  })),
)
const LandingPageTemplatePage = lazy(() =>
  import('@/pages/landing-pages/LandingPageTemplatePage').then((m) => ({
    default: m.LandingPageTemplatePage,
  })),
)
const LandingPagesPage = lazy(() =>
  import('@/pages/landing-pages/LandingPagesPage').then((m) => ({ default: m.LandingPagesPage })),
)
const LandingPage = lazy(() =>
  import('@/pages/landing-pages/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const UpdateLandingPage = lazy(() =>
  import('@/pages/landing-pages/UpdateLandingPage').then((m) => ({ default: m.UpdateLandingPage })),
)
const PublishLandingPage = lazy(() =>
  import('@/pages/landing-pages/PublishLandingPage').then((m) => ({
    default: m.PublishLandingPage,
  })),
)
const LandingPageVersionsPage = lazy(() =>
  import('@/pages/landing-pages/LandingPageVersionsPage').then((m) => ({
    default: m.LandingPageVersionsPage,
  })),
)
const ExportLandingPage = lazy(() =>
  import('@/pages/landing-pages/ExportLandingPage').then((m) => ({ default: m.ExportLandingPage })),
)
const LandingPagePerformancePage = lazy(() =>
  import('@/pages/landing-pages/LandingPagePerformancePage').then((m) => ({
    default: m.LandingPagePerformancePage,
  })),
)
const FormsPage = lazy(() =>
  import('@/pages/forms/FormsPage').then((m) => ({ default: m.FormsPage })),
)
const CreateFormPage = lazy(() =>
  import('@/pages/forms/CreateFormPage').then((m) => ({ default: m.CreateFormPage })),
)
const FormPage = lazy(() => import('@/pages/forms/FormPage').then((m) => ({ default: m.FormPage })))
const UpdateFormPage = lazy(() =>
  import('@/pages/forms/UpdateFormPage').then((m) => ({ default: m.UpdateFormPage })),
)
const AdUnitsPage = lazy(() =>
  import('@/pages/ad-units/AdUnitsPage').then((m) => ({ default: m.AdUnitsPage })),
)
const CreateAdUnitPage = lazy(() =>
  import('@/pages/ad-units/CreateAdUnitPage').then((m) => ({ default: m.CreateAdUnitPage })),
)
const AdUnitPage = lazy(() =>
  import('@/pages/ad-units/AdUnitPage').then((m) => ({ default: m.AdUnitPage })),
)
const UpdateAdUnitPage = lazy(() =>
  import('@/pages/ad-units/UpdateAdUnitPage').then((m) => ({ default: m.UpdateAdUnitPage })),
)
const LeadsPage = lazy(() =>
  import('@/pages/leads/LeadsPage').then((m) => ({ default: m.LeadsPage })),
)
const LeadPage = lazy(() => import('@/pages/leads/LeadPage').then((m) => ({ default: m.LeadPage })))
const UpdateLeadPage = lazy(() =>
  import('@/pages/leads/UpdateLeadPage').then((m) => ({ default: m.UpdateLeadPage })),
)
const SalesPage = lazy(() =>
  import('@/pages/sales/SalesPage').then((m) => ({ default: m.SalesPage })),
)
const CreateSalePage = lazy(() =>
  import('@/pages/sales/CreateSalePage').then((m) => ({ default: m.CreateSalePage })),
)
const SalePage = lazy(() => import('@/pages/sales/SalePage').then((m) => ({ default: m.SalePage })))
const ResultsSummaryPage = lazy(() =>
  import('@/pages/core/ResultsSummaryPage').then((m) => ({ default: m.ResultsSummaryPage })),
)
const BillingPage = lazy(() =>
  import('@/pages/core/BillingPage').then((m) => ({ default: m.BillingPage })),
)
const ProfilePage = lazy(() =>
  import('@/pages/core/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const BusinessSetupPage = lazy(() =>
  import('@/pages/core/BusinessSetupPage').then((m) => ({ default: m.BusinessSetupPage })),
)
import { AuthGuard } from '@/lib/AuthGuard'
import { ActivityPage } from './pages/activity/ActivityPage'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { RequireRole, RequireNonAffiliate, InboxRoute } from '@/lib/RequireRole'
import { SaaSCleanCrispPreview } from '@/pages/landing-pages/SaaSCleanCrispPreview'
import { AppWaitlistNeonPreview } from '@/pages/landing-pages/AppWaitlistNeonPreview'
import { EcommerceGradientPreview } from '@/pages/landing-pages/EcommerceGradientPreview'
import { AgencyOrganicPreview } from '@/pages/landing-pages/AgencyOrganicPreview'
import { CreatorBrutalistPreview } from '@/pages/landing-pages/CreatorBrutalistPreview'
import { EventPastelPreview } from '@/pages/landing-pages/EventPastelPreview'
import { DevToolCyberpunkPreview } from '@/pages/landing-pages/DevToolCyberpunkPreview'
import { RealEstateLuxuryPreview } from '@/pages/landing-pages/RealEstateLuxuryPreview'
import { HealthcareTelehealthPreview } from '@/pages/landing-pages/HealthcareTelehealthPreview'
import { Web3CryptoPreview } from '@/pages/landing-pages/Web3CryptoPreview'
import { Shell } from '@/components/layout/Shell'
const PlatformsPage = lazy(() =>
  import('@/pages/platforms/PlatformsPage').then((m) => ({ default: m.PlatformsPage })),
)
const AffiliatesPage = lazy(() =>
  import('@/pages/affiliates/AffiliatesPage').then((m) => ({ default: m.AffiliatesPage })),
)
const CreateAffiliatePage = lazy(() =>
  import('@/pages/affiliates/CreateAffiliatePage').then((m) => ({
    default: m.CreateAffiliatePage,
  })),
)
const AffiliateDetailPage = lazy(() =>
  import('@/pages/affiliates/AffiliateDetailPage').then((m) => ({
    default: m.AffiliateDetailPage,
  })),
)
const AffiliateClassesPage = lazy(() =>
  import('@/pages/affiliates/AffiliateClassesPage').then((m) => ({
    default: m.AffiliateClassesPage,
  })),
)
const AffiliatePayoutsPage = lazy(() =>
  import('@/pages/affiliates/AffiliatePayoutsPage').then((m) => ({
    default: m.AffiliatePayoutsPage,
  })),
)
const AffiliatePortalHomePage = lazy(() =>
  import('@/pages/affiliates/AffiliatePortalHomePage').then((m) => ({
    default: m.AffiliatePortalHomePage,
  })),
)
const AffiliatePortalTeamPage = lazy(() =>
  import('@/pages/affiliates/AffiliatePortalTeamPage').then((m) => ({
    default: m.AffiliatePortalTeamPage,
  })),
)
const AffiliatePortalPayoutsPage = lazy(() =>
  import('@/pages/affiliates/AffiliatePortalPayoutsPage').then((m) => ({
    default: m.AffiliatePortalPayoutsPage,
  })),
)

function ResettableErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
}

// Plain BrowserRouter/Routes (not a data router) does no scroll management on its own — a normal
// SPA navigation otherwise leaves window.scrollY wherever it was. Every route starts at the top
// except /home, which restores its own saved position instead (see InboxSummaryPage's
// useRestoreHomeScroll / docs/strategy/03-product-principles.md's state-continuity requirement)
// — this runs first on remount, then Home's own effect repositions it, so the two never fight.
function ScrollToTop() {
  const location = useLocation()
  useEffect(() => {
    if (location.pathname !== '/home') window.scrollTo(0, 0)
  }, [location.pathname])
  return null
}

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ResettableErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <Routes>
            {/* Public / auth routes */}
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/preview/saas-clean-crisp" element={<SaaSCleanCrispPreview />} />
            <Route path="/preview/app-waitlist-neon" element={<AppWaitlistNeonPreview />} />
            <Route path="/preview/ecommerce-gradient" element={<EcommerceGradientPreview />} />
            <Route path="/preview/agency-organic" element={<AgencyOrganicPreview />} />
            <Route path="/preview/creator-brutalist" element={<CreatorBrutalistPreview />} />
            <Route path="/preview/event-pastel" element={<EventPastelPreview />} />
            <Route path="/preview/devtool-cyberpunk" element={<DevToolCyberpunkPreview />} />
            <Route path="/preview/real-estate-luxury" element={<RealEstateLuxuryPreview />} />
            <Route
              path="/preview/healthcare-telehealth"
              element={<HealthcareTelehealthPreview />}
            />
            <Route path="/preview/web3-crypto" element={<Web3CryptoPreview />} />

            {/* Protected routes */}
            <Route element={<AuthGuard />}>
              {/* No Shell chrome — the first-login "one calm screen," not a page reached through
                  navigation. See docs/strategy/03-product-principles.md's First-Login step 0. */}
              <Route path="/business/setup" element={<BusinessSetupPage />} />
              <Route element={<Shell />}>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route element={<RequireNonAffiliate />}>
                  <Route index element={<Navigate to="/home" replace />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                  <Route path="/contacts/new" element={<CreateContactPage />} />
                  <Route
                    path="/contacts/import/new"
                    element={<Navigate to="/contacts#import" replace />}
                  />
                  <Route path="/contacts/:contactId" element={<ContactPage />} />
                  <Route path="/contacts/:contactId/edit" element={<UpdateContactPage />} />
                  <Route
                    path="/contacts/:contactId/interactions"
                    element={<ContactInteractionsPage />}
                  />
                  <Route path="/integrations" element={<IntegrationsPage />} />
                  <Route path="/contact-matches" element={<ContactMatchesPage />} />
                  <Route path="/audiences" element={<AudiencesPage />} />
                  <Route path="/audiences/new" element={<CreateAudiencePage />} />
                  <Route path="/audiences/:audienceId" element={<AudiencePage />} />
                  <Route path="/audiences/:audienceId/edit" element={<UpdateAudiencePage />} />
                  <Route
                    path="/audiences/:audienceId/contacts"
                    element={<AudienceContactsPage />}
                  />
                  <Route path="/media" element={<MediaPage />} />
                  <Route path="/media/:assetId" element={<MediaItemPage />} />
                  <Route path="/assets" element={<Navigate to="/media" replace />} />
                  <Route path="/assets/new" element={<Navigate to="/media" replace />} />
                  <Route path="/assets/:assetId" element={<AssetToMedia />} />
                  <Route path="/templates" element={<TemplatesPage />} />
                  <Route path="/templates/new" element={<CreateTemplatePage />} />
                  <Route path="/templates/:templateId" element={<TemplatePage />} />
                  <Route path="/templates/:templateId/edit" element={<UpdateTemplatePage />} />
                  <Route path="/ads" element={<AdsPage />} />
                  <Route path="/ads/new" element={<CreateAdPage />} />
                  <Route path="/ads/:adId" element={<AdPage />} />
                  <Route path="/ads/:adId/edit" element={<UpdateAdPage />} />
                  <Route path="/creatives" element={<Navigate to="/ads" replace />} />
                  <Route path="/creatives/new" element={<Navigate to="/ads/new" replace />} />
                  <Route path="/creatives/:creativeId" element={<CreativeToAd />} />
                  <Route path="/creatives/:creativeId/edit" element={<CreativeEditToAd />} />
                  <Route path="/inbox/:threadId" element={<InboxThreadPage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/messages/new" element={<CreateMessagePage />} />
                  <Route path="/messages/:messageId" element={<MessagePage />} />
                  <Route path="/messages/:messageId/edit" element={<UpdateMessagePage />} />
                  <Route path="/messages/:messageId/send" element={<SendMessagePage />} />
                  <Route
                    path="/messages/:messageId/test-send/new"
                    element={<TestSendMessagePage />}
                  />
                  <Route
                    path="/messages/:messageId/performance"
                    element={<MessagePerformancePage />}
                  />
                  <Route path="/automations" element={<AutomationsPage />} />
                  <Route path="/automations/new" element={<CreateAutomationPage />} />
                  <Route path="/automations/:automationId" element={<AutomationPage />} />
                  <Route
                    path="/automations/:automationId/edit"
                    element={<UpdateAutomationPage />}
                  />
                  <Route
                    path="/automations/:automationId/pause"
                    element={<PauseAutomationPage />}
                  />
                  <Route
                    path="/automations/:automationId/resume"
                    element={<ResumeAutomationPage />}
                  />
                  <Route path="/automations/:automationId/logs" element={<AutomationLogsPage />} />
                  <Route path="/campaigns" element={<CampaignsPage />} />
                  <Route path="/campaigns/new" element={<CreateCampaignPage />} />
                  <Route path="/campaigns/:campaignId" element={<CampaignPage />} />
                  <Route path="/campaigns/:campaignId/edit" element={<UpdateCampaignPage />} />
                  <Route path="/campaigns/:campaignId/pause" element={<PauseCampaignPage />} />
                  <Route path="/campaigns/:campaignId/resume" element={<ResumeCampaignPage />} />
                  <Route path="/campaigns/:campaignId/end" element={<EndCampaignPage />} />
                  <Route
                    path="/campaigns/:campaignId/duplicate"
                    element={<DuplicateCampaignPage />}
                  />
                  <Route
                    path="/campaigns/:campaignId/performance"
                    element={<CampaignPerformancePage />}
                  />
                  <Route path="/campaigns/:campaignId/budget" element={<CampaignBudgetPage />} />
                  <Route
                    path="/campaigns/:campaignId/creatives/new"
                    element={<CampaignCreateCreativePage />}
                  />
                  <Route
                    path="/campaigns/:campaignId/creatives"
                    element={<CampaignCreativesPage />}
                  />
                  <Route
                    path="/campaigns/:campaignId/ad-units/new"
                    element={<CampaignCreateAdUnitPage />}
                  />
                  <Route path="/campaigns/:campaignId/ad-units" element={<CampaignAdUnitsPage />} />
                  <Route path="/campaigns/:campaignId/leads" element={<CampaignLeadsPage />} />
                  <Route path="/campaigns/:campaignId/deployments" element={<DeploymentsPage />} />
                  <Route
                    path="/campaigns/:campaignId/deployments/new"
                    element={<CreateDeploymentPage />}
                  />
                  <Route
                    path="/deployments/:deploymentId/edit"
                    element={<UpdateDeploymentPage />}
                  />
                  <Route path="/landing-page-templates" element={<LandingPageTemplatesPage />} />
                  <Route
                    path="/landing-page-templates/:templateId"
                    element={<LandingPageTemplatePage />}
                  />
                  <Route path="/landing-pages" element={<LandingPagesPage />} />
                  <Route
                    path="/landing-pages/new"
                    element={<Navigate to="/landing-pages" replace />}
                  />
                  <Route path="/landing-pages/:landingPageId" element={<LandingPage />} />
                  <Route
                    path="/landing-pages/:landingPageId/edit"
                    element={<UpdateLandingPage />}
                  />
                  <Route
                    path="/landing-pages/:landingPageId/publish"
                    element={<PublishLandingPage />}
                  />
                  <Route
                    path="/landing-pages/:landingPageId/versions"
                    element={<LandingPageVersionsPage />}
                  />
                  <Route
                    path="/landing-pages/:landingPageId/export"
                    element={<ExportLandingPage />}
                  />
                  <Route
                    path="/landing-pages/:landingPageId/performance"
                    element={<LandingPagePerformancePage />}
                  />
                  <Route path="/forms" element={<FormsPage />} />
                  <Route path="/forms/new" element={<CreateFormPage />} />
                  <Route path="/forms/:formId" element={<FormPage />} />
                  <Route path="/forms/:formId/edit" element={<UpdateFormPage />} />
                  <Route path="/ad-units" element={<AdUnitsPage />} />
                  <Route path="/ad-units/new" element={<CreateAdUnitPage />} />
                  <Route path="/ad-units/:adUnitId" element={<AdUnitPage />} />
                  <Route path="/ad-units/:adUnitId/edit" element={<UpdateAdUnitPage />} />
                  <Route path="/leads" element={<LeadsPage />} />
                  <Route path="/leads/:leadId" element={<LeadPage />} />
                  <Route path="/leads/:leadId/edit" element={<UpdateLeadPage />} />
                  <Route path="/sales" element={<SalesPage />} />
                  <Route path="/sales/new" element={<CreateSalePage />} />
                  <Route path="/sales/:saleId" element={<SalePage />} />
                  <Route path="/home" element={<InboxRoute />} />
                  <Route path="/inbox" element={<Navigate to="/home" replace />} />
                  <Route path="/results" element={<ResultsSummaryPage />} />
                  <Route path="/platforms" element={<PlatformsPage />} />
                  <Route
                    path="/affiliates"
                    element={
                      <RequireRole role="ADMIN">
                        <AffiliatesPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/affiliates/new"
                    element={
                      <RequireRole role="ADMIN">
                        <CreateAffiliatePage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/affiliates/classes"
                    element={
                      <RequireRole role="ADMIN">
                        <AffiliateClassesPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/affiliates/payouts"
                    element={
                      <RequireRole role="ADMIN">
                        <AffiliatePayoutsPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/affiliates/:affiliateId"
                    element={
                      <RequireRole role="ADMIN">
                        <AffiliateDetailPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/billing"
                    element={
                      <RequireRole role="ADMIN">
                        <BillingPage />
                      </RequireRole>
                    }
                  />
                </Route>
                <Route
                  path="/portal"
                  element={
                    <RequireRole role="AFFILIATE">
                      <AffiliatePortalHomePage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/portal/team"
                  element={
                    <RequireRole role="AFFILIATE">
                      <AffiliatePortalTeamPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/portal/payouts"
                  element={
                    <RequireRole role="AFFILIATE">
                      <AffiliatePortalPayoutsPage />
                    </RequireRole>
                  }
                />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
      </ResettableErrorBoundary>
    </BrowserRouter>
  )
}
