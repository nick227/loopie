import { Sparkles, Shield, Zap, ChevronRight, Loader2 } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { MobileNav } from '@/components/ui/MobileNav'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  PageModel,
  HeroBlock,
  FeatureGridBlock,
  TestimonialBlock,
  TimelineBlock,
  CalculatorBlock,
} from '@/types/content'

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
})

type FormData = z.infer<typeof formSchema>

// --- Block Components ---

const HeroSection = ({ block }: { block: HeroBlock }) => {
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async (_formData: FormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitted(true)
  }

  return (
    <main className="flex-1 flex items-center pt-24 pb-32" id="waitlist">
      <Container className="grid xl:grid-cols-2 gap-20 items-center">
        <div className="text-center xl:text-left max-w-3xl mx-auto xl:mx-0 relative z-20">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-[100px]" />

          {block.badges && block.badges.length > 0 && (
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-fuchsia-300 text-sm font-bold tracking-wide mb-10 backdrop-blur-md shadow-lg">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-fuchsia-500"></span>
              </span>
              {block.badges[0]}
            </div>
          )}

          <h1
            className="text-7xl lg:text-[7rem] font-black tracking-tighter mb-8 leading-[0.9]"
            dangerouslySetInnerHTML={{
              __html: block.headline.replace('\n', '<br className="hidden lg:block" />'),
            }}
          />

          <p className="text-2xl text-white/60 mb-12 max-w-2xl mx-auto xl:mx-0 leading-relaxed font-medium">
            {block.subheadline}
          </p>

          {/* Waitlist Inline Form */}
          {block.interactionType === 'inline-form' && (
            <div className="w-full max-w-xl mx-auto xl:mx-0 mb-12">
              {isSubmitted ? (
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md text-center shadow-2xl">
                  <Sparkles className="w-12 h-12 text-fuchsia-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">You&apos;re on the list!</h3>
                  <p className="text-white/60 text-lg">
                    Keep an eye on your inbox for early access.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 to-cyan-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-3xl" />
                  <div className="relative flex flex-col sm:flex-row gap-3 bg-[#0A0A0A] rounded-3xl p-3 z-10 border border-white/10 shadow-2xl shadow-black">
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="Enter your email address"
                      className="flex-1 bg-transparent border-none text-white px-6 py-4 focus:outline-none focus:ring-0 placeholder:text-white/30 text-lg font-medium"
                      disabled={isSubmitting}
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-white text-black font-bold rounded-2xl px-8 py-4 hover:bg-white/90 transition-colors whitespace-nowrap text-lg shadow-lg shadow-white/10 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                      {block.ctas?.[0]?.label || 'Join Waitlist'}
                    </button>
                  </div>
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-4 px-6 absolute -bottom-8 font-medium w-full text-center">
                      {errors.email.message}
                    </p>
                  )}
                </form>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 justify-center xl:justify-start">
            <div className="flex -space-x-4">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128"
                className="w-12 h-12 rounded-full border-4 border-[#020202]"
                alt="User"
              />
              <img
                src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=128&h=128"
                className="w-12 h-12 rounded-full border-4 border-[#020202]"
                alt="User"
              />
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&h=128"
                className="w-12 h-12 rounded-full border-4 border-[#020202]"
                alt="User"
              />
            </div>
            <p className="text-lg text-white/50 font-medium">
              Join 10,000+ others already on the list.
            </p>
          </div>
        </div>

        {/* Mockup */}
        {block.media && (
          <div className="relative mx-auto w-full max-w-[360px] lg:max-w-[420px] mt-16 xl:mt-0 z-10 group perspective-[1000px]">
            <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500/40 to-cyan-500/40 blur-[120px] rounded-full group-hover:scale-110 transition-transform duration-1000" />
            <div className="relative rounded-[3rem] border-[8px] border-[#1A1A1A] bg-black shadow-2xl backdrop-blur-3xl aspect-[9/19] overflow-hidden transform group-hover:rotate-y-[-10deg] group-hover:rotate-x-[5deg] transition-transform duration-700">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-8 bg-[#1A1A1A] rounded-b-3xl z-30" />

              {/* Beautiful Mockup UI */}
              <div className="relative w-full h-full bg-[#0A0A0A] flex flex-col">
                <div className="pt-20 pb-8 px-8 bg-gradient-to-b from-fuchsia-500/20 to-transparent">
                  <p className="text-white/50 text-sm mb-2 font-semibold tracking-wider uppercase">
                    Total Balance
                  </p>
                  <h2 className="text-5xl font-light tracking-tight">
                    $24,592<span className="text-white/40 text-3xl">.50</span>
                  </h2>
                </div>

                <div className="px-8 py-6">
                  <div className="h-32 w-full flex items-end justify-between gap-2">
                    {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                      <div
                        key={i}
                        className="w-full bg-gradient-to-t from-fuchsia-500 to-cyan-500 rounded-t-md opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex-1 bg-[#111] rounded-t-[3rem] p-8 mt-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                  <h3 className="text-base font-semibold mb-6 text-white/80">Recent Activity</h3>
                  <div className="space-y-6">
                    {[
                      {
                        name: 'Apple Store',
                        amount: '-$120.00',
                        icon: '🍎',
                        color: 'from-zinc-700 to-zinc-800',
                      },
                      {
                        name: 'Salary',
                        amount: '+$4,200.00',
                        icon: '💰',
                        color: 'from-green-500/20 to-green-600/20',
                      },
                      {
                        name: 'Uber',
                        amount: '-$15.40',
                        icon: '🚗',
                        color: 'from-zinc-700 to-zinc-800',
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex gap-4 items-center">
                          <div
                            className={`w-12 h-12 rounded-full bg-gradient-to-tr ${item.color} flex items-center justify-center text-xl shadow-inner border border-white/5`}
                          >
                            {item.icon}
                          </div>
                          <div>
                            <div className="text-base font-semibold">{item.name}</div>
                            <div className="text-sm text-white/40 font-medium">Today</div>
                          </div>
                        </div>
                        <div
                          className={`text-base font-bold ${item.amount.startsWith('+') ? 'text-green-400' : 'text-white'}`}
                        >
                          {item.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </main>
  )
}

const FeatureGridSection = ({ block }: { block: FeatureGridBlock }) => {
  // If no title, it's the security badges row
  if (!block.title) {
    return (
      <section className="py-16 border-t border-white/5 bg-[#020202] relative z-20 overflow-hidden">
        <Container>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
            {block.features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-4 text-white/40 hover:text-white/80 transition-colors cursor-crosshair"
              >
                {feature.icon === 'Shield' && <Shield className="w-8 h-8 text-fuchsia-400" />}
                {feature.icon === 'Zap' && <Zap className="w-8 h-8 text-fuchsia-400" />}
                {feature.icon === 'Sparkles' && <Sparkles className="w-8 h-8 text-cyan-400" />}
                {feature.icon === '256' && (
                  <div className="w-8 h-8 rounded border-2 border-cyan-400 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    256
                  </div>
                )}
                <span className="text-lg font-bold tracking-tight">{feature.title}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>
    )
  }

  // Otherwise, it's the "How it Works" section
  return (
    <section className="py-32 border-t border-white/5 bg-[#050505]">
      <Container>
        <div className="text-center mb-24 max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-6">{block.title}</h2>
          <p className="text-white/50 text-2xl font-medium">{block.subtitle}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-16">
          {block.features.map((feature, i) => (
            <div
              key={i}
              className="flex flex-col text-center lg:text-left group cursor-default relative"
            >
              <div className="text-[10rem] font-black text-white/[0.02] absolute -top-16 -left-8 -z-10 group-hover:text-white/[0.05] transition-colors">
                0{i + 1}
              </div>
              <h3 className="text-3xl font-bold text-white/90 mb-4 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-white/50 text-lg leading-relaxed font-medium">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

const TestimonialSection = ({ block }: { block: TestimonialBlock }) => {
  const testimonial = block.testimonials?.[0]
  if (!testimonial) return null

  return (
    <section className="py-40 border-t border-white/5 bg-[#020202] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-fuchsia-500/10 rounded-full blur-[150px]" />
      <Container className="max-w-4xl relative z-10">
        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 md:p-20 backdrop-blur-2xl shadow-2xl">
          <Sparkles className="w-12 h-12 text-fuchsia-400 mb-12" />
          <p className="text-3xl md:text-4xl text-white/90 leading-tight font-medium mb-16 tracking-tight">
            &ldquo;{testimonial.quote}&rdquo;
          </p>
          <div className="flex items-center gap-6">
            <img
              src={testimonial.avatarUrl}
              alt={testimonial.author}
              className="w-20 h-20 rounded-full border-4 border-fuchsia-500/30"
            />
            <div>
              <div className="font-bold text-2xl text-white">{testimonial.author}</div>
              <div className="text-lg text-fuchsia-400 font-medium">{testimonial.role}</div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

const TimelineSection = ({ block }: { block: TimelineBlock }) => {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <section className="py-32 relative overflow-hidden">
      <Container className="max-w-5xl">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
            {block.title || 'The Roadmap'}
          </h2>
        </div>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2" />

          <div className="space-y-24">
            {block.steps.map((step, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16 group ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Node */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border border-white/20 bg-[#020202] flex items-center justify-center z-10 transition-colors duration-500 group-hover:border-fuchsia-500 group-hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]">
                  <div
                    className={`w-3 h-3 rounded-full transition-colors duration-500 ${activeStep >= idx ? 'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,1)]' : 'bg-white/20'}`}
                  />
                </div>

                <div
                  className={`w-full md:w-1/2 pl-24 md:pl-0 ${idx % 2 === 0 ? 'md:text-left' : 'md:text-right'} transition-opacity duration-500 ${activeStep >= idx ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
                  onMouseEnter={() => setActiveStep(idx)}
                >
                  <div className="text-fuchsia-400 font-mono text-sm tracking-widest mb-3 uppercase">
                    {step.date}
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">{step.title}</h3>
                  <p className="text-lg text-white/60 leading-relaxed font-medium">
                    {step.description}
                  </p>
                </div>

                <div className="hidden md:block md:w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

const CalculatorSection = ({ block }: { block: CalculatorBlock }) => {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    block.inputs.forEach((i) => (init[i.id] = i.defaultValue))
    return init
  })

  const handleSliderChange = (id: string, val: number) => {
    setValues((prev) => ({ ...prev, [id]: val }))
  }

  const calculateROI = () => {
    return (values['users'] || 100) * (values['hours'] || 5) * 50 // Dummy calculation
  }

  return (
    <section className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent pointer-events-none" />
      <Container className="max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
              {block.title || 'Calculate ROI'}
            </h2>
            {block.subtitle && (
              <p className="text-xl text-white/60 font-medium mb-12">{block.subtitle}</p>
            )}

            <div className="space-y-12">
              {block.inputs.map((input) => (
                <div key={input.id}>
                  <div className="flex justify-between items-center mb-6">
                    <label className="text-sm font-bold text-white/50 uppercase tracking-widest">
                      {input.label}
                    </label>
                    <span className="text-3xl font-bold text-white">
                      {(values[input.id] ?? input.defaultValue).toLocaleString()}
                    </span>
                  </div>
                  <div className="relative h-2 bg-white/10 rounded-full">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-full shadow-[0_0_20px_rgba(217,70,239,0.5)]"
                      style={{
                        width: `${(((values[input.id] ?? input.defaultValue) - (input.min || 0)) / ((input.max || 100) - (input.min || 0))) * 100}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={input.min || 0}
                      max={input.max || 100}
                      step={input.step || 1}
                      value={values[input.id] ?? input.defaultValue}
                      onChange={(e) => handleSliderChange(input.id, Number(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 backdrop-blur-2xl text-center shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h3 className="text-xl font-medium text-white/50 mb-4 relative z-10">
              Potential Savings / Year
            </h3>
            <div className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 mb-8 relative z-10">
              ${calculateROI().toLocaleString()}
            </div>
            <button className="relative z-10 w-full bg-white text-black font-bold h-14 rounded-full text-lg shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-transform hover:scale-105 hover:shadow-[0_0_50px_rgba(255,255,255,0.5)]">
              Start Free Trial
            </button>
          </div>
        </div>
      </Container>
    </section>
  )
}

// --- Main Template ---

export function AppWaitlistNeon({ data }: { data?: PageModel }) {
  if (!data) return null

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-fuchsia-500/30 selection:text-fuchsia-200">
      {/* Decorative Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-600/10 blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-600/10 blur-[150px] mix-blend-screen" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDAuNWg0ME0wIDQwLjVoNDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIvPjxwYXRoIGQ9Ik0wLjUgMGwwIDQwTTAuNSA0MGwwLTQwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMikiLz48L3N2Zz4=')] opacity-50" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Nav */}
        <nav className="py-6 w-full z-50 bg-[#020202]/80 backdrop-blur-2xl border-b border-white/5 sticky top-0">
          <Container className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-white/90">
                {(data.title.split('-')[0] || '').trim()}
              </span>
            </div>

            <div className="flex items-center gap-6">
              {data.navLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  className="hidden sm:flex text-base font-semibold text-white/60 hover:text-white transition-colors items-center gap-2 group"
                >
                  {link.label}{' '}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              ))}
              <MobileNav
                links={data.navLinks.map((l) => ({ label: l.label, href: l.url }))}
                overlayClassName="bg-[#020202]/95 backdrop-blur-xl text-white border-l border-white/10"
                linkClassName="text-3xl font-bold tracking-tight text-white"
                iconClassName="w-8 h-8 text-white"
              />
            </div>
          </Container>
        </nav>

        {/* Dynamic Blocks */}
        {data.blocks.map((block, index) => {
          switch (block._type) {
            case 'hero':
              return <HeroSection key={index} block={block as HeroBlock} />
            case 'timeline':
              return <TimelineSection key={index} block={block as TimelineBlock} />
            case 'feature_grid':
              return <FeatureGridSection key={index} block={block as FeatureGridBlock} />
            case 'calculator':
              return <CalculatorSection key={index} block={block as CalculatorBlock} />
            case 'testimonials':
              return <TestimonialSection key={index} block={block as TestimonialBlock} />
            default:
              return null
          }
        })}

        {/* Footer */}
        <footer className="py-12 border-t border-white/5 bg-[#020202]">
          <Container className="flex flex-col sm:flex-row justify-between items-center gap-6 text-base text-white/40 font-medium">
            <div>© 2026 {(data.title.split('-')[0] || '').trim()}. All rights reserved.</div>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">
                Twitter
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Discord
              </a>
            </div>
          </Container>
        </footer>
      </div>
    </div>
  )
}
