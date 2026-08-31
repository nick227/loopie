import { useState, useRef, useEffect } from 'react'
import {
  ShoppingBag,
  Star,
  ArrowRight,
  Play,
  Check,
  ChevronLeft,
  ChevronRight,
  Camera,
} from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { MobileNav } from '@/components/ui/MobileNav'
import {
  PageModel,
  HeroBlock,
  FeatureGridBlock,
  BeforeAfterBlock,
  ImageBrowserBlock,
  TestimonialBlock,
  ProductBrowserBlock,
  CalculatorBlock,
} from '@/types/content'
import { X } from 'lucide-react'

// --- Block Components ---

const HeroSection = ({ block }: { block: HeroBlock }) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const activeHeroState =
    block.interactionType === 'carousel' && block.states ? block.states[currentSlide] : null

  return (
    <main className="pt-12 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
      <Container className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center relative">
        {/* Product Details */}
        <div className="order-2 lg:order-1 relative z-20">
          {block.badges && block.badges.length > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-pink-600 font-bold text-xs uppercase tracking-widest mb-8 shadow-sm border border-pink-100 transform hover:scale-105 transition-transform">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              {block.badges[0]}
            </div>
          )}

          <div className="relative min-h-[300px]">
            <div className="absolute inset-0 transition-opacity duration-500 opacity-100">
              <h1
                className="text-7xl lg:text-[6.5rem] font-black tracking-tighter text-slate-900 mb-6 leading-[0.95]"
                dangerouslySetInnerHTML={{
                  __html:
                    (activeHeroState ? activeHeroState.headline : block.headline).replace(
                      '\n',
                      '<br />\n<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">',
                    ) + '</span>',
                }}
              />
              <p className="text-2xl text-slate-600 mb-10 max-w-lg leading-relaxed font-medium">
                {activeHeroState ? activeHeroState.subheadline : block.subheadline}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            {(activeHeroState?.ctas || block.ctas)?.map((cta, i) =>
              cta.variant === 'primary' ? (
                <Button
                  key={i}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full px-10 h-16 text-xl font-bold shadow-xl shadow-indigo-600/20 group transition-all hover:shadow-indigo-600/40 hover:scale-[1.02]"
                >
                  {cta.label}
                  {cta.icon === 'ArrowRight' && (
                    <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
                  )}
                </Button>
              ) : (
                <Button
                  key={i}
                  variant="outline"
                  className="rounded-full px-10 h-16 text-xl font-bold bg-white/50 hover:bg-white border-2 border-slate-200 flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm"
                >
                  {cta.icon === 'Play' && <Play className="w-6 h-6" />}
                  {cta.label}
                </Button>
              ),
            )}
          </div>

          {/* Carousel Controls */}
          {block.interactionType === 'carousel' && block.states && (
            <div className="flex items-center gap-6 mt-12 bg-white/60 backdrop-blur-md p-4 rounded-3xl inline-flex shadow-sm border border-white">
              {block.states.map((state, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`flex flex-col items-center gap-2 transition-all ${currentSlide === i ? 'scale-110' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                >
                  <div
                    className={`w-12 h-12 rounded-full border-4 shadow-md ${
                      i === 0
                        ? 'bg-black border-slate-800'
                        : i === 1
                          ? 'bg-white border-slate-100'
                          : 'bg-red-600 border-red-700'
                    } ${currentSlide === i ? 'ring-4 ring-purple-500/50 ring-offset-2 ring-offset-transparent' : ''}`}
                  />
                  <span className="text-xs font-bold text-slate-700">
                    {state.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Image Focus */}
        <div className="relative order-1 lg:order-2 group">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-pink-500/10 rounded-[3rem] transform -rotate-3 scale-105 transition-transform group-hover:rotate-0 group-hover:scale-100 duration-500" />
          <div className="relative bg-white rounded-[3rem] shadow-2xl overflow-hidden border-8 border-white aspect-square">
            {block.states ? (
              block.states.map((state, i) => (
                <img
                  key={i}
                  src={state.media?.url}
                  alt={state.media?.alt}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out ${currentSlide === i ? 'opacity-100 scale-105 group-hover:scale-110' : 'opacity-0 scale-95'}`}
                />
              ))
            ) : (
              <img
                src={block.media?.url}
                alt={block.media?.alt}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent mix-blend-overlay pointer-events-none" />

            {/* Floating Tags */}
            <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl font-bold text-sm text-indigo-600 border border-white/50 transform -rotate-2">
              {activeHeroState ? activeHeroState.label : 'Space Gray'}
            </div>
            <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex items-center gap-1 font-bold text-sm text-slate-800 border border-white/50">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              4.9/5 (2k+ Reviews)
            </div>
          </div>
        </div>
      </Container>
    </main>
  )
}

