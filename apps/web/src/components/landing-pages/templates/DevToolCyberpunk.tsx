import { Terminal, Cpu, Network, Zap, ChevronRight, Copy, Check } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { MobileNav } from '@/components/ui/MobileNav'
import { useState, useEffect, useRef } from 'react'
import { PageModel } from '@project/db/src/content'
import {
  HeroBlock,
  FeatureGridBlock,
  ServiceSelectorBlock,
  StickyMediaBlock,
  ComparisonBlock,
} from '@project/db/src/content'

// --- Block Components ---

const HeroSection = ({ block }: { block: HeroBlock }) => (
  <Container className="grid lg:grid-cols-2 gap-20 items-center">
    <div>
      {block.badges && block.badges.length > 0 && (
        <div className="inline-flex items-center gap-3 border-4 border-[#00FF41] bg-[#00FF41]/10 px-4 py-2 text-sm font-bold tracking-widest mb-10 shadow-[0_0_15px_rgba(0,255,65,0.2)]">
          <span className="w-3 h-3 bg-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,1)] animate-pulse" />
          {block.badges[0]}
        </div>
      )}

      <h1
        className="text-[5rem] lg:text-[7rem] font-black tracking-tighter mb-10 leading-[0.9] text-white"
        dangerouslySetInnerHTML={{
          __html: block.headline.replace(
            'bare metal speed.',
            '<span className="text-[#00FF41] drop-shadow-[0_0_25px_rgba(0,255,65,0.8)]">bare metal speed.</span>',
          ),
        }}
      />

      <p className="text-2xl text-white/70 mb-16 max-w-2xl leading-relaxed font-medium">
        {block.subheadline}
      </p>

      <div className="flex flex-col sm:flex-row gap-8">
        {block.ctas &&
          block.ctas.map((cta, i) =>
            cta.variant === 'primary' ? (
              <button
                key={i}
                className="bg-[#00FF41] text-black font-black px-12 py-6 text-2xl hover:bg-white transition-all flex items-center justify-center gap-3 group shadow-[0_0_30px_rgba(0,255,65,0.6)] hover:shadow-[0_0_50px_rgba(0,255,65,1)] hover:-translate-y-1"
              >
                {cta.label}
                {cta.icon === 'ChevronRight' && (
                  <ChevronRight className="w-8 h-8 stroke-[4] group-hover:translate-x-2 transition-transform" />
                )}
              </button>
            ) : (
              <button
                key={i}
                className="border-4 border-[#00FF41] text-[#00FF41] font-black px-12 py-6 text-2xl hover:bg-[#00FF41]/20 transition-all flex items-center justify-center gap-3 hover:-translate-y-1"
              >
                {cta.icon === 'Terminal' && <Terminal className="w-8 h-8 stroke-[3]" />}
                {cta.label}
              </button>
            ),
          )}
      </div>
    </div>
  </Container>
)

