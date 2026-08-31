import {
  Rocket,
  FileText,
  Zap,
  Clock,
  Leaf,
  Code,
  Terminal,
  Gem,
  ArrowRight,
  Loader2,
  Cpu,
  Coins,
  Image as ImageIcon,
  Github,
} from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { MobileNav } from '@/components/ui/MobileNav'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useState, useEffect } from 'react'
import {
  PageModel,
  HeroBlock,
  FeatureGridBlock,
  TextMediaBlock,
  FormBlock,
  ServiceSelectorBlock,
  ImageBrowserBlock,
  TimelineBlock,
  CalculatorBlock,
  MetricsBlock,
} from '@/types/content'
import { Button } from '@/components/ui/Button'

// --- Block Components ---

const HeroSection = ({ block }: { block: HeroBlock }) => {
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0)
  const heroStates = block.interactionType === 'carousel' && block.states ? block.states : null

  useEffect(() => {
    if (!heroStates) return
    const interval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroStates.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [heroStates])

  return (
    <main className="pt-48 pb-32 overflow-hidden relative">
      <Container className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          {block.badges && block.badges.length > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-[#47D1FF] mb-12 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#47D1FF] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#47D1FF]"></span>
              </span>
              {block.badges.join(' • ')}
            </div>
          )}

          {heroStates ? (
            <div className="min-h-[300px]">
              <h1
                className="text-6xl sm:text-7xl md:text-[8rem] lg:text-[9rem] font-bold tracking-tighter mb-10 leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50"
                dangerouslySetInnerHTML={{
                  __html: heroStates[currentHeroSlide]!.headline.replace('\n', '<br />\n'),
                }}
              />
              <p className="text-2xl text-white/60 mb-12 max-w-xl leading-relaxed font-light">
                {heroStates[currentHeroSlide]!.subheadline}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {heroStates[currentHeroSlide]!.ctas?.map((cta, i) =>
                  cta.variant === 'primary' ? (
                    <button
                      key={i}
                      className="bg-gradient-to-r from-[#B347FF] to-[#47D1FF] text-white px-10 py-5 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-3 shadow-[0_0_40px_-10px_rgba(179,71,255,0.4)] text-lg"
                    >
                      {cta.icon === 'Rocket' && <Rocket className="w-6 h-6" />}
                      {cta.icon === 'Coins' && <Coins className="w-6 h-6" />}
                      {cta.icon === 'Image' && <ImageIcon className="w-6 h-6" />}
                      {cta.label}
                    </button>
                  ) : null,
                )}
              </div>
            </div>
          ) : (
            <div>
              <h1
                className="text-6xl sm:text-7xl md:text-[8rem] font-bold tracking-tighter mb-10 leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50"
                dangerouslySetInnerHTML={{ __html: block.headline.replace('\n', '<br />\n') }}
              />
              <p className="text-2xl text-white/60 mb-12 max-w-xl leading-relaxed font-light">
                {block.subheadline}
              </p>
            </div>
          )}
        </div>

        {heroStates && (
          <div className="relative group perspective-[1000px] h-[500px]">
            {heroStates.map((state, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-all duration-1000 ease-out ${currentHeroSlide === i ? 'opacity-100 rotate-y-0 scale-100 z-10' : 'opacity-0 rotate-y-12 scale-95 z-0'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[#B347FF] to-[#47D1FF] rounded-full blur-[100px] opacity-30 group-hover:opacity-60 transition-opacity duration-1000 animate-pulse-slow" />
                <img
                  src={state.media.url}
                  alt={state.media.alt}
                  className="relative z-10 w-full h-full object-cover rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] mix-blend-luminosity hover:mix-blend-normal transition-all duration-1000"
                />
              </div>
            ))}
          </div>
        )}
      </Container>

      {/* Carousel Controls */}
      {heroStates && (
        <Container className="mt-20">
          <div className="flex gap-4 border-b border-white/10">
            {heroStates.map((state, i) => (
              <button
                key={i}
                onClick={() => setCurrentHeroSlide(i)}
                className={`py-4 px-6 font-bold text-sm tracking-wider transition-colors border-b-2 -mb-[1px] ${currentHeroSlide === i ? 'text-[#47D1FF] border-[#47D1FF]' : 'text-white/40 border-transparent hover:text-white'}`}
              >
                {state.label}
              </button>
            ))}
          </div>
        </Container>
      )}
    </main>
  )
}

const FeaturesSection = ({ block }: { block: FeatureGridBlock }) => (
  <section className="py-40 border-t border-white/5 relative bg-white/[0.02]">
    <Container>
      <div className="text-center mb-24 max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[0.9]">
          {block.title}
        </h2>
        <p className="text-xl md:text-2xl font-light text-white/50 leading-relaxed">
          {block.subtitle}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {block.features.map((feature, i) => (
          <div
            key={i}
            className="bg-[#0A0A0E] border border-white/10 p-10 rounded-3xl hover:bg-white/5 transition-all duration-500 group shadow-2xl"
          >
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
              {feature.icon === 'Zap' && <Zap className="w-8 h-8 text-[#B347FF]" />}
              {feature.icon === 'Clock' && <Clock className="w-8 h-8 text-[#47D1FF]" />}
              {feature.icon === 'Leaf' && <Leaf className="w-8 h-8 text-green-400" />}
            </div>
            <h3 className="text-3xl font-bold mb-4">{feature.title}</h3>
            <p className="text-white/50 leading-relaxed text-lg font-light">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </Container>
  </section>
)

const ServiceSelectorSection = ({ block }: { block: ServiceSelectorBlock }) => {
  const [activeServiceId, setActiveServiceId] = useState<string | null>(
    block.services.length > 0 ? block.services[0]?.id || null : null,
  )
  const activeService = block.services.find((s) => s.id === activeServiceId)

  return (
    <section className="py-40 border-t border-white/5 relative bg-[#050508]">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#B347FF]/10 rounded-full blur-[150px] pointer-events-none" />
      <Container className="relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-24">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[0.9]">
            {block.title}
          </h2>
          <p className="text-xl md:text-2xl font-light text-white/50 leading-relaxed">
            {block.subtitle}
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {block.services.map((service) => (
              <button
                key={service.id}
                onClick={() => setActiveServiceId(service.id)}
                className={`px-8 py-4 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 ${
                  activeServiceId === service.id
                    ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-105'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {service.label}
              </button>
            ))}
          </div>

          {activeService && (
            <div className="grid lg:grid-cols-2 gap-16 items-center bg-white/[0.02] border border-white/10 rounded-[3rem] p-10 md:p-16 backdrop-blur-xl shadow-2xl">
              <div>
                <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center mb-10">
                  {activeService.icon === 'Code' && <Code className="w-8 h-8 text-[#B347FF]" />}
                  {activeService.icon === 'Terminal' && (
                    <Terminal className="w-8 h-8 text-[#47D1FF]" />
                  )}
                  {activeService.icon === 'Gem' && <Gem className="w-8 h-8 text-white" />}
                </div>
                <h3 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6 leading-tight">
                  {activeService.headline}
                </h3>
                <p className="text-xl text-white/60 mb-10 leading-relaxed font-light">
                  {activeService.description}
                </p>
                {activeService.cta && (
                  <button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl px-8 py-4 font-bold flex items-center gap-3 transition-colors group">
                    {activeService.cta.label}
                    {activeService.cta.icon === 'ArrowRight' && (
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    )}
                    {activeService.cta.icon === 'Github' && <Github className="w-5 h-5" />}
                  </button>
                )}
              </div>
              {activeService.media && (
                <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-black aspect-square lg:aspect-[4/3] relative shadow-2xl group">
                  <img
                    src={activeService.media.url}
                    alt={activeService.media.alt}
                    className="w-full h-full object-cover opacity-80 mix-blend-luminosity group-hover:mix-blend-normal group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0E] via-transparent to-transparent opacity-80" />
                </div>
              )}
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}

const ImageBrowserSection = ({ block }: { block: ImageBrowserBlock }) => (
  <section className="py-40 border-t border-white/5 bg-white/[0.02]">
    <Container>
      <div className="text-center max-w-4xl mx-auto mb-24">
        <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[0.9]">
          {block.title}
        </h2>
        <p className="text-xl md:text-2xl font-light text-white/50 leading-relaxed">
          {block.subtitle}
        </p>
      </div>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 max-w-6xl mx-auto">
        {block.images.map((img, i) => (
          <div
            key={i}
            className="break-inside-avoid group cursor-pointer relative overflow-hidden rounded-3xl border border-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0E] via-black/20 to-transparent opacity-80 z-10 transition-opacity group-hover:opacity-100" />
            <img
              src={img.url}
              alt={img.alt}
              className="w-full h-auto object-cover transform group-hover:scale-110 transition-transform duration-1000 mix-blend-luminosity group-hover:mix-blend-normal"
            />
            <div className="absolute bottom-0 left-0 right-0 p-8 z-20 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
              <h4 className="text-2xl font-bold mb-2">{img.alt}</h4>
              <p className="text-[#47D1FF] font-bold text-sm tracking-wider uppercase">
                {img.caption}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Container>
  </section>
)

const FormSection = ({ block }: { block: FormBlock }) => {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const formSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
  })

  type FormData = z.infer<typeof formSchema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async (formData: FormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitted(true)
  }

  return (
    <section className="py-40 border-t border-white/5">
      <Container className="max-w-4xl text-center">
        <div className="bg-gradient-to-b from-white/10 to-white/5 border border-white/20 p-16 md:p-24 rounded-[3rem] backdrop-blur-2xl shadow-[0_0_100px_rgba(255,255,255,0.05)]">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[0.9]">
            {block.title}
          </h2>
          <p className="text-xl md:text-2xl font-light text-white/60 mb-16 max-w-2xl mx-auto">
            Get the latest protocol upgrades and ecosystem news.
          </p>

          {isSubmitted ? (
            <div className="bg-[#47D1FF]/10 border border-[#47D1FF]/30 text-[#47D1FF] p-8 rounded-2xl font-bold text-xl">
              {block.successMessage || 'Success!'}
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto"
            >
              <input
                {...register('email')}
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-black/60 border border-white/20 rounded-2xl px-8 py-5 text-lg text-white focus:outline-none focus:border-[#B347FF] transition-colors"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-white text-black px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white/90 transition-colors flex items-center justify-center min-w-[160px] shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)]"
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : block.buttonLabel}
              </button>
            </form>
          )}
          {errors.email && (
            <p className="text-red-400 mt-4 text-left max-w-2xl mx-auto">{errors.email.message}</p>
          )}
        </div>
      </Container>
    </section>
  )
}

const TimelineSection = ({ block }: { block: TimelineBlock }) => {
  return (
    <section className="py-24 bg-[#050508] relative z-10 border-t border-white/5">
      <Container>
        <div className="text-center mb-24 relative">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
            {block.title || 'Roadmap'}
          </h2>
          {block.subtitle && (
            <p className="text-lg text-white/50 max-w-2xl mx-auto">{block.subtitle}</p>
          )}
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Vertical line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-x-1/2" />

          <div className="space-y-16">
            {block.steps.map((step, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col md:flex-row gap-8 md:gap-16 items-start md:items-center ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Connector point */}
                <div className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-[#B347FF] shadow-[0_0_15px_#B347FF] -translate-x-1/2 mt-2 md:mt-0 z-10" />

                <div
                  className={`pl-12 md:pl-0 md:w-1/2 ${idx % 2 === 0 ? 'md:pl-16' : 'md:pr-16 md:text-right'}`}
                >
                  {step.date && (
                    <div className="text-sm font-bold text-[#47D1FF] tracking-widest uppercase mb-2">
                      {step.date}
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-white/50 leading-relaxed">{step.description}</p>
                </div>
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

  // Dummy yield calculation
  const yieldAmount = Object.values(values).reduce((a, b) => a + b, 0) * 0.12

  return (
    <section className="py-24 bg-[#050508] relative z-10 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#B347FF]/10 via-transparent to-transparent pointer-events-none opacity-50" />
      <Container>
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#B347FF] to-[#47D1FF]">
              {block.title || 'Yield Calculator'}
            </h2>
            {block.subtitle && <p className="text-lg text-white/50 mb-12">{block.subtitle}</p>}

            <div className="space-y-8 p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
              {block.inputs.map((input) => (
                <div key={input.id}>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-white/70 uppercase tracking-wider">
                      {input.label}
                    </label>
                    <span className="text-xl font-bold text-white">
                      {values[input.id].toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={input.min || 0}
                    max={input.max || 100000}
                    step={input.step || 1}
                    value={values[input.id]}
                    onChange={(e) => handleSliderChange(input.id, Number(e.target.value))}
                    className="w-full accent-[#47D1FF] h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="text-center p-12 lg:p-16 rounded-3xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#B347FF]/20 to-[#47D1FF]/20 mix-blend-overlay" />
            <h3 className="text-lg font-bold text-white/50 tracking-widest uppercase mb-4 relative z-10">
              Estimated Annual Yield
            </h3>
            <div className="text-6xl md:text-7xl lg:text-8xl font-bold text-white relative z-10 tabular-nums tracking-tighter mb-8">
              ${yieldAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <Button className="w-full relative z-10 bg-gradient-to-r from-[#B347FF] to-[#47D1FF] hover:opacity-90 text-white font-bold h-14 rounded-xl text-lg shadow-[0_0_30px_rgba(179,71,255,0.3)] transition-all hover:shadow-[0_0_50px_rgba(71,209,255,0.5)] border-0">
              Start Earning
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}

const MetricsCarouselSection = ({ block }: { block: MetricsBlock }) => {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % block.metrics.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [block.metrics.length])

  return (
    <section className="py-16 border-y border-white/5 bg-[#050508]/80 backdrop-blur-xl relative z-10 overflow-hidden">
      <Container>
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-2xl h-48 flex items-center justify-center">
            {block.metrics.map((metric, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${
                  activeIndex === idx
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <div className="text-6xl md:text-7xl font-bold text-white tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white to-white/50">
                  {metric.value}
                </div>
                <div className="text-xl font-bold text-[#47D1FF] uppercase tracking-widest">
                  {metric.label}
                </div>
                {metric.description && (
                  <p className="mt-2 text-white/40 font-medium">{metric.description}</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-8">
            {block.metrics.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${activeIndex === idx ? 'bg-[#B347FF] scale-125 shadow-[0_0_10px_#B347FF]' : 'bg-white/20 hover:bg-white/40'}`}
                aria-label={`Go to metric ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

// --- Main Template ---

export function Web3Crypto({ data }: { data?: PageModel }) {
  if (!data) return null

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-[#B347FF] selection:text-white">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#B347FF]/20 blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-[#47D1FF]/10 blur-[150px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPPHBhdGggZD0iTTAgMGgxdjFIMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="fixed w-full z-50 bg-[#050508]/50 backdrop-blur-xl border-b border-white/5">
          <Container className="flex justify-between items-center h-20">
            <div className="font-bold text-2xl tracking-tight flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#B347FF] to-[#47D1FF] rounded flex items-center justify-center">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              {(data.title.split('-')[0] || '').trim()}
            </div>
            <div className="hidden lg:flex gap-8 text-sm font-semibold text-white/70">
              {data.navLinks.map((link) => (
                <a key={link.label} href={link.url} className="hover:text-white transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button className="hidden sm:block text-sm font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-2.5 rounded-lg transition-all backdrop-blur-sm">
                Connect Wallet
              </button>
              <MobileNav
                links={data.navLinks.map((l) => ({ label: l.label, href: l.url }))}
                overlayClassName="bg-[#050508]/95 backdrop-blur-2xl text-white border-l border-white/10"
                linkClassName="text-2xl font-bold tracking-tight text-white hover:text-[#47D1FF]"
                iconClassName="w-6 h-6 text-white"
              />
            </div>
          </Container>
        </nav>

        {/* Dynamic Blocks */}
        {data.blocks.map((block, index) => {
          switch (block._type) {
            case 'hero':
              return <HeroSection key={index} block={block as HeroBlock} />
            case 'metrics':
              return <MetricsCarouselSection key={index} block={block as MetricsBlock} />
            case 'feature_grid':
              return <FeaturesSection key={index} block={block as FeatureGridBlock} />
            case 'timeline':
              return <TimelineSection key={index} block={block as TimelineBlock} />
            case 'service_selector':
              return <ServiceSelectorSection key={index} block={block as ServiceSelectorBlock} />
            case 'calculator':
              return <CalculatorSection key={index} block={block as CalculatorBlock} />
            case 'image_browser':
              return <ImageBrowserSection key={index} block={block as ImageBrowserBlock} />
            case 'form':
              return <FormSection key={index} block={block as FormBlock} />
            default:
              return null
          }
        })}

        {/* Footer */}
        <footer className="py-16 border-t border-white/5 text-sm text-white/40">
          <Container className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3 font-bold text-white/80 text-xl tracking-tighter">
              <Cpu className="w-6 h-6" />
              {(data.title.split('-')[0] || '').trim()}
            </div>
            <div className="flex gap-8 font-semibold tracking-wider uppercase text-xs">
              <a href="#" className="hover:text-white transition-colors">
                Twitter
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Discord
              </a>
              <a href="#" className="hover:text-white transition-colors">
                GitHub
              </a>
            </div>
            <div className="font-semibold text-xs tracking-wider uppercase">
              © 2026 {(data.title.split('-')[0] || '').trim()}.
            </div>
          </Container>
        </footer>
      </div>
    </div>
  )
}
