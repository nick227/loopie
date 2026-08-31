import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Send, Image as ImageIcon, Link as LinkIcon, Smile } from 'lucide-react'
import { mockAudiences } from '@/lib/mockData'

export function BroadcastComposer() {
  const [audienceId, setAudienceId] = useState(mockAudiences[0]?.id ?? '')

  const selectedAudience = mockAudiences.find((a) => a.id === audienceId)

  return (
    <div className="flex flex-col gap-6 max-w-3xl w-full">
      <div className="space-y-1 border-b pb-4">
        <h2 className="text-2xl font-bold">New Broadcast</h2>
        <p className="text-sm text-muted-foreground">Draft and send a message to your audience.</p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">To (Audience)</label>
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={audienceId}
            onChange={(e) => setAudienceId(e.target.value)}
          >
            {mockAudiences.map((aud) => (
              <option key={aud.id} value={aud.id}>
                {aud.name} ({aud.size.toLocaleString()} recipients)
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Subject</label>
          <Input placeholder="Enter a catchy subject line..." />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Message</label>
          <Card className="overflow-hidden">
            <div className="flex items-center gap-1 border-b bg-muted/20 p-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <LinkIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Smile className="h-4 w-4" />
              </Button>
            </div>
            <textarea
              className="min-h-[300px] w-full resize-none bg-transparent p-4 text-sm focus:outline-none"
              placeholder="Write your message here..."
            />
          </Card>
        </div>
      </div>

      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4 border-t pt-4">
        <div className="text-sm text-muted-foreground text-center md:text-left">
          Will be sent to{' '}
          <strong className="text-foreground">{selectedAudience?.size.toLocaleString()}</strong>{' '}
          recipients via {selectedAudience?.channels.join(', ')}.
        </div>
        <div className="flex gap-2 justify-center md:justify-end w-full md:w-auto">
          <Button variant="outline">Save Draft</Button>
          <Button className="bg-primary text-primary-foreground">
            <Send className="mr-2 h-4 w-4" />
            Send Now
          </Button>
        </div>
      </div>
    </div>
  )
}
