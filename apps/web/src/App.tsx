import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RegisterPage } from '@/pages/RegisterPage'
import { LoginPage } from '@/pages/LoginPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { CreateContactPage } from '@/pages/CreateContactPage'
import { ImportContactsPage } from '@/pages/ImportContactsPage'
import { ContactPage } from '@/pages/ContactPage'
import { UpdateContactPage } from '@/pages/UpdateContactPage'
import { ContactInteractionsPage } from '@/pages/ContactInteractionsPage'
import { AudiencesPage } from '@/pages/AudiencesPage'
import { CreateAudiencePage } from '@/pages/CreateAudiencePage'
import { AudiencePage } from '@/pages/AudiencePage'
import { UpdateAudiencePage } from '@/pages/UpdateAudiencePage'
import { AudienceContactsPage } from '@/pages/AudienceContactsPage'
import { AssetsPage } from '@/pages/AssetsPage'
import { CreateAssetPage } from '@/pages/CreateAssetPage'
import { AssetPage } from '@/pages/AssetPage'
import { TemplatesPage } from '@/pages/TemplatesPage'
import { CreateTemplatePage } from '@/pages/CreateTemplatePage'
import { TemplatePage } from '@/pages/TemplatePage'
import { UpdateTemplatePage } from '@/pages/UpdateTemplatePage'
import { CreativesPage } from '@/pages/CreativesPage'
import { CreateCreativePage } from '@/pages/CreateCreativePage'
import { CreativePage } from '@/pages/CreativePage'
import { UpdateCreativePage } from '@/pages/UpdateCreativePage'
import { MessagesPage } from '@/pages/MessagesPage'
import { CreateMessagePage } from '@/pages/CreateMessagePage'
import { MessagePage } from '@/pages/MessagePage'
import { UpdateMessagePage } from '@/pages/UpdateMessagePage'
import { SendMessagePage } from '@/pages/SendMessagePage'
import { TestSendMessagePage } from '@/pages/TestSendMessagePage'
import { MessagePerformancePage } from '@/pages/MessagePerformancePage'
import { AutomationsPage } from '@/pages/AutomationsPage'
import { CreateAutomationPage } from '@/pages/CreateAutomationPage'
import { AutomationPage } from '@/pages/AutomationPage'
import { UpdateAutomationPage } from '@/pages/UpdateAutomationPage'
import { PauseAutomationPage } from '@/pages/PauseAutomationPage'
import { ResumeAutomationPage } from '@/pages/ResumeAutomationPage'
import { AutomationLogsPage } from '@/pages/AutomationLogsPage'
import { CampaignsPage } from '@/pages/CampaignsPage'
import { CreateCampaignPage } from '@/pages/CreateCampaignPage'
import { CampaignPage } from '@/pages/CampaignPage'
import { UpdateCampaignPage } from '@/pages/UpdateCampaignPage'
import { PauseCampaignPage } from '@/pages/PauseCampaignPage'
import { ResumeCampaignPage } from '@/pages/ResumeCampaignPage'
import { EndCampaignPage } from '@/pages/EndCampaignPage'
import { DuplicateCampaignPage } from '@/pages/DuplicateCampaignPage'
import { CampaignPerformancePage } from '@/pages/CampaignPerformancePage'
import { CampaignBudgetPage } from '@/pages/CampaignBudgetPage'
import { DeploymentsPage } from '@/pages/DeploymentsPage'
import { CreateDeploymentPage } from '@/pages/CreateDeploymentPage'
import { UpdateDeploymentPage } from '@/pages/UpdateDeploymentPage'
import { LandingPageTemplatesPage } from '@/pages/LandingPageTemplatesPage'
import { LandingPageTemplatePage } from '@/pages/LandingPageTemplatePage'
import { LandingPagesPage } from '@/pages/LandingPagesPage'
import { CreateLandingPage } from '@/pages/CreateLandingPage'
import { LandingPage } from '@/pages/LandingPage'
import { UpdateLandingPage } from '@/pages/UpdateLandingPage'
import { PublishLandingPage } from '@/pages/PublishLandingPage'
import { LandingPageVersionsPage } from '@/pages/LandingPageVersionsPage'
import { ExportLandingPage } from '@/pages/ExportLandingPage'
import { LandingPagePerformancePage } from '@/pages/LandingPagePerformancePage'
import { FormsPage } from '@/pages/FormsPage'
import { CreateFormPage } from '@/pages/CreateFormPage'
import { FormPage } from '@/pages/FormPage'
import { UpdateFormPage } from '@/pages/UpdateFormPage'
import { AdUnitsPage } from '@/pages/AdUnitsPage'
import { CreateAdUnitPage } from '@/pages/CreateAdUnitPage'
import { AdUnitPage } from '@/pages/AdUnitPage'
import { UpdateAdUnitPage } from '@/pages/UpdateAdUnitPage'
import { LeadsPage } from '@/pages/LeadsPage'
import { LeadPage } from '@/pages/LeadPage'
import { UpdateLeadPage } from '@/pages/UpdateLeadPage'
import { SalesPage } from '@/pages/SalesPage'
import { CreateSalePage } from '@/pages/CreateSalePage'
import { SalePage } from '@/pages/SalePage'
import { HomeSummaryPage } from '@/pages/HomeSummaryPage'
import { ResultsSummaryPage } from '@/pages/ResultsSummaryPage'
import { AuthGuard } from '@/lib/AuthGuard'
import { Shell } from '@/components/layout/Shell'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public / auth routes */}
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          <Route element={<Shell />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/contacts/new" element={<CreateContactPage />} />
          <Route path="/contacts/import/new" element={<ImportContactsPage />} />
          <Route path="/contacts/:contactId" element={<ContactPage />} />
          <Route path="/contacts/:contactId/edit" element={<UpdateContactPage />} />
          <Route path="/contacts/:contactId/interactions" element={<ContactInteractionsPage />} />
          <Route path="/audiences" element={<AudiencesPage />} />
          <Route path="/audiences/new" element={<CreateAudiencePage />} />
          <Route path="/audiences/:audienceId" element={<AudiencePage />} />
          <Route path="/audiences/:audienceId/edit" element={<UpdateAudiencePage />} />
          <Route path="/audiences/:audienceId/contacts" element={<AudienceContactsPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/new" element={<CreateAssetPage />} />
          <Route path="/assets/:assetId" element={<AssetPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/new" element={<CreateTemplatePage />} />
          <Route path="/templates/:templateId" element={<TemplatePage />} />
          <Route path="/templates/:templateId/edit" element={<UpdateTemplatePage />} />
          <Route path="/creatives" element={<CreativesPage />} />
          <Route path="/creatives/new" element={<CreateCreativePage />} />
          <Route path="/creatives/:creativeId" element={<CreativePage />} />
          <Route path="/creatives/:creativeId/edit" element={<UpdateCreativePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/new" element={<CreateMessagePage />} />
          <Route path="/messages/:messageId" element={<MessagePage />} />
          <Route path="/messages/:messageId/edit" element={<UpdateMessagePage />} />
          <Route path="/messages/:messageId/send" element={<SendMessagePage />} />
          <Route path="/messages/:messageId/test-send/new" element={<TestSendMessagePage />} />
          <Route path="/messages/:messageId/performance" element={<MessagePerformancePage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/automations/new" element={<CreateAutomationPage />} />
          <Route path="/automations/:automationId" element={<AutomationPage />} />
          <Route path="/automations/:automationId/edit" element={<UpdateAutomationPage />} />
          <Route path="/automations/:automationId/pause" element={<PauseAutomationPage />} />
          <Route path="/automations/:automationId/resume" element={<ResumeAutomationPage />} />
          <Route path="/automations/:automationId/logs" element={<AutomationLogsPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/new" element={<CreateCampaignPage />} />
          <Route path="/campaigns/:campaignId" element={<CampaignPage />} />
          <Route path="/campaigns/:campaignId/edit" element={<UpdateCampaignPage />} />
          <Route path="/campaigns/:campaignId/pause" element={<PauseCampaignPage />} />
          <Route path="/campaigns/:campaignId/resume" element={<ResumeCampaignPage />} />
          <Route path="/campaigns/:campaignId/end" element={<EndCampaignPage />} />
          <Route path="/campaigns/:campaignId/duplicate" element={<DuplicateCampaignPage />} />
          <Route path="/campaigns/:campaignId/performance" element={<CampaignPerformancePage />} />
          <Route path="/campaigns/:campaignId/budget" element={<CampaignBudgetPage />} />
          <Route path="/campaigns/:campaignId/deployments" element={<DeploymentsPage />} />
          <Route path="/campaigns/:campaignId/deployments/new" element={<CreateDeploymentPage />} />
          <Route path="/deployments/:deploymentId/edit" element={<UpdateDeploymentPage />} />
          <Route path="/landing-page-templates" element={<LandingPageTemplatesPage />} />
          <Route path="/landing-page-templates/:templateId" element={<LandingPageTemplatePage />} />
          <Route path="/landing-pages" element={<LandingPagesPage />} />
          <Route path="/landing-pages/new" element={<CreateLandingPage />} />
          <Route path="/landing-pages/:landingPageId" element={<LandingPage />} />
          <Route path="/landing-pages/:landingPageId/edit" element={<UpdateLandingPage />} />
          <Route path="/landing-pages/:landingPageId/publish" element={<PublishLandingPage />} />
          <Route path="/landing-pages/:landingPageId/versions" element={<LandingPageVersionsPage />} />
          <Route path="/landing-pages/:landingPageId/export" element={<ExportLandingPage />} />
          <Route path="/landing-pages/:landingPageId/performance" element={<LandingPagePerformancePage />} />
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
          <Route path="/home" element={<HomeSummaryPage />} />
          <Route path="/results" element={<ResultsSummaryPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