const ServiceSelectorSection = ({ block }: { block: ServiceSelectorBlock }) => {
  const [copied, setCopied] = useState(false)
  const [text, setText] = useState('')
  const [activeTab, setActiveTab] = useState<string>(() => block?.services?.[0]?.id || '')

  const getCodeContent = (tabId: string) => {
    switch (tabId) {
      case 'react':
        return `import { NeuralProvider, useCompute } from '@neural/react'\n\nfunction App() {\n  const { process } = useCompute({ strict: true })\n  return <NeuralProvider>...</NeuralProvider>\n}`
      case 'vue':
        return `import { useNeural } from '@neural/vue'\nimport { defineComponent } from 'vue'\n\nexport default defineComponent({\n  setup() {\n    const { compute } = useNeural()\n    return { compute }\n  }\n})`
      case 'node':
        return `const { Engine } = require('@neural/node')\n\nconst engine = new Engine({ mode: 'cluster' })\nawait engine.start()\nengine.on('data', chunk => console.log(chunk))`
      case 'rust':
        return `use neural_core::engine::Engine;\n\n#[tokio::main]\nasync fn main() {\n    let engine = Engine::new().hyper_mode();\n    engine.execute().await;\n}`
      default:
        return `import { Engine } from '@neural/core'\n\nconst engine = new Engine()\nawait engine.init()`
    }
  }

  const codeString = activeTab ? getCodeContent(activeTab) : getCodeContent('react')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- typewriter reset when codeString changes
    setText('')
    let i = 0
    const typingInterval = setInterval(() => {
      if (i < codeString.length) {
        setText(codeString.slice(0, i + 1))
        i++
      } else {
        clearInterval(typingInterval)
      }
    }, 20)
    return () => clearInterval(typingInterval)
  }, [codeString, activeTab])

  const copyCode = () => {
    navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Container className="grid lg:grid-cols-2 gap-20 items-center -mt-32 pb-40">
      <div className="hidden lg:block"></div>
      <div className="relative group mt-12 lg:mt-0">
        <div className="absolute inset-0 bg-[#00FF41]/20 blur-[100px] rounded-full group-hover:bg-[#00FF41]/30 transition-colors duration-1000" />
        <div className="relative border-4 border-[#00FF41] bg-[#050505]/95 p-6 shadow-[0_0_50px_rgba(0,255,65,0.2)] backdrop-blur-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-4 border-[#00FF41]/30 pb-6 mb-6 gap-4">
            <div className="flex gap-4 overflow-x-auto scrollbar-hide">
              {block.services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setActiveTab(service.id)}
                  className={`px-4 py-2 font-bold text-lg tracking-wider border-2 transition-all whitespace-nowrap ${
                    activeTab === service.id
                      ? 'border-[#00FF41] bg-[#00FF41]/20 text-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.5)]'
                      : 'border-transparent text-white/50 hover:text-[#00FF41] hover:bg-[#00FF41]/10'
                  }`}
                >
                  {service.label}
                </button>
              ))}
            </div>
            <div className="text-sm font-bold text-[#00FF41]/60 flex items-center gap-4 shrink-0">
              <span>bash ~ integrate</span>
              <button
                onClick={copyCode}
                className="hover:text-[#00FF41] hover:scale-110 transition-all bg-[#00FF41]/10 p-2 border border-[#00FF41]/30"
                title="Copy code"
              >
                {copied ? (
                  <Check className="w-5 h-5 stroke-[3]" />
                ) : (
                  <Copy className="w-5 h-5 stroke-[3]" />
                )}
              </button>
            </div>
          </div>

          <pre className="text-lg md:text-xl font-mono overflow-x-auto p-4 min-h-[300px]">
            <code className="text-[#00FF41] font-bold">
              {text}
              <span className="animate-pulse bg-[#00FF41] text-transparent ml-1 inline-block w-3 h-5 align-middle">
                _
              </span>
            </code>
          </pre>

          <div className="mt-6 pt-6 border-t-4 border-[#00FF41]/20 text-sm font-bold text-[#00FF41]/60 flex flex-col gap-2 min-h-[80px]">
            {text.length === codeString.length && (
              <>
                <div className="animate-[fadeIn_0.3s_ease-out]">
                  <span className="text-white">❯</span> Compiling bindings for {activeTab}...
                </div>
                <div className="animate-[fadeIn_0.5s_ease-out_0.2s_both]">
                  <span className="text-white">❯</span> Integration ready.{' '}
                  <span className="text-[#00FF41] animate-pulse font-black shadow-[#00FF41] drop-shadow-[0_0_5px_rgba(0,255,65,1)]">
                    ONLINE
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Container>
  )
}

