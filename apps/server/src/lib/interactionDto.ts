import { toChannelProviderRef } from './channelProviders'

// Shared between ContactService.listInteractions and .logActivity so both DTO-shape an
// Interaction identically, provider included.
export function toInteractionDTO(interaction: {
  id: string
  contactId: string
  type: string
  channel: string | null
  sourceType: string | null
  sourceMessageId: string | null
  sourceDeploymentId: string | null
  sourceAdUnitId: string | null
  metadata: unknown
  occurredAt: Date
  provider?: { id: string; name: string } | null
}) {
  return {
    id: interaction.id,
    contactId: interaction.contactId,
    type: interaction.type,
    channel: interaction.channel,
    provider: interaction.provider ? toChannelProviderRef(interaction.provider) : null,
    sourceType: interaction.sourceType,
    sourceMessageId: interaction.sourceMessageId,
    sourceDeploymentId: interaction.sourceDeploymentId,
    sourceAdUnitId: interaction.sourceAdUnitId,
    metadata: interaction.metadata,
    occurredAt: interaction.occurredAt.toISOString(),
  }
}
