import {
  ArrowRight,
  Phone,
  Key,
  Globe,
  Shield,
  MapPin,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
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
  TestimonialBlock,
  FormBlock,
  ImageBrowserBlock,
  HotspotViewerBlock,
  FloatingDockBlock,
  ServiceSelectorBlock,
} from '@project/db/src/content'

// --- Block Components ---

const HeroSection = ({ block }: { block: HeroBlock }) => {
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0)
  const heroStates = block.interactionType === 'carousel' && block.states ? block.states : null
  const currentState = heroStates ? (heroStates[currentHeroSlide] ?? heroStates[0]) : null

  useEffect(() => {
    if (!heroStates) return
    const interval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroStates.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [heroStates])

  return (
    <main className="relative pt-24 min-h-screen flex items-center overflow-hidden">
      {heroStates ? (
        // Carousel Mode
        <>
          {heroStates.map((state, i) => (
            <div
              key={i}
              className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${currentHeroSlide === i ? 'opacity-100' : 'opacity-0'}`}
            >
              <img
                src={state.media.url}
                alt={state.media.alt}
                className="w-full h-full object-cover transform scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/20" />
            </div>
          ))}

          <Container className="relative z-10 py-32 w-full">
            <div className="max-w-3xl text-white">
              {block.badges && block.badges.length > 0 && (
                <div className="font-sans text-xs tracking-[0.3em] uppercase mb-8 text-[#D4AF37] flex items-center gap-4">
                  <div className="w-12 h-[1px] bg-[#D4AF37]" />
                  {block.badges[0]}
                </div>
              )}

              <div className="min-h-[200px] mb-12">
                <h1
                  className="text-6xl sm:text-8xl md:text-[9rem] lg:text-[10rem] font-light tracking-tighter leading-[0.85] mb-10"
                  dangerouslySetInnerHTML={{
                    __html: (currentState?.headline || '').replace('\n', '<br />\n'),
                  }}
                />
                <p className="text-2xl md:text-4xl text-[#D4AF37] font-light max-w-3xl leading-relaxed">
                  {currentState?.subheadline}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 font-sans">
                {currentState?.ctas &&
                  currentState.ctas.map((cta, i) =>
                    cta.variant === 'primary' ? (
                      <button
                        key={i}
                        className="bg-[#D4AF37] text-white px-10 py-5 text-sm uppercase tracking-[0.2em] font-bold hover:bg-white hover:text-[#1C1C1C] transition-colors duration-500 flex items-center justify-center gap-3 group"
                      >
                        {cta.label}
                        {cta.icon === 'ArrowRight' && (
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        )}
                      </button>
                    ) : (
                      <button
                        key={i}
                        className="bg-transparent border border-white/30 text-white px-10 py-5 text-sm uppercase tracking-[0.2em] font-bold hover:bg-white hover:text-[#1C1C1C] transition-colors duration-500 flex items-center justify-center gap-3"
                      >
                        {cta.icon === 'Phone' && <Phone className="w-4 h-4" />}
                        {cta.label}
                      </button>
                    ),
                  )}
              </div>
            </div>
          </Container>

          {/* Carousel Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/40 backdrop-blur-sm border-t border-white/10">
            <Container className="flex items-center">
              {heroStates.map((state, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentHeroSlide(i)}
                  className={`flex-1 py-6 px-4 font-sans text-xs tracking-[0.2em] uppercase font-bold transition-all border-t-2 text-left ${currentHeroSlide === i ? 'text-[#D4AF37] border-[#D4AF37] bg-white/5' : 'text-white/50 border-transparent hover:text-white hover:bg-white/5'}`}
                >
                  <span className="hidden md:inline">0{i + 1} — </span>
                  {state.label}
                </button>
              ))}
            </Container>
          </div>
        </>
      ) : (
        // Static Mode (Fallback)
        <>
          <div className="absolute inset-0 z-0">
            {block.media && (
              <img
                src={block.media.url}
                alt={block.media.alt}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          </div>

          <Container className="relative z-10 py-32">
            <div className="max-w-3xl text-white">
              {block.badges && block.badges.length > 0 && (
                <div className="font-sans text-xs tracking-[0.3em] uppercase mb-8 text-[#D4AF37] flex items-center gap-4">
                  <div className="w-12 h-[1px] bg-[#D4AF37]" />
                  {block.badges[0]}
                </div>
              )}

              <h1
                className="text-6xl sm:text-8xl md:text-[9rem] lg:text-[10rem] font-light tracking-tighter leading-[0.85] mb-10"
                dangerouslySetInnerHTML={{ __html: block.headline.replace('\n', '<br />\n') }}
              />

              <p className="text-2xl md:text-4xl text-white/80 font-light mb-16 max-w-3xl leading-relaxed">
                {block.subheadline}
              </p>

              <div className="flex flex-col sm:flex-row gap-6 font-sans">
                {block.ctas &&
                  block.ctas.map((cta, i) =>
                    cta.variant === 'primary' ? (
                      <button
                        key={i}
                        className="bg-[#D4AF37] text-white px-10 py-5 text-sm uppercase tracking-[0.2em] font-bold hover:bg-white hover:text-[#1C1C1C] transition-colors duration-500 flex items-center justify-center gap-3 group"
                      >
                        {cta.label}
                        {cta.icon === 'ArrowRight' && (
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        )}
                      </button>
                    ) : (
                      <button
                        key={i}
                        className="bg-transparent border border-white/30 text-white px-10 py-5 text-sm uppercase tracking-[0.2em] font-bold hover:bg-white hover:text-[#1C1C1C] transition-colors duration-500 flex items-center justify-center gap-3"
                      >
                        {cta.icon === 'Phone' && <Phone className="w-4 h-4" />}
                        {cta.label}
                      </button>
                    ),
                  )}
              </div>
            </div>
          </Container>
        </>
      )}
    </main>
  )
}

const BenefitsSection = ({ block }: { block: FeatureGridBlock }) => (
  <section className="py-32 md:py-48 bg-white">
    <Container>
      <div className="text-center max-w-4xl mx-auto mb-24">
        <h2 className="text-5xl md:text-7xl lg:text-[6.5rem] font-light mb-8 tracking-tighter leading-[0.9] text-[#1C1C1C]">
          {block.title}
        </h2>
        <p className="text-xl md:text-2xl text-[#1C1C1C]/60 font-sans font-light leading-relaxed">
          {block.subtitle}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-12 lg:gap-24">
        {block.features.map((feature, i) => (
          <div key={i} className="text-center group">
            <div className="w-20 h-20 mx-auto border border-[#D4AF37]/30 rounded-full flex items-center justify-center mb-8 group-hover:bg-[#D4AF37] transition-colors duration-500">
              {feature.icon === 'Key' && (
                <Key className="w-8 h-8 text-[#D4AF37] group-hover:text-white transition-colors duration-500" />
              )}
              {feature.icon === 'Globe' && (
                <Globe className="w-8 h-8 text-[#D4AF37] group-hover:text-white transition-colors duration-500" />
              )}
              {feature.icon === 'Shield' && (
                <Shield className="w-8 h-8 text-[#D4AF37] group-hover:text-white transition-colors duration-500" />
              )}
            </div>
            <h3 className="text-2xl font-light mb-4">{feature.title}</h3>
            <p className="text-[#1C1C1C]/60 font-sans font-light leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </Container>
  </section>
)

const VisionSection = ({ block }: { block: TextMediaBlock }) => (
  <section className="py-32 md:py-48 bg-[#FDFBF7]">
    <Container>
      <div
        className={`flex flex-col lg:flex-row items-center gap-16 lg:gap-32 ${block.layout === 'media-right' ? '' : 'lg:flex-row-reverse'}`}
      >
        <div className="flex-1 space-y-10">
          <div className="font-sans text-xs tracking-[0.3em] uppercase text-[#D4AF37] flex items-center gap-4">
            <div className="w-16 h-[1px] bg-[#D4AF37]" />
            Our Vision
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-[6.5rem] font-light leading-[0.9] tracking-tighter text-[#1C1C1C]">
            {block.headline}
          </h2>
          <p className="text-xl md:text-2xl text-[#1C1C1C]/60 font-sans font-light leading-relaxed">
            {block.body}
          </p>
          <div className="pt-4">
            <button className="font-sans text-xs tracking-[0.2em] uppercase font-bold text-[#1C1C1C] border-b border-[#1C1C1C] pb-1 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors duration-300">
              Read our story
            </button>
          </div>
        </div>

        {block.media && (
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 bg-[#D4AF37] transform translate-x-4 translate-y-4" />
            <img
              src={block.media.url}
              alt={block.media.alt}
              className="relative z-10 w-full h-[600px] object-cover grayscale hover:grayscale-0 transition-all duration-1000"
            />
          </div>
        )}
      </div>
    </Container>
  </section>
)

const PropertiesSection = ({ block }: { block: ImageBrowserBlock }) => (
  <section id="properties" className="py-32 md:py-48 bg-[#1C1C1C] text-white overflow-hidden">
    <Container>
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
        <div className="max-w-4xl">
          <div className="font-sans text-xs tracking-[0.3em] uppercase text-[#D4AF37] flex items-center gap-4 mb-8">
            <div className="w-16 h-[1px] bg-[#D4AF37]" />
            Collection
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-[7rem] font-light tracking-tighter leading-[0.9]">
            {block.title}
          </h2>
          <p className="text-white/60 font-sans font-light mt-6 text-xl">{block.subtitle}</p>
        </div>
        <div className="flex gap-4">
          <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-[#D4AF37] hover:border-[#D4AF37] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-[#D4AF37] hover:border-[#D4AF37] transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Featured Image */}
      {block.images[0] && (
        <div className="mb-8 relative aspect-[21/9] bg-zinc-900 overflow-hidden group cursor-pointer">
          <img
            src={block.images[0].url}
            alt={block.images[0].alt}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 opacity-90 group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-12 left-12">
            <h3 className="text-5xl md:text-6xl font-light mb-4">{block.images[0].alt}</h3>
            <p className="font-sans text-[#D4AF37] tracking-widest uppercase font-bold text-sm md:text-base">
              {block.images[0].caption}
            </p>
          </div>
        </div>
      )}

      {/* Thumbnail Rail */}
      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
        {block.images.slice(1).map((img, i) => (
          <div key={i} className="min-w-[300px] w-[300px] cursor-pointer group">
            <div className="aspect-[4/3] bg-zinc-900 overflow-hidden mb-4 relative">
              <img
                src={img.url}
                alt={img.alt}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-100 grayscale group-hover:grayscale-0"
              />
            </div>
            <h4 className="text-xl font-light mb-1">{img.alt}</h4>
            <p className="font-sans text-[#D4AF37] tracking-widest uppercase font-bold text-xs">
              {img.caption}
            </p>
          </div>
        ))}
      </div>
    </Container>
  </section>
)

const TestimonialSection = ({ block }: { block: TestimonialBlock }) => {
  const testimonial = block.testimonials?.[0]
  if (!testimonial) return null
  return (
    <section className="py-32 md:py-48 bg-white">
      <Container className="max-w-5xl text-center">
        <div className="w-16 h-16 mx-auto border border-[#D4AF37]/30 rounded-full flex items-center justify-center mb-16">
          <span className="text-[#D4AF37] font-serif italic text-6xl leading-none mt-4">
            &rdquo;
          </span>
        </div>
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-light leading-[1.2] tracking-tighter text-[#1C1C1C] mb-20 italic">
          &ldquo;{testimonial.quote}&rdquo;
        </h2>
        <div className="font-sans">
          <div className="text-sm font-bold tracking-[0.2em] uppercase text-[#1C1C1C] mb-2">
            {testimonial.author}
          </div>
          <div className="text-xs tracking-[0.1em] uppercase text-[#1C1C1C]/50">
            {testimonial.role} &bull; {testimonial.metrics}
          </div>
        </div>
      </Container>
    </section>
  )
}

const ContactSection = ({ block }: { block: FormBlock }) => {
  const [isSubmitted, setIsSubmitted] = useState(false)

  const formSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
    phone: z.string().min(10, 'Please enter a valid phone number.'),
  })

  type FormData = z.infer<typeof formSchema>

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
    <section id="contact" className="py-32 md:py-48 bg-[#FDFBF7] border-t border-[#1C1C1C]/10">
      <Container className="max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-32 items-center">
          <div>
            <h2 className="text-5xl md:text-7xl lg:text-[7rem] font-light mb-10 tracking-tighter leading-[0.9] text-[#1C1C1C]">
              {block.title}
            </h2>
            <p className="text-xl md:text-2xl text-[#1C1C1C]/60 font-sans font-light leading-relaxed mb-16 max-w-xl">
              Connect with a dedicated advisor to discuss your real estate portfolio, off-market
              opportunities, or representation.
            </p>
            <div className="space-y-6 font-sans text-sm tracking-widest uppercase">
              <div className="flex items-center gap-4 text-[#1C1C1C]">
                <div className="w-10 h-10 border border-[#1C1C1C]/20 rounded-full flex items-center justify-center">
                  <Phone className="w-4 h-4 text-[#D4AF37]" />
                </div>
                +1 (800) 555-0199
              </div>
              <div className="flex items-center gap-4 text-[#1C1C1C]">
                <div className="w-10 h-10 border border-[#1C1C1C]/20 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                </div>
                Beverly Hills, CA
              </div>
            </div>
          </div>

          <div className="bg-white p-10 shadow-2xl">
            {isSubmitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto border border-[#D4AF37] rounded-full flex items-center justify-center mb-6">
                  <Check className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <h3 className="text-2xl font-light mb-4">
                  {block.successMessage || 'Message Sent'}
                </h3>
                <p className="font-sans text-sm text-[#1C1C1C]/60 leading-relaxed">
                  Our advisory team will contact you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 font-sans">
                <div>
                  <label className="block text-xs font-bold tracking-[0.2em] uppercase text-[#1C1C1C] mb-3">
                    Email Address
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full bg-transparent border-b border-[#1C1C1C]/20 text-[#1C1C1C] px-0 py-3 focus:outline-none focus:border-[#D4AF37] transition-colors"
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-2">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-[0.2em] uppercase text-[#1C1C1C] mb-3">
                    Phone Number
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="w-full bg-transparent border-b border-[#1C1C1C]/20 text-[#1C1C1C] px-0 py-3 focus:outline-none focus:border-[#D4AF37] transition-colors"
                    disabled={isSubmitting}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-2">{errors.phone.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1C1C1C] text-white px-8 py-5 text-sm uppercase tracking-[0.2em] font-bold hover:bg-[#D4AF37] transition-colors duration-500 flex items-center justify-center gap-2 mt-8"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {block.buttonLabel}
                </button>
              </form>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}

const HotspotViewerSection = ({ block }: { block: HotspotViewerBlock }) => {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null)

  return (
    <section className="py-24 bg-[#FAF9F6]">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-serif tracking-tight text-[#111] mb-6">
            {block.title || 'Interactive Property Map'}
          </h2>
          {block.subtitle && <p className="text-lg text-[#666]">{block.subtitle}</p>}
        </div>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl max-w-5xl mx-auto bg-white border border-[#E5E5E5]">
          <img
            src={block.baseImage.url}
            alt={block.baseImage.alt || 'Floorplan map'}
            className="w-full h-auto block"
          />

          {block.hotspots.map((hotspot) => (
            <div
              key={hotspot.id}
              className="absolute z-10"
              style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <button
                onMouseEnter={() => setActiveHotspot(hotspot.id)}
                onMouseLeave={() => setActiveHotspot(null)}
                className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${
                  activeHotspot === hotspot.id
                    ? 'bg-[#111] text-white scale-110 shadow-lg'
                    : 'bg-white text-[#111] shadow-md hover:scale-110'
                }`}
              >
                <Plus
                  className={`w-4 h-4 transition-transform duration-300 ${activeHotspot === hotspot.id ? 'rotate-45' : ''}`}
                />
                {activeHotspot !== hotspot.id && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-white opacity-50" />
                )}
              </button>

              {/* Tooltip */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-4 w-64 bg-[#111] text-white p-4 rounded-lg shadow-xl transition-all duration-300 origin-bottom pointer-events-none ${
                  activeHotspot === hotspot.id
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 translate-y-2'
                }`}
              >
                <h4 className="font-serif text-lg mb-1">{hotspot.label}</h4>
                <p className="text-sm text-white/70 leading-relaxed">{hotspot.description}</p>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#111]" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

const LocationSelectorSection = ({ block }: { block: ServiceSelectorBlock }) => {
  const [activeId, setActiveId] = useState(
    block.services.length > 0 ? block.services[0]?.id || null : null,
  )
  const activeLocation = block.services.find((s) => s.id === activeId)

  return (
    <section className="py-24 bg-white">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-serif tracking-tight text-[#111] mb-6">
            {block.title}
          </h2>
          <p className="text-lg text-[#666]">{block.subtitle}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {block.services.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setActiveId(loc.id)}
              className={`px-8 py-4 rounded-full text-sm font-medium tracking-wide transition-all border ${
                activeId === loc.id
                  ? 'bg-[#111] text-white border-[#111] shadow-lg shadow-black/10'
                  : 'bg-white text-[#666] border-[#E5E5E5] hover:border-[#111] hover:text-[#111]'
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>

        {activeLocation && (
          <div className="grid md:grid-cols-2 gap-12 items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#F5F5F5]">
              {activeLocation.media && (
                <img
                  src={activeLocation.media.url}
                  alt={activeLocation.media.alt || ''}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <div className="inline-flex items-center gap-2 text-[#999] text-sm uppercase tracking-widest font-semibold mb-6">
                <MapPin className="w-4 h-4" />
                {activeLocation.label}
              </div>
              <h3 className="text-3xl font-serif text-[#111] mb-6">{activeLocation.headline}</h3>
              <p className="text-[#666] leading-relaxed mb-8">{activeLocation.description}</p>
              {activeLocation.cta && (
                <Button className="bg-[#111] hover:bg-black text-white h-12 px-8 rounded-full">
                  {activeLocation.cta.label}
                </Button>
              )}
            </div>
          </div>
        )}
      </Container>
    </section>
  )
}

// --- Main Template ---

export function RealEstateLuxury({ data }: { data?: PageModel }) {
  if (!data) return null

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1C1C] font-serif selection:bg-[#D4AF37] selection:text-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-[#1C1C1C]/10 backdrop-blur-md border-b border-white/10 transition-all duration-300">
        <Container className="flex justify-between items-center h-24">
          <div className="font-sans font-bold text-2xl tracking-widest uppercase text-white">
            {(data.title.split('-')[0] || '').trim()}
          </div>
          <div className="hidden lg:flex gap-12 font-sans text-xs tracking-[0.2em] uppercase font-semibold text-white">
            {data.navLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                className="hover:text-[#D4AF37] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-6">
            <button className="hidden sm:flex items-center gap-2 font-sans text-xs tracking-[0.1em] uppercase font-bold text-[#1C1C1C] bg-white px-8 py-4 hover:bg-[#D4AF37] hover:text-white transition-colors duration-500">
              Client Portal
            </button>
            <MobileNav
              links={data.navLinks.map((l) => ({ label: l.label, href: l.url }))}
              overlayClassName="bg-[#1C1C1C] text-white border-l border-white/10"
              linkClassName="text-3xl font-serif tracking-tight text-white hover:text-[#D4AF37]"
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
          case 'feature_grid':
            return <BenefitsSection key={index} block={block as FeatureGridBlock} />
          case 'text_media':
            return <VisionSection key={index} block={block as TextMediaBlock} />
          case 'image_browser':
            return <PropertiesSection key={index} block={block as ImageBrowserBlock} />
          case 'testimonials':
            return <TestimonialSection key={index} block={block as TestimonialBlock} />
          case 'form':
            return <ContactSection key={index} block={block as FormBlock} />
          case 'hotspot_viewer':
            return <HotspotViewerSection key={index} block={block as HotspotViewerBlock} />
          case 'service_selector':
            return <LocationSelectorSection key={index} block={block as ServiceSelectorBlock} />
          default:
            return null
        }
      })}

      {/* Floating CTA Dock */}
      {(() => {
        const dockBlock = data.blocks.find((b) => b._type === 'floating_dock') as
          FloatingDockBlock | undefined
        if (!dockBlock) return null
        return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-700 delay-1000">
            <div className="bg-white/90 backdrop-blur-md shadow-2xl shadow-black/20 border border-[#E5E5E5] rounded-full p-2 flex items-center gap-2">
              {dockBlock.items.map((item, i) => (
                <Button
                  key={i}
                  variant={i === 0 ? 'default' : 'ghost'}
                  className={
                    i === 0
                      ? 'bg-[#111] text-white hover:bg-black rounded-full px-6 h-12 shadow-md'
                      : 'text-[#111] hover:bg-[#F5F5F5] rounded-full px-6 h-12 font-medium'
                  }
                >
                  {item.icon === 'Phone' && <Phone className="w-4 h-4 mr-2" />}
                  {item.icon === 'MapPin' && <MapPin className="w-4 h-4 mr-2" />}
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Footer */}
      <footer className="bg-[#1C1C1C] text-white py-24">
        <Container className="grid md:grid-cols-4 gap-12 font-sans">
          <div className="md:col-span-2">
            <div className="font-serif font-bold text-3xl tracking-widest uppercase mb-8 text-[#D4AF37]">
              {(data.title.split('-')[0] || '').trim()}
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-sm">
              Curating the world&apos;s most exclusive architectural masterpieces and legacy estates
              for discerning clientele.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-[0.2em] uppercase mb-6 text-white">
              Offices
            </h4>
            <ul className="space-y-4 text-sm text-white/50">
              <li>Los Angeles</li>
              <li>New York</li>
              <li>London</li>
              <li>Dubai</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-[0.2em] uppercase mb-6 text-white">Legal</h4>
            <ul className="space-y-4 text-sm text-white/50">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Disclosures</li>
            </ul>
          </div>
        </Container>
        <Container className="mt-24 pt-8 border-t border-white/10 text-center font-sans text-xs tracking-widest text-white/30 uppercase">
          © 2026 {(data.title.split('-')[0] || '').trim()}. All rights reserved.
        </Container>
      </footer>
    </div>
  )
}
