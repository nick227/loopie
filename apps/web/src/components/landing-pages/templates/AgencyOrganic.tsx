import {
  Play,
  ArrowRight,
  Minus,
  ArrowUpRight,
  Leaf,
  Coffee,
  Code,
  Layers,
  Quote,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { MobileNav } from '@/components/ui/MobileNav'
import { useState, useRef, useEffect } from 'react'
import {
  PageModel,
  HeroBlock,
  FeatureGridBlock,
  TextMediaBlock,
  BeforeAfterBlock,
  ImageBrowserBlock,
  TestimonialBlock,
  CaseStudyBrowserBlock,
  MarqueeBlock,
} from '@/types/content'
import { motion, AnimatePresence } from 'framer-motion'

// --- Block Components ---

const HeroSection = ({ block }: { block: HeroBlock }) => (
  <main className="pt-32 pb-48">
    <Container>
      <div className="max-w-6xl relative z-10">
        <h1
          className="text-6xl sm:text-[8rem] md:text-[10rem] font-medium leading-[0.85] mb-16 text-[#1A1813] tracking-tighter"
          dangerouslySetInnerHTML={{
            __html: block.headline
              .replace(
                'digital legacies',
                'digital <br className="hidden md:block" />\n<span className="italic text-[#8A9A74] font-light">legacies</span>',
              )
              .replace('with quiet', 'with <br className="hidden md:block" />\nquiet'),
          }}
        />

        <p className="text-2xl md:text-4xl text-[#5C584E] max-w-4xl font-sans font-light leading-relaxed mb-24">
          {block.subheadline}
        </p>

        <div className="flex items-center gap-6 font-sans">
          {block.ctas &&
            block.ctas.map((cta, i) => (
              <button
                key={i}
                className="bg-[#2C2921] hover:bg-[#8A9A74] text-[#FDFBF7] px-8 py-5 rounded-full flex items-center gap-3 transition-colors text-xs uppercase tracking-[0.2em] font-bold group"
              >
                {cta.label}
                {cta.icon === 'ArrowUpRight' && (
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                )}
              </button>
            ))}
        </div>
      </div>
    </Container>
  </main>
)

const BeforeAfterSection = ({ block }: { block: BeforeAfterBlock }) => {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [sliderWidth, setSliderWidth] = useState<number | null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = sliderRef.current
    if (!node) return
    const updateWidth = () => setSliderWidth(node.getBoundingClientRect().width)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const handleMove = (clientX: number) => {
    if (!sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <section className="pb-32 -mt-10 relative z-20">
      <Container>
        <div
          ref={sliderRef}
          className="aspect-[21/9] md:aspect-[21/10] bg-[#E8E6E1] rounded-[2rem] overflow-hidden relative group cursor-ew-resize select-none shadow-2xl"
          onMouseDown={handleMouseDown}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        >
          {/* After Image (Background) */}
          <div className="absolute inset-0">
            {block.afterImage?.url && (
              <img
                src={block.afterImage.url}
                alt={block.afterImage.alt}
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                draggable={false}
              />
            )}
            <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full font-sans text-xs uppercase tracking-[0.2em] font-bold shadow-lg">
              {block.afterLabel || 'After'}
            </div>
          </div>

          {/* Before Image (Foreground, clipped) */}
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPosition}%` }}>
            {block.beforeImage?.url && (
              <img
                src={block.beforeImage.url}
                alt={block.beforeImage.alt}
                className="w-[100vw] max-w-[calc(min(1280px,100vw)-4rem)] h-full object-cover"
                style={{ width: sliderWidth ?? '100%' }}
                draggable={false}
              />
            )}
            <div className="absolute top-6 left-6 bg-[#2C2921]/90 text-white backdrop-blur-md px-4 py-2 rounded-full font-sans text-xs uppercase tracking-[0.2em] font-bold shadow-lg">
              {block.beforeLabel || 'Before'}
            </div>
          </div>

          {/* Slider Handle */}
          <motion.div
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            animate={{ left: `calc(${sliderPosition}% - 2px)` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
              <ArrowRight className="w-5 h-5 text-[#2C2921]" />
            </div>
          </motion.div>
        </div>
        {block.title && (
          <p className="text-center mt-6 font-sans text-[#8A9A74] text-xs uppercase tracking-[0.2em] font-bold">
            {block.title} — Drag to compare
          </p>
        )}
      </Container>
    </section>
  )
}

const PhilosophySection = ({ block }: { block: TextMediaBlock }) => (
  <section className="py-32 md:py-48 border-y border-[#D1CEC7] bg-[#FDFBF7]">
    <Container>
      <div className="flex flex-col lg:flex-row justify-between items-start gap-16 max-w-7xl mx-auto">
        <h2
          className="text-5xl md:text-7xl lg:text-[6rem] font-medium tracking-tighter text-[#1A1813] lg:w-3/5 leading-[1]"
          dangerouslySetInnerHTML={{
            __html: block.headline.replace(
              'Great design is transparent.',
              '<br/><span className="italic text-[#8A9A74]">Great design is transparent.</span>',
            ),
          }}
        />

        <div className="lg:w-2/5 font-sans pt-4">
          <p className="text-[#5C584E] leading-relaxed text-xl md:text-2xl mb-12 font-light">
            {block.body}
          </p>
          <div className="w-16 h-[2px] bg-[#2C2921]"></div>
        </div>
      </div>
    </Container>
  </section>
)

const ImageBrowserSection = ({ block }: { block: ImageBrowserBlock }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === 0 ? block.images.length - 1 : lightboxIndex - 1)
    }
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % block.images.length)
    }
  }

  return (
    <section id="work" className="py-32 md:py-48 bg-[#F4F1ED]">
      <Container>
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
          <h2
            className="text-5xl md:text-7xl lg:text-[8rem] font-medium tracking-tighter text-[#1A1813] leading-[0.9]"
            dangerouslySetInnerHTML={{
              __html: (block.title || '').replace(
                'Works',
                '<br/><span className="italic text-[#8A9A74] font-light">Works</span>',
              ),
            }}
          />
          <a
            href="#"
            className="hidden md:flex items-center gap-2 font-sans text-sm uppercase tracking-[0.2em] font-bold text-[#2C2921] hover:text-[#8A9A74] transition-colors border-b-2 border-current pb-2 mb-4"
          >
            View Archive
          </a>
        </div>

        <div className="columns-1 md:columns-2 gap-8 space-y-8">
          {block.images.map((img, i) => (
            <div
              key={i}
              onClick={() => setLightboxIndex(i)}
              className="break-inside-avoid group cursor-pointer relative overflow-hidden rounded-2xl bg-[#E8E6E1]"
            >
              <img
                src={img.url}
                alt={img.alt}
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-1000 ease-out"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-0 left-0 right-0 p-8 translate-y-8 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                <span className="font-sans text-white text-xs uppercase tracking-widest font-bold">
                  {img.caption || img.alt}
                </span>
                <ArrowUpRight className="w-5 h-5 text-white" />
              </div>
            </div>
          ))}
        </div>
      </Container>

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setLightboxIndex(null)}
          >
            <button
              className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center text-white/50 hover:text-white transition-colors z-50 bg-white/10 rounded-full hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(null)
              }}
            >
              <X className="w-6 h-6" />
            </button>

            <button
              className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center text-white/50 hover:text-white transition-all z-50 bg-white/5 hover:bg-white/10 rounded-full hover:scale-110"
              onClick={handlePrev}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            <button
              className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center text-white/50 hover:text-white transition-all z-50 bg-white/5 hover:bg-white/10 rounded-full hover:scale-110"
              onClick={handleNext}
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            <motion.div
              className="max-w-7xl max-h-[85vh] w-full px-4 md:px-32 flex flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                key={lightboxIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                src={block.images[lightboxIndex].url}
                alt={block.images[lightboxIndex].alt}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl shadow-black/50"
              />
              {block.images[lightboxIndex].caption && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8 text-white/70 font-sans text-sm tracking-widest uppercase"
                >
                  {block.images[lightboxIndex].caption}
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

const TestimonialSection = ({ block }: { block: TestimonialBlock }) => {
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  if (!block.testimonials || block.testimonials.length === 0) return null

  return (
    <section className="py-32 bg-[#2C2921] text-[#FDFBF7]">
      <Container className="max-w-4xl text-center relative">
        <Quote className="w-16 h-16 text-[#8A9A74]/30 mx-auto mb-10" />
        <div className="relative h-[400px] md:h-[350px]">
          {block.testimonials.map((t, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-700 ${activeTestimonial === i ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            >
              <p className="text-3xl md:text-5xl lg:text-6xl font-medium leading-[1.2] mb-12 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="font-sans">
                <p className="text-base uppercase tracking-[0.2em] font-bold text-[#8A9A74] mb-2">
                  {t.author}
                </p>
                <p className="text-sm text-[#A8A499] uppercase tracking-[0.2em]">{t.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3 mt-12">
          {block.testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveTestimonial(i)}
              className={`w-2 h-2 rounded-full transition-all ${activeTestimonial === i ? 'bg-[#8A9A74] w-8' : 'bg-[#5C584E] hover:bg-[#8A9A74]/50'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </Container>
    </section>
  )
}

const PartnersSection = ({ block }: { block: FeatureGridBlock }) => (
  <section id="studio" className="py-32 md:py-48 bg-[#FDFBF7]">
    <Container>
      <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
        <h2
          className="text-5xl md:text-7xl lg:text-[8rem] font-medium tracking-tighter text-[#1A1813] leading-[0.9]"
          dangerouslySetInnerHTML={{
            __html: (block.title || '').replace(
              'Partners',
              '<br/><span className="italic text-[#8A9A74] font-light">Partners</span>',
            ),
          }}
        />
        <p className="font-sans text-[#5C584E] text-xl md:text-2xl max-w-md font-light leading-relaxed mb-4">
          {block.subtitle}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 md:gap-12">
        {block.features.map((partner, i) => (
          <div key={i} className="group cursor-pointer">
            <div className="aspect-[3/4] bg-[#E8E6E1] overflow-hidden rounded-xl mb-6">
              <img
                src={
                  [
                    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
                  ][i % 3]
                }
                alt={partner.title}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 grayscale hover:grayscale-0"
              />
            </div>
            <h3 className="text-xl font-medium text-[#2C2921] mb-1">{partner.title}</h3>
            <p className="font-sans text-sm text-[#8A9A74] uppercase tracking-widest font-bold">
              {partner.description}
            </p>
          </div>
        ))}
      </div>
    </Container>
  </section>
)

const ServicesSection = ({ block }: { block: FeatureGridBlock }) => (
  <section id="services" className="py-32 md:py-48 bg-[#F4F1EA] border-t border-[#D1CEC7]">
    <Container>
      <div className="grid lg:grid-cols-2 gap-24 lg:gap-32">
        <div>
          <h2
            className="text-5xl md:text-7xl lg:text-[7.5rem] font-medium mb-12 leading-[0.9] tracking-tighter text-[#1A1813]"
            dangerouslySetInnerHTML={{
              __html: (block.title || '')
                .replace('rooted in', 'rooted in <br/>')
                .replace(
                  'substance.',
                  '<span className="italic text-[#8A9A74] font-light">substance.</span>',
                ),
            }}
          />
          <p className="font-sans text-[#5C584E] leading-relaxed text-xl md:text-2xl max-w-xl font-light">
            {block.subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-16 font-sans">
          {block.features.map((service, i) => (
            <div key={i} className="group">
              <div className="w-12 h-12 rounded-full border border-[#D1CEC7] bg-white flex items-center justify-center mb-6 text-[#8A9A74] group-hover:bg-[#8A9A74] group-hover:border-[#8A9A74] group-hover:text-white transition-all duration-300">
                {service.icon === 'Coffee' && <Coffee className="w-5 h-5" />}
                {service.icon === 'Layers' && <Layers className="w-5 h-5" />}
                {service.icon === 'Code' && <Code className="w-5 h-5" />}
                {service.icon === 'ArrowUpRight' && <ArrowUpRight className="w-5 h-5" />}
              </div>
              <h3 className="text-xl font-bold text-[#2C2921] mb-3 tracking-tight">
                {service.title}
              </h3>
              <p className="text-sm text-[#5C584E] leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </Container>
  </section>
)

const CaseStudyBrowserSection = ({ block }: { block: CaseStudyBrowserBlock }) => {
  const [activeId, setActiveId] = useState(block.caseStudies[0]?.id)
  const activeStudy = block.caseStudies.find((c) => c.id === activeId) || block.caseStudies[0]

  return (
    <section className="py-32 bg-[#FDFBF7] text-[#1A1813] border-t border-[#E8E6E1]">
      <Container>
        <div className="mb-16 md:mb-24">
          <h2 className="text-4xl md:text-6xl font-medium tracking-tighter">
            {block.title || 'Selected Case Studies'}
          </h2>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-16 items-start">
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-4 lg:pb-0 hide-scrollbar border-b lg:border-b-0 lg:border-l border-[#E8E6E1] relative">
            {block.caseStudies.map((study) => (
              <button
                key={study.id}
                onClick={() => setActiveId(study.id)}
                className={`relative text-left px-6 py-4 whitespace-nowrap lg:whitespace-normal font-sans font-medium text-sm transition-all lg:-ml-[2px] ${
                  activeId === study.id ? 'text-[#8A9A74]' : 'text-[#A8A499] hover:text-[#5C584E]'
                }`}
              >
                {activeId === study.id && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 lg:bottom-auto lg:left-0 lg:top-0 w-full lg:w-[2px] h-[2px] lg:h-full bg-[#8A9A74]"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                {study.client}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStudy.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden mb-12 bg-[#E8E6E1]">
                <img
                  src={activeStudy.media.url}
                  alt={activeStudy.media.alt || activeStudy.client}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="grid md:grid-cols-[1fr_250px] gap-12">
                <div>
                  <h3 className="text-3xl md:text-5xl font-medium leading-[1.1] mb-8 tracking-tighter">
                    {activeStudy.headline}
                  </h3>
                  <Button className="bg-[#1A1813] hover:bg-[#8A9A74] text-[#FDFBF7] rounded-full px-8 h-14 font-sans text-xs uppercase tracking-[0.2em] font-bold transition-colors">
                    Read Case Study
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-6">
                  {activeStudy.results.map((result, i) => (
                    <div key={i} className="font-sans">
                      <p className="text-3xl md:text-4xl font-medium text-[#8A9A74] tracking-tighter mb-1">
                        {result.value}
                      </p>
                      <p className="text-xs uppercase tracking-[0.1em] text-[#5C584E] font-medium">
                        {result.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </Container>
    </section>
  )
}

const MarqueeSection = ({ block }: { block: MarqueeBlock }) => {
  const directionClass = block.direction === 'right' ? 'animate-marquee-reverse' : 'animate-marquee'

  // Duplicate items to ensure smooth infinite scrolling
  const items = [...block.items, ...block.items, ...block.items, ...block.items]

  return (
    <section className="py-16 md:py-24 bg-[#1A1813] text-[#FDFBF7] overflow-hidden border-y border-white/10">
      <div className="relative flex whitespace-nowrap">
        <div className={`flex items-center gap-16 md:gap-32 px-8 ${directionClass}`}>
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 flex-shrink-0">
              {item.logo && (
                <img
                  src={item.logo.url}
                  alt={item.logo.alt || ''}
                  className="h-8 md:h-12 w-auto opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
                />
              )}
              {item.text && (
                <span className="text-2xl md:text-4xl font-serif italic text-white/50 hover:text-white transition-colors">
                  {item.text}
                </span>
              )}
              <div className="w-2 h-2 rounded-full bg-[#8A9A74] mx-8 opacity-50" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// --- Main Template ---

export function AgencyOrganic({ data }: { data?: PageModel }) {
  if (!data) return null

  let featureGridCount = 0

  return (
    <div className="min-h-screen bg-[#F4F1ED] text-[#2C312E] font-serif selection:bg-[#B3C0A4] selection:text-white">
      {/* Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="py-8">
          <Container className="flex justify-between items-center">
            <div className="font-bold text-2xl tracking-tighter uppercase flex items-center gap-2">
              <Leaf className="w-5 h-5 text-[#8A9A74]" />
              {(data.title.split('-')[0] || '').trim()}
            </div>
            <div className="hidden md:flex gap-12 font-medium text-sm tracking-widest uppercase font-sans">
              {data.navLinks.map((link) => (
                <a key={link.label} href={link.url} className="relative group overflow-hidden pb-1">
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-full h-[1px] bg-current transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                </a>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button className="hidden sm:block text-sm uppercase tracking-widest font-bold border-b-2 border-transparent hover:border-[#2C312E] transition-all font-sans">
                Start a project
              </button>
              <MobileNav
                links={data.navLinks.map((l) => ({ label: l.label, href: l.url }))}
                overlayClassName="bg-[#F4F1ED] text-[#2C312E] border-l border-[#2C312E]/10"
                linkClassName="text-3xl font-serif tracking-tight text-[#2C312E]"
                iconClassName="w-6 h-6 text-[#2C312E]"
              />
            </div>
          </Container>
        </nav>

        {/* Dynamic Blocks */}
        {data.blocks.map((block, index) => {
          switch (block._type) {
            case 'hero':
              return <HeroSection key={index} block={block as HeroBlock} />
            case 'before_after':
              return <BeforeAfterSection key={index} block={block as BeforeAfterBlock} />
            case 'text_media':
              return <PhilosophySection key={index} block={block as TextMediaBlock} />
            case 'image_browser':
              return <ImageBrowserSection key={index} block={block as ImageBrowserBlock} />
            case 'testimonials':
              return <TestimonialSection key={index} block={block as TestimonialBlock} />
            case 'case_study_browser':
              return <CaseStudyBrowserSection key={index} block={block as CaseStudyBrowserBlock} />
            case 'marquee':
              return <MarqueeSection key={index} block={block as MarqueeBlock} />
            case 'feature_grid': {
              const isPartners = featureGridCount === 0
              featureGridCount++
              return isPartners ? (
                <PartnersSection key={index} block={block as FeatureGridBlock} />
              ) : (
                <ServicesSection key={index} block={block as FeatureGridBlock} />
              )
            }
            default:
              return null
          }
        })}

        {/* Footer */}
        <footer id="contact" className="py-24 font-sans border-t border-[#E8E6E1]">
          <Container className="flex flex-col md:flex-row justify-between items-start gap-16">
            <div className="max-w-xs">
              <div className="font-serif italic text-3xl mb-8 flex items-center gap-3">
                <Leaf className="w-6 h-6 text-[#8A9A74]" />
                {(data.title.split('-')[0] || '').trim()}
              </div>
              <p className="text-[#5C584E] text-sm leading-relaxed mb-8">
                Based in Portland, OR. Working with thoughtful brands worldwide to craft enduring
                digital experiences.
              </p>
              <p className="text-[#A8A499] text-xs uppercase tracking-[0.2em] font-bold">
                © 2026 Studio Botanica
              </p>
            </div>

            <div className="flex gap-20 text-sm">
              <div className="flex flex-col gap-5">
                <span className="uppercase tracking-[0.2em] text-xs font-bold text-[#8A9A74] mb-2">
                  Social
                </span>
                <a href="#" className="hover:text-[#8A9A74] transition-colors font-medium">
                  Instagram
                </a>
                <a href="#" className="hover:text-[#8A9A74] transition-colors font-medium">
                  Twitter
                </a>
                <a href="#" className="hover:text-[#8A9A74] transition-colors font-medium">
                  LinkedIn
                </a>
              </div>
              <div className="flex flex-col gap-5">
                <span className="uppercase tracking-[0.2em] text-xs font-bold text-[#8A9A74] mb-2">
                  Contact
                </span>
                <a href="#" className="hover:text-[#8A9A74] transition-colors font-medium">
                  hello@botanica.studio
                </a>
                <a href="#" className="hover:text-[#8A9A74] transition-colors font-medium">
                  +1 (555) 123-4567
                </a>
              </div>
            </div>
          </Container>
        </footer>
      </div>
    </div>
  )
}
