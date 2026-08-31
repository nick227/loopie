import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Users,
  LayoutTemplate,
  Send,
  ArrowRight,
  ArrowLeft,
  Mail,
  MessageSquare,
  Twitter,
  Linkedin,
} from 'lucide-react'
import { mockAudiences } from '@/lib/mockData'
import { cn } from '@/lib/utils'

export function BroadcastWizard() {
  const [step, setStep] = useState(1)

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-primary/20">
      <CardHeader className="border-b bg-muted/10 pb-8 pt-8">
        <CardTitle className="text-2xl font-bold">New Broadcast</CardTitle>
        <CardDescription>Create a powerful campaign to reach your audience.</CardDescription>

        <div className="mt-8 flex items-center justify-between gap-4">
          {[
            { num: 1, title: 'Audience', icon: Users },
            { num: 2, title: 'Content', icon: LayoutTemplate },
            { num: 3, title: 'Review', icon: Send },
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  step === s.num
                    ? 'border-primary bg-primary text-primary-foreground'
                    : step > s.num
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-muted bg-background text-muted-foreground',
                )}
              >
                <s.icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  step === s.num ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="min-h-[400px] p-6">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Select your audience</h3>
              <p className="text-sm text-muted-foreground">
                Choose a segment to target with this broadcast.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {mockAudiences.map((aud) => (
                <Card
                  key={aud.id}
                  className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                  onClick={() => setStep(2)}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{aud.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">{aud.size.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mb-3">Total Recipients</p>

                    <div className="flex gap-2">
                      {aud.channels.map((ch) => {
                        let Icon = Mail
                        if (ch === 'SMS') Icon = MessageSquare
                        if (ch === 'TWITTER') Icon = Twitter
                        if (ch === 'LINKEDIN') Icon = Linkedin
                        return (
                          <div
                            key={ch}
                            title={ch}
                            className="bg-muted p-1.5 rounded-md text-muted-foreground"
                          >
                            <Icon className="h-3 w-3" />
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Design your message</h3>
            <p className="text-sm text-muted-foreground">
              Use the drag-and-drop editor or SMS preview.
            </p>
            {/* Visual Editor Component would go here */}
            <div className="h-48 rounded-lg border-2 border-dashed border-muted flex items-center justify-center bg-muted/5">
              <span className="text-muted-foreground">Visual Editor Placeholder</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review & Send</h3>
            <p className="text-sm text-muted-foreground">Check everything before it goes out.</p>
            {/* PreFlight Checklist Component would go here */}
            <div className="h-48 rounded-lg border-2 border-dashed border-muted flex items-center justify-center bg-muted/5">
              <span className="text-muted-foreground">Pre-flight Checklist Placeholder</span>
            </div>
          </div>
        )}
      </CardContent>

      <div className="flex items-center justify-between border-t p-6 bg-muted/10">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => setStep((s) => Math.min(3, s + 1))}
          className={step === 3 ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
        >
          {step === 3 ? (
            <>
              Send Broadcast <Send className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Next Step <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
