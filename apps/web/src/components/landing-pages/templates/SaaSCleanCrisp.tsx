import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Play,
  Zap,
  Shield,
  BarChart3,
  Menu,
  X,
  Github,
  Figma,
  Slack,
  Command,
  Globe,
  PlayCircle,
  Code,
  Server,
  ShieldCheck,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/layout/Container'
import { MobileNav } from '@/components/ui/MobileNav'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  PageModel,
  HeroBlock,
  LogoCloudBlock,
  MetricsBlock,
  FeatureGridBlock,
  FaqBlock,
  ServiceSelectorBlock,
  PricingBlock,
  ComparisonBlock,
  StickyMediaBlock,
} from '@/types/content'
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const formSchema = z.object({
  email: z.string().email('Please enter a valid work email.'),
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

  const onSubmit = async (formData: FormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitted(true)
  }

  return (
    <section className="pt-40 pb-32 overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-blue-100/60 via-purple-100/60 to-pink-100/60 blur-[120px] rounded-full pointer-events-none" />
      <Container className="text-center max-w-6xl mx-auto relative z-10">
        {block.badges && block.badges.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-200 text-sm font-medium text-zinc-600 mb-8 shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            {block.badges[0]}
          </div>
        )}
        <h1
          className="text-6xl sm:text-7xl md:text-[8rem] lg:text-[9rem] font-bold tracking-tighter text-zinc-900 mb-8 leading-[0.95]"
          dangerouslySetInnerHTML={{
            __html: block.headline.replace('\n', '<br className="hidden md:block" />'),
          }}
        />

        <p className="text-xl sm:text-2xl md:text-3xl text-zinc-500 mb-14 max-w-3xl mx-auto font-light leading-relaxed">
          {block.subheadline}
        </p>

        {/* Interactive Hero Decision Surface: Inline Form */}
        {block.interactionType === 'inline-form' ? (
          <div className="max-w-md mx-auto mb-10 relative">
            {isSubmitted ? (
              <div className="bg-white p-4 rounded-2xl shadow-lg shadow-zinc-900/5 border border-zinc-200 text-center animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h3 className="font-semibold text-zinc-900">Check your email</h3>
                <p className="text-zinc-500 text-sm">We sent you a login link.</p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="bg-white p-2 rounded-full shadow-lg shadow-zinc-900/5 border border-zinc-200 flex items-center"
              >
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Enter your work email"
                  className="flex-1 bg-transparent px-6 text-zinc-900 outline-none placeholder:text-zinc-400"
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-6 h-12 font-medium shrink-0 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {block.ctas?.[0]?.label || 'Get Started'}
                </Button>
              </form>
            )}
            {errors.email && (
              <p className="text-red-500 text-sm mt-3 font-medium text-center absolute w-full">
                {errors.email.message}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            {block.ctas &&
              block.ctas.map((cta, i) => (
                <Button
                  key={i}
                  size="lg"
                  variant={cta.variant === 'outline' ? 'outline' : 'default'}
                  className={`rounded-full px-8 h-12 text-base w-full sm:w-auto flex items-center justify-center gap-2 transition-all hover:scale-[1.02] ${cta.variant === 'primary' ? 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-xl shadow-zinc-900/10 group' : 'bg-white hover:bg-zinc-50 border-zinc-200'}`}
                >
                  {cta.icon === 'PlayCircle' && <PlayCircle className="w-4 h-4 text-zinc-500" />}
                  {cta.label}
                  {cta.icon === 'ArrowRight' && (
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  )}
                </Button>
              ))}
          </div>
        )}

        {/* Embedded Proof Strip */}
        {block.proof && (
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-zinc-500">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            {block.proof.rating && <span>{block.proof.rating}</span>}
            <span>·</span>
            <span>{block.proof.text}</span>
          </div>
        )}

        {/* Dashboard Preview Image */}
        {block.media && (
          <div className="mt-20 sm:mt-28 relative mx-auto max-w-6xl rounded-[2rem] border border-zinc-200/50 bg-white/50 p-2 shadow-[0_0_100px_rgba(0,0,0,0.1)] backdrop-blur-sm">
            <div className="rounded-[1.5rem] overflow-hidden border border-zinc-100 bg-zinc-50 aspect-[16/10] relative">
              <img
                src={block.media.url}
                alt={block.media.alt}
                className="w-full h-full object-cover opacity-90 mix-blend-luminosity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
            </div>
          </div>
        )}
      </Container>
    </section>
  )
}

const LogoCloudSection = ({ block }: { block: LogoCloudBlock }) => (
  <section className="py-32 border-b border-slate-200 bg-slate-50 relative z-20">
    <Container>
      <p className="text-center text-sm font-bold text-slate-400 mb-16 tracking-[0.2em] uppercase">
        {block.title}
      </p>
      <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale">
        {block.logos.map((logo, i) => (
          <div key={i} className="flex items-center gap-2 font-bold text-xl">
            {logo.icon === 'Github' && <Github className="w-6 h-6" />}
            {logo.icon === 'Figma' && <Figma className="w-6 h-6" />}
            {logo.icon === 'Slack' && <Slack className="w-6 h-6" />}
            {logo.icon === 'Command' && <Command className="w-6 h-6" />}
            {logo.icon === 'Globe' && <Globe className="w-6 h-6" />}
            {logo.name}
          </div>
        ))}
      </div>
    </Container>
  </section>
)

const MetricsSection = ({ block }: { block: MetricsBlock }) => (
  <section className="py-32 border-b border-slate-200 bg-white relative z-20">
    <Container>
      <div className="grid md:grid-cols-3 gap-16 text-center divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {block.metrics.map((metric, i) => (
          <div key={i} className="px-8 py-6">
            <div className="text-6xl md:text-8xl font-black text-blue-600 mb-6 tracking-tighter">
              {metric.value}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">{metric.label}</h3>
            <p className="text-slate-500 font-medium leading-relaxed text-lg">
              {metric.description}
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
    <section id="platform" className="py-32 sm:py-48 bg-white">
      <Container>
        <div className="text-center max-w-4xl mx-auto mb-24">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[0.9]">
            {block.title}
          </h2>
          <p className="text-xl md:text-2xl font-light text-zinc-500">{block.subtitle}</p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {block.services.map((service) => (
              <button
                key={service.id}
                onClick={() => setActiveServiceId(service.id)}
                className={`px-6 py-3 rounded-full font-semibold text-sm transition-all ${
                  activeServiceId === service.id
                    ? 'bg-zinc-900 text-white shadow-md'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                {service.label}
              </button>
            ))}
          </div>

          {activeService && (
            <div className="grid lg:grid-cols-2 gap-12 items-center bg-zinc-50 rounded-[2rem] p-8 md:p-12 border border-zinc-200">
              <div>
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-zinc-100 flex items-center justify-center mb-6 text-zinc-900">
                  {activeService.icon === 'Code' && <Code className="w-6 h-6" />}
                  {activeService.icon === 'Server' && <Server className="w-6 h-6" />}
                  {activeService.icon === 'ShieldCheck' && <ShieldCheck className="w-6 h-6" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tight mb-4">{activeService.headline}</h3>
                <p className="text-lg text-zinc-500 mb-8 leading-relaxed">
                  {activeService.description}
                </p>
                {activeService.cta && (
                  <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-6 flex items-center gap-2 group">
                    {activeService.cta.label}
                    {activeService.cta.icon === 'ArrowRight' && (
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    )}
                  </Button>
                )}
              </div>
              {activeService.media && (
                <div className="rounded-[1.5rem] overflow-hidden border border-zinc-200 bg-white aspect-square lg:aspect-video relative shadow-sm">
                  <img
                    src={activeService.media.url}
                    alt={activeService.media.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}

const FeatureGridSection = ({ block }: { block: FeatureGridBlock }) => (
  <section id="features" className="py-32 sm:py-48 bg-[#FAFAFA] border-t border-zinc-200/50">
    <Container>
      <div className="text-center max-w-4xl mx-auto mb-24">
        {block.title && (
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[0.9]">
            {block.title}
          </h2>
        )}
        {block.subtitle && (
          <p className="text-xl md:text-2xl font-light text-zinc-500">{block.subtitle}</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {block.features.map((feature, i) => (
          <div
            key={i}
            className="p-8 rounded-3xl bg-white border border-zinc-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
              {feature.icon === 'BarChart3' && (
                <BarChart3 className="w-6 h-6 text-zinc-600 group-hover:text-white transition-colors" />
              )}
              {feature.icon === 'Shield' && (
                <Shield className="w-6 h-6 text-zinc-600 group-hover:text-white transition-colors" />
              )}
              {feature.icon === 'Zap' && (
                <Zap className="w-6 h-6 text-zinc-600 group-hover:text-white transition-colors" />
              )}
            </div>
            <h3 className="text-xl font-semibold mb-3 tracking-tight">{feature.title}</h3>
            <p className="text-zinc-500 leading-relaxed text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
    </Container>
  </section>
)

const FaqSection = ({ block }: { block: FaqBlock }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-32 bg-[#FAFAFA]">
      <Container className="max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">
            {block.title || 'Frequently Asked Questions'}
          </h2>
        </div>
        <div className="space-y-4">
          {block.questions.map((q, i) => (
            <div
              key={i}
              className="border border-zinc-200 rounded-2xl bg-white overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
              >
                <span className="font-semibold text-lg text-zinc-900">{q.question}</span>
                {openIndex === i ? (
                  <ChevronUp className="w-5 h-5 text-zinc-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-400 shrink-0" />
                )}
              </button>
              <div
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === i ? 'max-h-48 pb-6 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-zinc-500 font-medium leading-relaxed">{q.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

const PricingSection = ({ block }: { block: PricingBlock }) => {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section
      id="pricing"
      className="py-32 sm:py-48 bg-zinc-900 text-white relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/20 rounded-full blur-[160px] pointer-events-none" />
      <Container className="relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[0.9]">
            {block.title || 'Simple, transparent pricing'}
          </h2>
          <p className="text-xl md:text-2xl font-light text-zinc-400">{block.subtitle}</p>
        </div>

        {block.billingToggle && (
          <div className="flex items-center justify-center gap-4 mb-16">
            <span className={`text-sm font-semibold ${!isYearly ? 'text-white' : 'text-zinc-500'}`}>
              {block.billingToggle.monthly}
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-14 h-8 rounded-full bg-zinc-800 border border-zinc-700 p-1 transition-colors hover:bg-zinc-700 focus:outline-none flex items-center"
            >
              <motion.div
                layout
                className="w-6 h-6 rounded-full bg-blue-500 shadow-sm"
                animate={{ x: isYearly ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-semibold ${isYearly ? 'text-white' : 'text-zinc-500'}`}
              >
                {block.billingToggle.yearly}
              </span>
              {block.billingToggle.discount && (
                <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-2 py-1 rounded-full">
                  {block.billingToggle.discount}
                </span>
              )}
            </div>
          </div>
        )}

        <div
          className={`grid md:grid-cols-${Math.min(block.plans.length, 3)} gap-8 max-w-5xl mx-auto items-center`}
        >
          {block.plans.map((plan, idx) => {
            const isPopular = plan.isPopular
            const price = isYearly && plan.price.yearly ? plan.price.yearly : plan.price.monthly

            return (
              <div
                key={idx}
                className={`p-8 md:p-10 rounded-[2rem] relative transition-transform ${isPopular ? 'bg-white text-zinc-900 shadow-2xl md:scale-[1.02] z-10' : 'bg-zinc-800/50 border border-zinc-700/50 backdrop-blur-sm'}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 right-8 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Popular
                  </div>
                )}
                <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                <p className={`${isPopular ? 'text-zinc-500' : 'text-zinc-400'} mb-6 text-sm h-10`}>
                  {plan.description}
                </p>
                <div className="mb-8 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-bold tracking-tighter">{price}</span>
                  {price !== 'Custom' && (
                    <span
                      className={`${isPopular ? 'text-zinc-400' : 'text-zinc-500'} font-medium`}
                    >
                      /month
                    </span>
                  )}
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2
                        className={`w-5 h-5 flex-shrink-0 ${isPopular ? 'text-blue-600' : 'text-zinc-500'}`}
                      />
                      <span
                        className={`text-sm font-medium ${isPopular ? 'text-zinc-700' : 'text-zinc-300'}`}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full rounded-xl h-12 text-base font-semibold transition-all ${isPopular ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20' : 'bg-zinc-700 hover:bg-zinc-600 text-white'}`}
                >
                  {plan.cta.label}
                </Button>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

const ComparisonSection = ({ block }: { block: ComparisonBlock }) => {
  return (
    <section id="comparison" className="py-32 bg-white border-t border-zinc-200/50">
      <Container className="max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">
            {block.title || 'Us vs Them'}
          </h2>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 bg-zinc-50 border-b border-zinc-200">
            <div className="p-6 font-semibold text-zinc-900">Feature</div>
            <div className="p-6 font-bold text-blue-600 border-l border-zinc-200 text-center">
              AcmeCorp
            </div>
            <div className="p-6 font-semibold text-zinc-500 border-l border-zinc-200 text-center">
              The Alternative
            </div>
          </div>
          <div className="divide-y divide-zinc-100">
            {block.items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="grid grid-cols-3 hover:bg-zinc-50/50 transition-colors group"
              >
                <div className="p-6 text-zinc-700 font-medium group-hover:text-blue-600 transition-colors">
                  {item.feature}
                </div>
                <div className="p-6 border-l border-zinc-100 flex items-center justify-center bg-blue-50/10 group-hover:bg-blue-50/20 transition-colors">
                  {typeof item.us === 'boolean' ? (
                    item.us ? (
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    ) : (
                      <X className="w-5 h-5 text-zinc-300" />
                    )
                  ) : (
                    <span className="text-sm font-semibold text-zinc-900">{item.us}</span>
                  )}
                </div>
                <div className="p-6 border-l border-zinc-100 flex items-center justify-center group-hover:bg-zinc-100/50 transition-colors">
                  {typeof item.them === 'boolean' ? (
                    item.them ? (
                      <CheckCircle2 className="w-5 h-5 text-zinc-400" />
                    ) : (
                      <X className="w-5 h-5 text-zinc-300" />
                    )
                  ) : (
                    <span className="text-sm text-zinc-500">{item.them}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

const StickyMediaSection = ({ block }: { block: StickyMediaBlock }) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'))
            setActiveIndex(index)
          }
        })
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 },
    )

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <section className="py-32 bg-[#FAFAFA] relative">
      <Container>
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-32 py-32">
            {block.sections.map((section, idx) => (
              <div
                key={section.id}
                ref={(el) => (sectionRefs.current[idx] = el)}
                data-index={idx}
                className={`transition-opacity duration-500 ${activeIndex === idx ? 'opacity-100' : 'opacity-30'}`}
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-200/50 flex items-center justify-center mb-6 text-xl font-bold text-zinc-400">
                  {idx + 1}
                </div>
                <h3 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4 text-zinc-900">
                  {section.headline}
                </h3>
                <p className="text-xl text-zinc-500 leading-relaxed font-light">{section.body}</p>
              </div>
            ))}
          </div>

          <div className="sticky top-32 hidden lg:block h-[600px] w-full rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-200/50 shadow-2xl transition-all duration-700 relative">
            <AnimatePresence mode="popLayout">
              {block.sections.map(
                (section, idx) =>
                  activeIndex === idx && (
                    <motion.img
                      key={section.id}
                      src={section.media.url}
                      alt={section.media.alt || section.headline}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ),
              )}
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  )
}

// --- Main Template ---

export function SaaSCleanCrisp({ data }: { data?: PageModel }) {
  if (!data) return null

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200/50">
        <Container className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              {(data.title.split('-')[0] || '').trim()}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500">
            {data.navLinks.map((link) => (
              <a key={link.label} href={link.url} className="hover:text-zinc-900 transition-colors">
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button className="hidden sm:block text-sm font-medium hover:text-zinc-600 transition-colors">
              Log in
            </button>
            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-5 text-sm h-9 shadow-sm hover:shadow-md transition-all">
              Get Started
            </Button>
            <MobileNav
              links={data.navLinks.map((l) => ({ label: l.label, href: l.url }))}
              overlayClassName="bg-white text-zinc-900 border-l border-zinc-200"
              linkClassName="text-2xl font-bold tracking-tight text-zinc-900"
              iconClassName="w-6 h-6 text-zinc-900"
            />
          </div>
        </Container>
      </nav>

      {/* Dynamic Blocks */}
      {data.blocks.map((block, index) => {
        switch (block._type) {
          case 'hero':
            return <HeroSection key={index} block={block as HeroBlock} />
          case 'logo_cloud':
            return <LogoCloudSection key={index} block={block as LogoCloudBlock} />
          case 'metrics':
            return <MetricsSection key={index} block={block as MetricsBlock} />
          case 'service_selector':
            return <ServiceSelectorSection key={index} block={block as ServiceSelectorBlock} />
          case 'feature_grid':
            return <FeatureGridSection key={index} block={block as FeatureGridBlock} />
          case 'faq':
            return <FaqSection key={index} block={block as FaqBlock} />
          case 'pricing':
            return <PricingSection key={index} block={block as PricingBlock} />
          case 'comparison':
            return <ComparisonSection key={index} block={block as ComparisonBlock} />
          case 'sticky_media':
            return <StickyMediaSection key={index} block={block as StickyMediaBlock} />
          default:
            return null
        }
      })}

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-200/50 bg-white">
        <Container className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-zinc-900 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold tracking-tight">
              {(data.title.split('-')[0] || '').trim()}
            </span>
          </div>
          <p className="text-sm text-zinc-400 font-medium">
            © 2026 {(data.title.split('-')[0] || '').trim()}. All rights reserved.
          </p>
        </Container>
      </footer>
    </div>
  )
}
