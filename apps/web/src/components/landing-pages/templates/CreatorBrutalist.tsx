import { ArrowRight, Star, Play, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { MobileNav } from '@/components/ui/MobileNav'
import { useState, useEffect } from 'react'
import {
  PageModel,
  HeroBlock,
  FeatureGridBlock,
  TextMediaBlock,
  TestimonialBlock,
  FaqBlock,
  ImageBrowserBlock,
  VideoChapterBlock,
  MetricsBlock,
  FloatingDockBlock,
} from '@project/db/src/content'

// --- Block Components ---

const HeroSection = ({ block }: { block: HeroBlock }) => (
  <main className="border-b-[12px] border-black bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4xIi8+Cjwvc3ZnPg==')] relative overflow-hidden">
    <Container className="py-32 md:py-48 grid xl:grid-cols-2 gap-20 items-center relative z-10">
      <div>
        {block.badges && block.badges.length > 0 && (
          <div className="inline-block bg-yellow-400 font-black border-8 border-black px-6 py-3 mb-10 transform -rotate-3 hover:rotate-0 transition-transform shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-2xl">
            {block.badges[0]}
          </div>
        )}
        <h1
          className="text-[5rem] sm:text-[7rem] md:text-[9rem] lg:text-[11rem] font-black leading-[0.85] tracking-tighter mb-10 hover:skew-x-[5deg] transition-transform origin-left"
          dangerouslySetInnerHTML={{ __html: block.headline.replace('\n', '<br />\n') }}
        />

        <p className="text-3xl font-black max-w-2xl mb-16 leading-tight bg-white p-6 border-8 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          {block.subheadline}
        </p>

        <div className="flex flex-col sm:flex-row gap-8">
          {block.ctas &&
            block.ctas.map((cta, i) => (
              <button
                key={i}
                className="bg-black text-white text-3xl md:text-4xl font-black px-12 py-8 border-8 border-black hover:bg-yellow-400 hover:text-black transition-all flex items-center justify-center gap-4 group shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-4 hover:translate-y-4"
              >
                {cta.label}
                {cta.icon === 'ArrowRight' && (
                  <ArrowRight className="w-10 h-10 group-hover:translate-x-3 transition-transform stroke-[4]" />
                )}
              </button>
            ))}
        </div>
      </div>

      {block.media && (
        <div className="relative group perspective-[1000px]">
          <div className="absolute inset-0 bg-yellow-400 border-[12px] border-black transform translate-x-8 translate-y-8 transition-transform group-hover:translate-x-12 group-hover:translate-y-12" />
          <div className="relative bg-white border-[12px] border-black aspect-square flex items-center justify-center cursor-pointer overflow-hidden z-10">
            <img
              src={block.media.url}
              alt={block.media.alt}
              className="w-full h-full object-cover grayscale contrast-150 mix-blend-multiply opacity-80 group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500 z-10" />
            <Play className="w-40 h-40 text-yellow-400 absolute group-hover:scale-125 transition-transform duration-500 z-20 drop-shadow-2xl fill-yellow-400 stroke-black stroke-[4]" />
            <div className="absolute bottom-8 left-8 right-8 bg-black text-white p-6 font-black text-2xl z-20 text-center border-8 border-black shadow-[8px_8px_0px_0px_rgba(250,204,21,1)] group-hover:-translate-y-2 transition-transform">
              WATCH TRAILER (2:45)
            </div>
          </div>
        </div>
      )}
    </Container>
  </main>
)

const TargetAudienceSection = ({ block }: { block: FeatureGridBlock }) => (
  <section className="py-32 border-b-[12px] border-black bg-white">
    <Container>
      <div className="grid lg:grid-cols-2 gap-20">
        <div className="border-[12px] border-black p-12 relative hover:-translate-y-2 hover:translate-x-2 transition-transform shadow-[-16px_16px_0px_0px_rgba(0,0,0,1)] bg-white z-10">
          <div className="absolute -top-10 -left-10 bg-black text-white text-4xl md:text-5xl font-black px-8 py-5 transform -rotate-3 border-4 border-black">
            {block.title}
          </div>
          <ul className="space-y-8 mt-12">
            {block.features.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-6 font-black text-2xl md:text-3xl tracking-tight"
              >
                <div className="shrink-0 bg-green-400 border-4 border-black p-2 transform rotate-3">
                  <Check className="w-8 h-8 text-black stroke-[5]" />
                </div>
                {item.title}
              </li>
            ))}
          </ul>
        </div>

        {/* Hardcoding the NOT FOR section since it wasn't modeled, but fits the aesthetic */}
        <div className="border-[12px] border-black bg-black text-white p-12 relative hover:-translate-y-2 hover:-translate-x-2 transition-transform shadow-[16px_16px_0px_0px_rgba(250,204,21,1)] z-10">
          <div className="absolute -top-10 -right-10 bg-yellow-400 text-black text-4xl md:text-5xl font-black px-8 py-5 transform rotate-3 border-8 border-black">
            WHO THIS IS NOT FOR
          </div>
          <ul className="space-y-8 mt-12">
            {[
              'GET-RICH-QUICK SEEKERS',
              'PEOPLE WHO MAKE EXCUSES',
              "THOSE LOOKING FOR 'HACKS'",
              'ANYONE AFRAID TO HIT PUBLISH',
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-6 font-black text-2xl md:text-3xl tracking-tight text-zinc-400 hover:text-white transition-colors"
              >
                <div className="shrink-0 bg-red-500 border-4 border-white p-2 w-16 h-16 flex items-center justify-center font-black text-white transform -rotate-3 text-3xl">
                  X
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  </section>
)

const InstructorSection = ({ block }: { block: TextMediaBlock }) => (
  <section className="py-40 border-b-[12px] border-black bg-yellow-400">
    <Container className="grid lg:grid-cols-2 gap-20 items-center">
      {block.media && (
        <div className="relative group">
          <div className="absolute inset-0 bg-white border-[12px] border-black transform -translate-x-8 -translate-y-8 transition-transform group-hover:-translate-x-12 group-hover:-translate-y-12" />
          <img
            src={block.media.url}
            alt={block.media.alt}
            className="relative z-10 border-[12px] border-black grayscale contrast-150 w-full aspect-[4/5] object-cover group-hover:grayscale-0 transition-all duration-700"
          />
        </div>
      )}
      <div>
        <h2
          className="text-7xl md:text-[8rem] font-black tracking-tighter mb-12 leading-[0.85] hover:skew-x-[5deg] transition-transform origin-left"
          dangerouslySetInnerHTML={{ __html: block.headline.replace('. ', '. <br/> ') }}
        />

        <div className="bg-white border-8 border-black p-10 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black text-4xl leading-[1.1] mb-10">{block.body.split('.')[0]}.</p>
          <p className="text-2xl font-bold leading-snug">
            {block.body.substring(block.body.indexOf('.') + 1).trim()}
          </p>
        </div>
      </div>
    </Container>
  </section>
)

const ImageBrowserSection = ({ block }: { block: ImageBrowserBlock }) => (
  <section className="py-40 border-b-[12px] border-black bg-white overflow-hidden">
    <Container>
      <div className="text-center mb-24 relative">
        <h2 className="text-[6rem] md:text-[10rem] font-black tracking-tighter mb-6 leading-[0.8]">
          {block.title}
        </h2>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 px-8 py-4 font-black text-4xl border-8 border-black transform -rotate-3 z-10 whitespace-nowrap shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          {block.subtitle}
        </div>
      </div>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 mt-32">
        {block.images.map((img, i) => (
          <div key={i} className="break-inside-avoid relative group border-8 border-black bg-black">
            <img
              src={img.url}
              alt={img.alt}
              className="w-full h-auto object-cover grayscale contrast-150 mix-blend-screen opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
            />
            <div className="absolute inset-0 bg-yellow-400/0 group-hover:bg-yellow-400/20 transition-colors" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="bg-black text-white border-4 border-white p-4 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <h4 className="text-2xl font-black mb-1 truncate">{img.alt}</h4>
                <p className="text-yellow-400 font-bold text-lg">{img.caption}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Container>
  </section>
)

const TestimonialSection = ({ block }: { block: TestimonialBlock }) => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  // Auto-advance testimonials
  useEffect(() => {
    if (!block.testimonials?.length) return
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % block.testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [block.testimonials])

  const nextTestimonial = () => {
    if (block.testimonials) {
      setCurrentTestimonial((prev) => (prev + 1) % block.testimonials.length)
    }
  }

  const prevTestimonial = () => {
    if (block.testimonials) {
      setCurrentTestimonial(
        (prev) => (prev - 1 + block.testimonials.length) % block.testimonials.length,
      )
    }
  }

  if (!block.testimonials || block.testimonials.length === 0) return null

  return (
    <section className="py-40 border-b-[12px] border-black bg-black text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full overflow-hidden whitespace-nowrap opacity-10 pointer-events-none text-[20rem] font-black leading-none">
        PROOF PROOF PROOF PROOF
      </div>
      <Container className="relative z-10">
        <div className="text-center mb-24">
          <h2 className="text-7xl md:text-[9rem] font-black tracking-tighter mb-8 text-yellow-400">
            {block.title}
          </h2>
        </div>

        <div className="max-w-6xl mx-auto relative">
          {/* Controls */}
          <div className="absolute top-1/2 -left-4 md:-left-20 -translate-y-1/2 z-20">
            <button
              onClick={prevTestimonial}
              className="w-16 h-16 md:w-20 md:h-20 bg-yellow-400 border-4 md:border-8 border-white flex items-center justify-center hover:scale-110 transition-transform"
            >
              <ChevronLeft className="w-10 h-10 md:w-12 md:h-12 text-black stroke-[4]" />
            </button>
          </div>
          <div className="absolute top-1/2 -right-4 md:-right-20 -translate-y-1/2 z-20">
            <button
              onClick={nextTestimonial}
              className="w-16 h-16 md:w-20 md:h-20 bg-yellow-400 border-4 md:border-8 border-white flex items-center justify-center hover:scale-110 transition-transform"
            >
              <ChevronRight className="w-10 h-10 md:w-12 md:h-12 text-black stroke-[4]" />
            </button>
          </div>

          {/* Slider */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
            >
              {block.testimonials.map((testimonial, i) => (
                <div key={i} className="w-full shrink-0 px-4">
                  <div className="border-[12px] border-white p-12 md:p-20 relative bg-black transform transition-transform shadow-[16px_16px_0px_0px_rgba(250,204,21,1)]">
                    <div className="absolute -top-8 -right-8 bg-yellow-400 text-black font-black px-6 py-3 text-2xl md:text-3xl border-8 border-black transform rotate-6">
                      {testimonial.metrics}
                    </div>
                    <div className="flex gap-2 mb-10">
                      {[...Array(5)].map((_, j) => (
                        <Star
                          key={j}
                          className="w-10 h-10 md:w-12 md:h-12 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <p className="text-4xl md:text-6xl font-black mb-12 leading-[1.1] tracking-tight">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <p className="font-black text-3xl text-yellow-400">— {testimonial.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Indicators */}
          <div className="flex justify-center gap-4 mt-16">
            {block.testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentTestimonial(i)}
                className={`h-4 transition-all ${currentTestimonial === i ? 'w-24 bg-yellow-400' : 'w-4 bg-white/30'}`}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

const FaqSection = ({ block }: { block: FaqBlock }) => (
  <section className="py-40 border-b-[12px] border-black bg-white">
    <Container className="max-w-5xl mx-auto">
      <div className="text-center mb-24">
        <h2 className="text-[6rem] md:text-[9rem] font-black tracking-tighter mb-4 leading-[0.85]">
          {block.title}
        </h2>
        <p className="text-4xl font-black bg-yellow-400 inline-block px-8 py-4 border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform rotate-2">
          FREQUENTLY ASKED QUESTIONS
        </p>
      </div>
      <div className="space-y-10 mb-24">
        {block.questions.map((q, i) => (
          <div
            key={i}
            className="border-8 border-black p-10 hover:bg-black hover:text-white transition-colors group cursor-crosshair"
          >
            <h3 className="text-4xl font-black mb-6 uppercase tracking-tight group-hover:text-yellow-400">
              {q.question}
            </h3>
            <p className="text-2xl font-bold leading-snug">{q.answer}</p>
          </div>
        ))}
      </div>

      <div className="border-[12px] border-black bg-yellow-400 p-16 md:p-20 text-center transform -rotate-1 hover:rotate-0 transition-transform shadow-[24px_24px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-6xl md:text-7xl font-black mb-8">THE IRONCLAD GUARANTEE</h3>
        <p className="text-2xl md:text-3xl font-black max-w-4xl mx-auto leading-tight">
          IF YOU DO THE WORK FOR 30 DAYS AND DON&apos;T SEE RESULTS, EMAIL ME. I&apos;LL REFUND
          EVERY PENNY. NO QUESTIONS ASKED. THE ONLY WAY YOU LOSE IS IF YOU DON&apos;T TAKE ACTION.
        </p>
      </div>
    </Container>
  </section>
)

const StaticPricingSection = () => (
  <section className="py-48 bg-yellow-400 relative overflow-hidden">
    {/* Background text */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30rem] font-black text-black/5 whitespace-nowrap pointer-events-none select-none">
      DO IT NOW
    </div>

    <Container className="max-w-5xl mx-auto text-center relative z-10">
      <h2 className="text-[7rem] md:text-[10rem] lg:text-[12rem] font-black tracking-tighter mb-16 leading-[0.8] hover:scale-105 transition-transform cursor-pointer">
        READY TO COMMIT?
      </h2>
      <div className="bg-white border-[12px] border-black p-12 md:p-24 shadow-[32px_32px_0px_0px_rgba(0,0,0,1)] text-left transform rotate-1 hover:rotate-0 transition-transform">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-[12px] border-black pb-12 mb-12 gap-8">
          <div>
            <h3 className="text-6xl md:text-7xl font-black mb-4">LIFETIME ACCESS</h3>
            <p className="font-black text-3xl bg-black text-yellow-400 inline-block px-6 py-2">
              ONE-TIME PAYMENT.
            </p>
          </div>
          <div className="text-[6rem] md:text-[9rem] font-black leading-none">$997</div>
        </div>

        <ul className="space-y-8 mb-20">
          {[
            'ALL 6 WEEKS OF CONTENT',
            'PRIVATE DISCORD COMMUNITY',
            'WEEKLY LIVE Q&A SESSIONS',
            'TEMPLATES & FRAMEWORKS',
            '100% MONEY-BACK GUARANTEE',
          ].map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-8 text-3xl md:text-4xl font-black tracking-tight"
            >
              <div className="bg-black p-2 transform -rotate-3 border-4 border-yellow-400">
                <Check className="w-10 h-10 text-yellow-400 stroke-[5]" />
              </div>
              {item}
            </li>
          ))}
        </ul>

        <button className="w-full bg-black text-white text-5xl md:text-6xl font-black py-12 border-[12px] border-black hover:bg-yellow-400 hover:text-black transition-all hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:-translate-x-2">
          I&apos;M IN. LET&apos;S GO.
        </button>
      </div>
    </Container>
  </section>
)

const VideoChapterSection = ({ block }: { block: VideoChapterBlock }) => {
  const [activeChapter, setActiveChapter] = useState(0)

  return (
    <section className="py-24 border-b-[12px] border-black bg-[#FF5722]">
      <Container>
        <div className="text-center mb-16">
          <h2 className="text-[4rem] md:text-[6rem] font-black tracking-tighter text-black uppercase transform -skew-x-6">
            {block.title || 'Sneak Peek'}
          </h2>
        </div>
        <div className="grid lg:grid-cols-[1fr_400px] border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <div className="relative aspect-video bg-black border-r-0 lg:border-r-8 border-black flex items-center justify-center">
            {block.videoUrl ? (
              <iframe
                src={block.videoUrl}
                className="w-full h-full absolute inset-0"
                allowFullScreen
              />
            ) : (
              <div className="text-white font-black text-3xl animate-pulse">VIDEO PLACEHOLDER</div>
            )}
          </div>
          <div className="flex flex-col bg-white">
            <div className="p-6 border-b-8 border-black bg-yellow-400">
              <h3 className="font-black text-2xl uppercase">Chapters</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {block.chapters.map((chapter, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveChapter(idx)}
                  className={`w-full text-left p-6 border-b-8 border-black flex justify-between items-center transition-colors hover:bg-yellow-400 ${
                    activeChapter === idx ? 'bg-black text-white hover:text-black' : 'text-black'
                  }`}
                >
                  <span className="font-black text-xl uppercase tracking-tighter truncate pr-4">
                    {chapter.title}
                  </span>
                  <span
                    className={`font-bold px-3 py-1 border-4 ${activeChapter === idx ? 'border-white' : 'border-black'}`}
                  >
                    {chapter.timestamp}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

const MetricsBrutalistSection = ({ block }: { block: MetricsBlock }) => {
  return (
    <section className="py-24 border-b-[12px] border-black bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4xIi8+Cjwvc3ZnPg==')]">
      <Container>
        <div className="grid md:grid-cols-3 gap-12">
          {block.metrics.map((metric, idx) => (
            <div
              key={idx}
              className="bg-white border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-4 hover:translate-x-4 hover:shadow-none transition-all transform hover:skew-x-2"
            >
              <div className="text-6xl md:text-[5rem] font-black tracking-tighter mb-4 text-[#FF5722] drop-shadow-[4px_4px_0_black]">
                {metric.value}
              </div>
              <h3 className="text-3xl font-black uppercase mb-4">{metric.label}</h3>
              {metric.description && (
                <p className="text-xl font-bold bg-yellow-400 inline-block px-4 py-2 border-4 border-black transform -skew-x-3">
                  {metric.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

// --- Main Template ---

export function CreatorBrutalist({ data }: { data?: PageModel }) {
  if (!data) return null

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-yellow-400 selection:text-black uppercase border-[12px] border-black m-2 md:m-4 relative">
      {/* Top Banner */}
      <div className="bg-yellow-400 border-b-8 border-black p-4 overflow-hidden flex whitespace-nowrap sticky top-0 z-50">
        <div className="animate-[marquee_15s_linear_infinite] flex gap-6 font-black text-lg tracking-widest items-center">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="flex gap-6 items-center">
              <span>ENROLLMENT CLOSES IN 48 HOURS</span>
              <span className="text-2xl">•</span>
              <span>ONLY 50 SEATS LEFT</span>
              <span className="text-2xl">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="border-b-[12px] border-black bg-white relative z-40">
        <Container className="flex justify-between items-center py-8">
          <div className="font-black text-5xl md:text-6xl tracking-tighter hover:text-yellow-400 transition-colors cursor-pointer">
            {(data.title.split('-')[0] || '').trim()}
          </div>
          <div className="hidden lg:flex gap-10 font-black text-2xl">
            {data.navLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                className="hover:text-yellow-400 hover:underline decoration-8 underline-offset-8 transition-all hover:skew-x-[-10deg]"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-6">
            <button className="hidden sm:block bg-black text-white font-black px-10 py-5 text-2xl border-4 border-black hover:bg-yellow-400 hover:text-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2">
              JOIN NOW
            </button>
            <MobileNav
              links={data.navLinks.map((l) => ({ label: l.label, href: l.url }))}
              overlayClassName="bg-yellow-400 text-black border-l-[12px] border-black"
              linkClassName="text-6xl font-black tracking-tighter text-black hover:underline decoration-8 underline-offset-8"
              iconClassName="w-12 h-12 text-black stroke-[3]"
            />
          </div>
        </Container>
      </nav>

      {/* Dynamic Blocks */}
      {data.blocks.map((block, index) => {
        switch (block._type) {
          case 'hero':
            return <HeroSection key={index} block={block as HeroBlock} />
          case 'video_chapter':
            return <VideoChapterSection key={index} block={block as VideoChapterBlock} />
          case 'metrics':
            return <MetricsBrutalistSection key={index} block={block as MetricsBlock} />
          case 'feature_grid':
            return <TargetAudienceSection key={index} block={block as FeatureGridBlock} />
          case 'text_media':
            return <InstructorSection key={index} block={block as TextMediaBlock} />
          case 'image_browser':
            return <ImageBrowserSection key={index} block={block as ImageBrowserBlock} />
          case 'testimonials':
            return <TestimonialSection key={index} block={block as TestimonialBlock} />
          case 'faq':
            return <FaqSection key={index} block={block as FaqBlock} />
          default:
            return null
        }
      })}

      <StaticPricingSection />

      {/* Floating CTA Dock */}
      {(() => {
        const dockBlock = data.blocks.find((b) => b._type === 'floating_dock') as
          FloatingDockBlock | undefined
        if (!dockBlock) return null
        return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
            <div className="bg-white border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-2 flex items-center gap-4">
              {dockBlock.items.map((item, i) => (
                <a
                  key={i}
                  href={item.url}
                  className={`font-black text-xl px-6 py-3 border-4 border-black transition-transform hover:scale-110 uppercase ${
                    i === 0
                      ? 'bg-yellow-400 hover:bg-black hover:text-white'
                      : 'bg-white hover:bg-[#FF5722] hover:text-black'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Footer */}
      <footer className="border-t-[12px] border-black py-16 bg-black text-white">
        <Container className="flex flex-col md:flex-row justify-between items-center font-black text-3xl gap-8">
          <div>© 2026 {(data.title.split('-')[0] || '').trim()}.</div>
          <div className="flex gap-12">
            <a
              href="#"
              className="hover:text-yellow-400 underline decoration-8 underline-offset-8 transition-colors"
            >
              TERMS
            </a>
            <a
              href="#"
              className="hover:text-yellow-400 underline decoration-8 underline-offset-8 transition-colors"
            >
              PRIVACY
            </a>
          </div>
        </Container>
      </footer>
    </div>
  )
}