const ArchitectureSection = ({ block }: { block: FeatureGridBlock }) => (
  <section className="py-40 border-t-4 border-[#00FF41]/30 bg-[#0A0A0A]/80 backdrop-blur-2xl">
    <Container>
      <div className="text-center mb-24 max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tighter">
          <span className="text-[#00FF41]">{'// '}</span>
          {block.title}
        </h2>
        <p className="text-2xl text-[#00FF41]/60 font-medium">{block.subtitle}</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
        {block.features.map((feature, i) => (
          <div
            key={i}
            className="border-4 border-[#00FF41]/20 bg-black/60 p-10 hover:border-[#00FF41] hover:bg-[#00FF41]/10 transition-all duration-300 group relative overflow-hidden shadow-[0_0_0_rgba(0,255,65,0)] hover:shadow-[0_0_30px_rgba(0,255,65,0.3)] hover:-translate-y-2"
          >
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-8xl font-black group-hover:opacity-20 group-hover:text-[#00FF41] transition-all">
              0{i + 1}
            </div>

            <div className="mb-8 p-4 bg-[#00FF41]/10 inline-block border-2 border-[#00FF41]/30 group-hover:bg-[#00FF41]/20 group-hover:border-[#00FF41] transition-colors">
              {feature.icon === 'Zap' && (
                <Zap className="w-12 h-12 text-[#00FF41] group-hover:drop-shadow-[0_0_15px_rgba(0,255,65,1)] transition-all stroke-[3]" />
              )}
              {feature.icon === 'Cpu' && (
                <Cpu className="w-12 h-12 text-[#00FF41] group-hover:drop-shadow-[0_0_15px_rgba(0,255,65,1)] transition-all stroke-[3]" />
              )}
              {feature.icon === 'Network' && (
                <Network className="w-12 h-12 text-[#00FF41] group-hover:drop-shadow-[0_0_15px_rgba(0,255,65,1)] transition-all stroke-[3]" />
              )}
              {feature.icon === 'Terminal' && (
                <Terminal className="w-12 h-12 text-[#00FF41] group-hover:drop-shadow-[0_0_15px_rgba(0,255,65,1)] transition-all stroke-[3]" />
              )}
              {feature.icon === 'Copy' && (
                <Copy className="w-12 h-12 text-[#00FF41] group-hover:drop-shadow-[0_0_15px_rgba(0,255,65,1)] transition-all stroke-[3]" />
              )}
              {feature.icon === 'Check' && (
                <Check className="w-12 h-12 text-[#00FF41] group-hover:drop-shadow-[0_0_15px_rgba(0,255,65,1)] transition-all stroke-[3]" />
              )}
            </div>

            <h3 className="text-2xl font-black mb-4 text-white group-hover:text-[#00FF41] transition-colors tracking-tight">
              {feature.title}
            </h3>
            <p className="text-[#00FF41]/60 text-lg leading-relaxed font-medium">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </Container>
  </section>
)

const StaticPerformanceSection = () => (
  <section className="py-40 border-t-4 border-[#00FF41]/30 bg-[#020202] relative z-20 overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-96 bg-[#00FF41]/10 blur-[150px] rounded-full pointer-events-none" />
    <Container className="max-w-5xl relative z-10">
      <div className="mb-24 text-center">
        <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tighter">
          <span className="text-[#00FF41]">{'// '}</span>PERFORMANCE_MATRIX
        </h2>
        <p className="text-2xl text-[#00FF41]/60 font-medium">
          HMR times for a 10,000 module application (Lower is better).
        </p>
      </div>

      <div className="space-y-12">
        {/* Competitor 1 */}
        <div className="group">
          <div className="flex justify-between text-xl font-bold mb-4">
            <span className="text-white/40">WEBPACK_5</span>
            <span className="text-white/40">4.2s</span>
          </div>
          <div className="w-full bg-[#111] h-10 relative border-4 border-white/10 overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.1),rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.2)_10px,rgba(255,255,255,0.2)_20px)] w-[100%] transition-all duration-1000 group-hover:bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.2),rgba(255,255,255,0.2)_10px,rgba(255,255,255,0.3)_10px,rgba(255,255,255,0.3)_20px)]" />
          </div>
        </div>

        {/* Competitor 2 */}
        <div className="group">
          <div className="flex justify-between text-xl font-bold mb-4">
            <span className="text-white/40">VITE_ROLLUP</span>
            <span className="text-white/40">1.1s</span>
          </div>
          <div className="w-full bg-[#111] h-10 relative border-4 border-white/10 overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.2),rgba(255,255,255,0.2)_10px,rgba(255,255,255,0.3)_10px,rgba(255,255,255,0.3)_20px)] w-[26%] transition-all duration-1000 group-hover:bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.3),rgba(255,255,255,0.3)_10px,rgba(255,255,255,0.4)_10px,rgba(255,255,255,0.4)_20px)]" />
          </div>
        </div>

        {/* Neural Core */}
        <div className="group hover:scale-[1.02] transition-transform">
          <div className="flex justify-between text-3xl font-black mb-4 text-[#00FF41]">
            <span className="drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]">NEURAL_CORE</span>
            <span className="drop-shadow-[0_0_10px_rgba(0,255,65,0.5)] animate-pulse">0.05s</span>
          </div>
          <div className="w-full bg-[#111] h-12 relative border-4 border-[#00FF41] shadow-[0_0_30px_rgba(0,255,65,0.3)] overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-[#00FF41] w-[2%] shadow-[0_0_20px_rgba(0,255,65,1)] animate-pulse" />
            <div className="absolute top-0 bottom-0 w-2 bg-white/80 blur-[2px] animate-[slideRight_2s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </Container>
  </section>
)

const StickyMediaSection = ({ block }: { block: StickyMediaBlock }) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return

      const sections = containerRef.current.querySelectorAll('.content-section')
      const viewportHeight = window.innerHeight

      let active = 0
      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect()
        // If the section is roughly in the middle of the screen
        if (rect.top <= viewportHeight / 2 && rect.bottom >= viewportHeight / 2) {
          active = index
        }
      })

      if (active !== activeIndex) {
        setActiveIndex(active)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initially
    return () => window.removeEventListener('scroll', handleScroll)
  }, [activeIndex])

  return (
    <Container className="py-24">
      <div className="grid lg:grid-cols-2 gap-16 relative" ref={containerRef}>
        {/* Left Side: Scrolling Content */}
        <div>
          {block.sections.map((section, idx) => (
            <div
              key={section.id}
              className={`content-section min-h-screen flex flex-col justify-center transition-opacity duration-500 ${
                activeIndex === idx ? 'opacity-100' : 'opacity-20'
              }`}
            >
              <h2
                className="text-4xl md:text-5xl font-black text-white mb-6 uppercase tracking-widest"
                dangerouslySetInnerHTML={{ __html: section.headline }}
              />
              <p className="text-xl text-white/70 leading-relaxed font-medium">{section.body}</p>
            </div>
          ))}
        </div>

        {/* Right Side: Sticky Media */}
        <div className="relative hidden lg:block">
          <div className="sticky top-1/2 -translate-y-1/2 w-full aspect-square border-4 border-[#00FF41] bg-black p-4 shadow-[0_0_30px_rgba(0,255,65,0.2)]">
            <div className="absolute top-0 left-0 w-full h-8 bg-[#00FF41]/20 flex items-center px-4 border-b border-[#00FF41]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="ml-4 text-[#00FF41] text-xs font-mono uppercase tracking-widest">
                {block.sections[activeIndex]?.id || 'terminal'}
              </div>
            </div>

            <div className="w-full h-full relative mt-8 overflow-hidden">
              {block.sections.map((section, idx) => (
                <div
                  key={section.id}
                  className={`absolute inset-0 transition-opacity duration-700 flex items-center justify-center ${
                    activeIndex === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                >
                  <img
                    src={section.media.url}
                    alt={section.media.alt}
                    className="max-w-full max-h-full object-contain filter invert opacity-80"
                  />
                  <div className="absolute inset-0 bg-[#00FF41]/10 mix-blend-screen pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

const ComparisonSection = ({ block }: { block: ComparisonBlock }) => {
  const [viewThem, setViewThem] = useState(false)

  return (
    <Container className="py-24 border-t-4 border-[#00FF41]/30">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-widest uppercase mb-12 shadow-[#00FF41] drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]">
          {block.title || 'VERSUS'}
        </h2>

        {/* Toggle */}
        <div className="inline-flex items-center bg-black border-4 border-[#00FF41] p-1">
          <button
            onClick={() => setViewThem(false)}
            className={`px-8 py-3 font-bold text-lg uppercase tracking-widest transition-colors ${!viewThem ? 'bg-[#00FF41] text-black' : 'text-[#00FF41] hover:bg-[#00FF41]/10'}`}
          >
            Us
          </button>
          <button
            onClick={() => setViewThem(true)}
            className={`px-8 py-3 font-bold text-lg uppercase tracking-widest transition-colors ${viewThem ? 'bg-red-500 text-black' : 'text-red-500 hover:bg-red-500/10'}`}
          >
            Them
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto border-4 border-white/20 bg-[#111]">
        <div className="grid grid-cols-2 p-6 border-b-4 border-white/20 text-sm font-black text-white/50 tracking-widest uppercase bg-black">
          <div>Feature</div>
          <div className="text-right">Support</div>
        </div>
        {block.items.map((item, idx) => (
          <div
            key={idx}
            className="grid grid-cols-2 p-6 border-b border-white/10 text-lg font-mono"
          >
            <div className="text-white">{item.feature}</div>
            <div
              className={`text-right font-bold ${!viewThem ? 'text-[#00FF41]' : 'text-red-500'}`}
            >
              {!viewThem
                ? typeof item.us === 'boolean'
                  ? item.us
                    ? 'TRUE'
                    : 'FALSE'
                  : item.us
                : typeof item.them === 'boolean'
                  ? item.them
                    ? 'TRUE'
                    : 'FALSE'
                  : item.them}
            </div>
          </div>
        ))}
      </div>
    </Container>
  )
}

// --- Main Template ---

export function DevToolCyberpunk({ data }: { data?: PageModel }) {
  if (!data) return null

  return (
    <div className="min-h-screen bg-[#020202] text-[#00FF41] font-mono selection:bg-[#00FF41]/30 selection:text-white overflow-x-hidden">
      {/* Dynamic Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.15]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00FF41_1px,transparent_1px),linear-gradient(to_bottom,#00FF41_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-[#00FF41]/20 blur-[150px] mix-blend-screen" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Nav */}
        <nav className="border-b-4 border-[#00FF41] bg-[#020202]/90 backdrop-blur-xl sticky top-0 z-50">
          <Container className="flex justify-between items-center py-6">
            <div className="font-black text-3xl flex items-center gap-4">
              <Terminal className="w-8 h-8 text-[#00FF41] animate-pulse stroke-[3]" />
              <span className="tracking-widest shadow-[#00FF41] drop-shadow-[0_0_10px_rgba(0,255,65,0.8)]">
                {(data.title.split('-')[0] || '').trim()}
                <span className="animate-[ping_1s_infinite]">_</span>
              </span>
            </div>
            <div className="hidden md:flex gap-12 text-lg font-bold text-[#00FF41]/60">
              {data.navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  className="hover:text-[#00FF41] hover:shadow-[0_0_15px_rgba(0,255,65,0.8)] transition-all uppercase"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-6">
              <button className="hidden sm:block text-xl font-black bg-[#00FF41]/10 text-[#00FF41] border-4 border-[#00FF41] px-8 py-3 hover:bg-[#00FF41] hover:text-black transition-all shadow-[0_0_20px_rgba(0,255,65,0.3)] hover:shadow-[0_0_40px_rgba(0,255,65,0.8)] hover:scale-105 active:scale-95">
                INITIATE
              </button>
              <MobileNav
                links={data.navLinks.map((l) => ({ label: l.label, href: l.url }))}
                overlayClassName="bg-[#020202] text-[#00FF41] border-l-4 border-[#00FF41] font-mono"
                linkClassName="text-4xl font-black tracking-widest text-[#00FF41] hover:shadow-[0_0_30px_rgba(0,255,65,0.8)]"
                iconClassName="w-8 h-8 text-[#00FF41] stroke-[3]"
              />
            </div>
          </Container>
        </nav>

        <main className="flex-1 flex flex-col pt-24 pb-40">
          {/* Dynamic Blocks */}
          {data.blocks.map((block, index) => {
            switch (block._type) {
              case 'hero':
                return <HeroSection key={index} block={block as HeroBlock} />
              case 'sticky_media':
                return <StickyMediaSection key={index} block={block as StickyMediaBlock} />
              case 'comparison':
                return <ComparisonSection key={index} block={block as ComparisonBlock} />
              case 'service_selector':
                return <ServiceSelectorSection key={index} block={block as ServiceSelectorBlock} />
              case 'feature_grid':
                return <ArchitectureSection key={index} block={block as FeatureGridBlock} />
              default:
                return null
            }
          })}
        </main>

        <StaticPerformanceSection />

        {/* Footer */}
        <footer className="py-12 border-t-4 border-[#00FF41]/30 bg-black">
          <Container className="flex flex-col md:flex-row justify-between items-center text-lg font-bold text-[#00FF41]/40">
            <div>
              {'// '}(C) 2026 {(data.title.split('-')[0] || '').trim().toUpperCase()}. ALL SYSTEMS
              NOMINAL.
            </div>
            <div className="flex gap-10 mt-6 md:mt-0">
              <a
                href="#"
                className="hover:text-[#00FF41] hover:shadow-[0_0_10px_rgba(0,255,65,0.5)] transition-all"
              >
                GPG_KEY
              </a>
              <a
                href="#"
                className="hover:text-[#00FF41] hover:shadow-[0_0_10px_rgba(0,255,65,0.5)] transition-all"
              >
                LICENSE
              </a>
            </div>
          </Container>
        </footer>
      </div>
    </div>
  )
}