const FeatureGridSection = ({ block }: { block: FeatureGridBlock }) => {
  // If there are more than 3 features, we assume it's the "box contents" style
  const isBoxStyle = block.features.length > 3

  if (isBoxStyle) {
    return (
      <section className="py-32 bg-[#FAFAFA] border-y border-slate-100">
        <Container className="max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-20 text-center">
            {block.title}
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {block.features.map((item, i) => (
              <div key={i} className="flex flex-col items-center group">
                <div className="w-48 h-48 rounded-[2rem] overflow-hidden mb-8 border-8 border-white shadow-2xl shadow-slate-200/50 transform group-hover:-translate-y-4 group-hover:rotate-3 transition-all duration-500">
                  <img
                    src={
                      [
                        'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=400&q=80',
                        'https://images.unsplash.com/photo-1584824388151-2495d4d3cc85?auto=format&fit=crop&w=400&q=80',
                        'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=400&q=80',
                        'https://images.unsplash.com/photo-1508280756091-9bdd7ef1f463?auto=format&fit=crop&w=400&q=80',
                      ][i % 4]
                    }
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </h3>
              </div>
            ))}
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section className="py-24 bg-white/80 backdrop-blur-xl border-y border-white shadow-sm">
      <Container className="grid md:grid-cols-3 gap-10">
        {block.features.map((prop, i) => (
          <div
            key={i}
            className="bg-[#FAFAFA] p-10 rounded-[2.5rem] border border-slate-100 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2 transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-3xl bg-white shadow-md flex items-center justify-center mb-8 text-purple-600 transform -rotate-3">
              {prop.icon === 'Star' && <Star className="w-8 h-8" />}
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">{prop.title}</h3>
            <p className="text-lg text-slate-500 font-medium leading-relaxed">{prop.description}</p>
          </div>
        ))}
      </Container>
    </section>
  )
}

const BeforeAfterSection = ({ block }: { block: BeforeAfterBlock }) => {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)

  const handleMove = (clientX: number) => {
    if (!sliderRef.current || !isDragging) return
    const rect = sliderRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setSliderPosition((x / rect.width) * 100)
  }

  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX)
  const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX)

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchend', handleMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [])

  return (
    <section className="py-32 overflow-hidden">
      <Container>
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-6">
            {block.title}
          </h2>
          <p className="text-slate-500 text-2xl font-medium">{block.subtitle}</p>
        </div>

        <div
          ref={sliderRef}
          className="relative h-[500px] md:h-[600px] rounded-[3rem] overflow-hidden cursor-ew-resize shadow-2xl border-8 border-white"
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
          onMouseLeave={() => setIsDragging(false)}
        >
          {/* Before (Noisy) */}
          <div className="absolute inset-0">
            <img
              src={block.beforeMedia?.url}
              alt={block.beforeMedia?.alt}
              className="w-full h-full object-cover filter blur-sm sepia-[0.3]"
            />
            <div className="absolute inset-0 bg-red-900/20 mix-blend-multiply" />
            <div className="absolute top-8 left-8 bg-black/50 backdrop-blur-md text-white font-bold px-6 py-3 rounded-full text-lg border border-white/20 shadow-lg">
              {block.beforeLabel}
            </div>
          </div>

          {/* After (ANC) */}
          <div
            className="absolute inset-0 overflow-hidden border-r-4 border-white shadow-[8px_0_30px_rgba(0,0,0,0.3)]"
            style={{ width: `${sliderPosition}%` }}
          >
            <div className="absolute inset-0 w-[100vw] max-w-[1200px]">
              <img
                src={block.afterMedia?.url}
                alt={block.afterMedia?.alt}
                className="w-full h-full object-cover brightness-110 contrast-110"
              />
              <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay" />
            </div>
            <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-md text-indigo-600 font-bold px-6 py-3 rounded-full text-lg border border-white/50 shadow-xl whitespace-nowrap">
              {block.afterLabel}
            </div>
          </div>

          {/* Slider Handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_15px_rgba(255,255,255,0.8)]"
            style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center border border-slate-200 text-indigo-600 transition-transform hover:scale-110">
              <div className="flex gap-1">
                <ChevronLeft className="w-5 h-5" />
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

const GallerySection = ({ block }: { block: ImageBrowserBlock }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  const openLightbox = (index: number) => {
    setActiveImage(index)
    setLightboxOpen(true)
  }

  return (
    <section className="py-24 bg-white/80 backdrop-blur-xl border-y border-white">
      <Container>
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-2">
              {block.title}
            </h2>
            <p className="text-xl text-slate-500 font-medium">{block.subtitle}</p>
          </div>
          <Button
            variant="outline"
            className="rounded-full bg-white hidden sm:flex items-center gap-2"
            onClick={() => openLightbox(0)}
          >
            <Camera className="w-4 h-4" /> Open Gallery
          </Button>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {block.images.map((img, i) => (
            <div
              key={i}
              className="shrink-0 w-[80vw] sm:w-[400px] h-[500px] rounded-[2rem] overflow-hidden snap-center group border-4 border-white shadow-xl relative cursor-pointer"
              onClick={() => openLightbox(i)}
            >
              <img
                src={img.url}
                alt={img.alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                <span className="text-white font-bold text-xl">{img.caption}</span>
              </div>
            </div>
          ))}
        </div>
      </Container>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-3xl flex items-center justify-center">
          <button
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-10 h-10" />
          </button>

          <div className="relative w-full max-w-7xl px-4 flex items-center">
            <button
              className="absolute left-4 md:left-12 p-4 text-white/50 hover:text-white transition-colors disabled:opacity-20"
              onClick={() => setActiveImage((prev) => Math.max(0, prev - 1))}
              disabled={activeImage === 0}
            >
              <ChevronLeft className="w-12 h-12" />
            </button>

            <div className="mx-auto w-full max-w-4xl max-h-[80vh] flex flex-col items-center">
              <img
                src={block.images[activeImage].url}
                alt={block.images[activeImage].alt}
                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl shadow-black/50 border border-white/10"
              />
              {block.images[activeImage].caption && (
                <div className="mt-8 text-white font-bold text-2xl text-center">
                  {block.images[activeImage].caption}
                </div>
              )}
            </div>

            <button
              className="absolute right-4 md:right-12 p-4 text-white/50 hover:text-white transition-colors disabled:opacity-20"
              onClick={() => setActiveImage((prev) => Math.min(block.images.length - 1, prev + 1))}
              disabled={activeImage === block.images.length - 1}
            >
              <ChevronRight className="w-12 h-12" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

const ProductBrowserSection = ({ block }: { block: ProductBrowserBlock }) => {
  const [activeProduct, setActiveProduct] = useState(0)
  const product = block.products[activeProduct]

  return (
    <section className="py-24 relative overflow-hidden">
      <Container>
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">
            {block.title || 'The Collection'}
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex gap-4 lg:gap-8 justify-center lg:justify-start overflow-x-auto hide-scrollbar pb-4">
            {block.products.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setActiveProduct(idx)}
                className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 overflow-hidden shrink-0 transition-all ${
                  activeProduct === idx
                    ? 'border-indigo-500 scale-110 shadow-xl shadow-indigo-500/20'
                    : 'border-white opacity-50 hover:opacity-100 hover:border-slate-200'
                }`}
              >
                <img src={p.media.url} alt={p.media.alt} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          <div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] p-8 md:p-12 border border-white shadow-2xl relative">
            <div className="absolute top-0 right-0 -z-10 translate-x-1/4 -translate-y-1/4">
              <div className="w-[300px] h-[300px] bg-gradient-to-br from-indigo-500/20 to-pink-500/20 rounded-full blur-[80px]" />
            </div>

            <h3 className="text-4xl font-black text-slate-900 mb-4">{product.name}</h3>
            {product.price && (
              <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-600 mb-6">
                {product.price}
              </div>
            )}
            <p className="text-lg text-slate-600 leading-relaxed font-medium mb-10">
              {product.description}
            </p>

            {product.cta && (
              <Button className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold h-14 px-10 rounded-full shadow-xl shadow-slate-900/20 hover:scale-105 transition-all text-lg flex items-center gap-3">
                {product.cta.label}
                {product.cta.icon === 'ArrowRight' && <ArrowRight className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}

const QuoteCalculatorSection = ({ block }: { block: CalculatorBlock }) => {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    block.inputs.forEach((i) => (init[i.id] = i.defaultValue))
    return init
  })

  const handleSliderChange = (id: string, val: number) => {
    setValues((prev) => ({ ...prev, [id]: val }))
  }

  const totalPrice = Object.values(values).reduce((a, b) => a + b * 15, 0) + 199 // Dummy logic

  return (
    <section className="py-24 bg-white relative">
      <Container>
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">
              {block.title || 'Custom Build'}
            </h2>
            {block.subtitle && (
              <p className="text-xl text-slate-500 font-medium mb-12">{block.subtitle}</p>
            )}

            <div className="space-y-10">
              {block.inputs.map((input) => (
                <div key={input.id}>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                      {input.label}
                    </label>
                    <span className="text-2xl font-black text-slate-900">
                      {values[input.id].toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={input.min || 0}
                    max={input.max || 100}
                    step={input.step || 1}
                    value={values[input.id]}
                    onChange={(e) => handleSliderChange(input.id, Number(e.target.value))}
                    className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[3rem] p-12 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <h3 className="text-lg font-bold text-white/50 uppercase tracking-widest mb-4">
              Estimated Quote
            </h3>
            <div className="text-7xl font-black tabular-nums tracking-tighter mb-8">
              ${totalPrice.toLocaleString()}
            </div>
            <Button className="w-full bg-white hover:bg-slate-50 text-slate-900 font-bold h-14 rounded-full text-lg shadow-xl transition-transform hover:scale-105 border-0">
              Checkout Now
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}

const TestimonialSection = ({ block }: { block: TestimonialBlock }) => {
  if (!block.testimonials || block.testimonials.length === 0) return null
  return (
    <section className="py-32 bg-white border-y border-slate-100">
      <Container>
        <h2 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-20 text-center">
          {block.title}
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {block.testimonials.map((review, i) => (
            <div
              key={i}
              className="bg-[#F8F9FA] p-10 rounded-[2.5rem] border border-slate-100 hover:shadow-xl transition-shadow"
            >
              <div className="flex gap-1 mb-8">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-xl font-medium text-slate-700 leading-relaxed mb-8">
                &ldquo;{review.quote}&rdquo;
              </p>
              <p className="font-bold text-slate-900 text-lg">— {review.author}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

const CTASection = () => (
  <section className="py-32 bg-slate-900 text-white rounded-[3rem] mx-4 md:mx-12 mb-24 relative overflow-hidden text-center">
    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/20 to-pink-500/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
    <Container className="relative z-10 max-w-3xl">
      <h2 className="text-6xl md:text-7xl font-black tracking-tight mb-8">
        Ready to hear the difference?
      </h2>
      <p className="text-2xl text-white/70 mb-12 font-medium">
        Join 50,000+ audiophiles who have already upgraded.
      </p>
      <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-12 h-16 text-xl font-bold shadow-xl shadow-white/10 transition-all hover:scale-105">
        Pre-order Now — $299
      </Button>
    </Container>
  </section>
)

// --- Main Template ---

export function EcommerceGradient({ data }: { data?: PageModel }) {
  if (!data) return null

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans overflow-x-hidden selection:bg-pink-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.15]">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 blur-[120px] mix-blend-multiply animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-pink-500 blur-[120px] mix-blend-multiply animate-[pulse_10s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="py-6 bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-black/5 shadow-sm">
          <Container className="flex justify-between items-center">
            <div className="font-black text-3xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:scale-105 transition-transform cursor-pointer">
              {(data.title.split('-')[0] || '').trim()}
            </div>
            <div className="hidden md:flex gap-10 font-bold text-base text-slate-500">
              {data.navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  className="hover:text-slate-900 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button className="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-full shadow-lg shadow-slate-900/20 text-sm font-bold transition-all hover:scale-105 active:scale-95">
                <ShoppingBag className="w-4 h-4" />
                Pre-order
              </button>
              <button className="sm:hidden flex items-center justify-center bg-slate-900 text-white w-12 h-12 rounded-full shadow-lg">
                <ShoppingBag className="w-5 h-5" />
              </button>
              <MobileNav
                links={data.navLinks.map((l) => ({ label: l.label, href: l.url }))}
                overlayClassName="bg-white/95 backdrop-blur-xl text-slate-900 border-l border-slate-200"
                linkClassName="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"
                iconClassName="w-8 h-8 text-slate-900"
              />
            </div>
          </Container>
        </nav>

        {/* Dynamic Blocks */}
        {data.blocks.map((block, index) => {
          switch (block._type) {
            case 'hero':
              return <HeroSection key={index} block={block as HeroBlock} />
            case 'product_browser':
              return <ProductBrowserSection key={index} block={block as ProductBrowserBlock} />
            case 'feature_grid':
              return <FeatureGridSection key={index} block={block as FeatureGridBlock} />
            case 'before_after':
              return <BeforeAfterSection key={index} block={block as BeforeAfterBlock} />
            case 'image_browser':
              return <GallerySection key={index} block={block as ImageBrowserBlock} />
            case 'calculator':
              return <QuoteCalculatorSection key={index} block={block as CalculatorBlock} />
            case 'testimonials':
              return <TestimonialSection key={index} block={block as TestimonialBlock} />
            default:
              return null
          }
        })}

        <CTASection />

        {/* Footer */}
        <footer className="py-12 bg-[#F8F9FA]">
          <Container className="flex justify-between items-center text-slate-400 font-medium text-sm">
            <p>© 2026 {(data.title.split('-')[0] || '').trim()} Inc.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-900 transition-colors">
                Instagram
              </a>
              <a href="#" className="hover:text-slate-900 transition-colors">
                Twitter
              </a>
            </div>
          </Container>
        </footer>
      </div>
    </div>
  )
}
