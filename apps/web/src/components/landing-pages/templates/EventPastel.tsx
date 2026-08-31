import { Calendar, Clock, Users, ArrowRight, Play, Loader2, Check, Ticket } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { MobileNav } from '@/components/ui/MobileNav'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useState } from 'react'
import {
  PageModel,
  HeroBlock,
  FeatureGridBlock,
  FormBlock,
  ServiceSelectorBlock,
  BookingPickerBlock,
  HotspotViewerBlock,
} from '@project/db/src/content'

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
})

type FormData = z.infer<typeof formSchema>

// --- Block Components ---

const HeroSection = ({ block }: { block: HeroBlock }) => (
  <main className="pt-24 pb-40">
    <Container className="grid xl:grid-cols-2 gap-20 items-center">
      <div className="relative z-20 text-center xl:text-left">
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-yellow-200 rounded-full blur-[100px] opacity-60" />

        {block.badges && block.badges.length > 0 && (
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/80 backdrop-blur-md border-2 border-white font-black text-sm uppercase tracking-widest text-teal-600 mb-10 shadow-lg transform -rotate-2 hover:rotate-0 transition-transform">
            <span className="w-3 h-3 rounded-full bg-teal-500 animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.8)]" />
            {block.badges[0]}
          </div>
        )}

        <h1
          className="text-[5rem] lg:text-[7.5rem] font-black tracking-tighter mb-8 leading-[0.9] text-slate-900 drop-shadow-sm"
          dangerouslySetInnerHTML={{
            __html: block.headline
              .replace('\n', '<br/>')
              .replace(
                'differently.',
                '<span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-violet-400 to-teal-400 drop-shadow-none block mt-2">differently.</span>',
              ),
          }}
        />

        <p className="text-2xl text-slate-600 mb-12 max-w-2xl mx-auto xl:mx-0 leading-relaxed font-medium">
          {block.subheadline}
        </p>

        <div className="flex flex-col sm:flex-row gap-6 mb-16 justify-center xl:justify-start">
          {block.ctas &&
            block.ctas.map((cta, i) => (
              <Button
                key={i}
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-12 h-20 text-2xl font-black shadow-2xl shadow-rose-300 transition-all hover:scale-105 group hover:-translate-y-2"
              >
                {cta.label}
                {cta.icon === 'ArrowRight' && (
                  <ArrowRight className="w-8 h-8 ml-3 group-hover:translate-x-2 transition-transform stroke-[3]" />
                )}
              </Button>
            ))}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-2xl xl:max-w-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-rose-300 to-teal-300 rounded-[4rem] transform rotate-6 scale-105 blur-2xl opacity-40" />
        <div className="grid grid-cols-2 gap-6 relative">
          <div className="space-y-6 pt-16">
            <div className="bg-white rounded-[3rem] p-3 shadow-2xl transform -rotate-6 hover:rotate-0 hover:scale-105 transition-all duration-500 border-4 border-white">
              <img
                src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80"
                className="w-full h-64 object-cover rounded-[2rem]"
                alt="Event Space"
              />
            </div>
            <div className="bg-gradient-to-br from-teal-400 to-teal-500 rounded-[3rem] p-10 text-white shadow-2xl shadow-teal-200/50 transform hover:scale-105 hover:-translate-y-4 transition-all duration-500 border-4 border-teal-300">
              <Users className="w-12 h-12 mb-6 opacity-80 stroke-[3]" />
              <div className="text-5xl font-black mb-2 tracking-tighter">50+</div>
              <div className="font-bold text-xl opacity-90">Industry Leaders</div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-rose-400 to-rose-500 rounded-[3rem] p-10 text-white shadow-2xl shadow-rose-200/50 transform rotate-6 hover:scale-105 hover:-translate-y-4 transition-all duration-500 border-4 border-rose-300">
              <Calendar className="w-12 h-12 mb-6 opacity-80 stroke-[3]" />
              <div className="text-5xl font-black mb-2 tracking-tighter">2 Days</div>
              <div className="font-bold text-xl opacity-90">Of pure inspiration</div>
            </div>
            <div className="bg-white rounded-[3rem] p-3 shadow-2xl transform hover:-rotate-6 hover:scale-105 transition-all duration-500 relative group overflow-hidden border-4 border-white">
              <img
                src="https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&w=600&q=80"
                className="w-full h-72 object-cover rounded-[2rem]"
                alt="Speaker"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem]">
                <div className="w-24 h-24 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer">
                  <Play className="w-10 h-10 text-rose-500 ml-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  </main>
)

const FeatureGridSection = ({ block }: { block: FeatureGridBlock }) => {
  // If no title, it's the Details Bar
  if (!block.title) {
    return (
      <section className="py-16 bg-white/60 backdrop-blur-2xl border-y-4 border-white shadow-lg relative z-20">
        <Container className="flex flex-wrap justify-center gap-16 md:gap-32">
          {block.features.map((detail, i) => (
            <div
              key={i}
              className="flex items-center gap-6 text-slate-700 font-black text-2xl tracking-tight"
            >
              <div className="w-20 h-20 rounded-[1.5rem] bg-white flex items-center justify-center shadow-xl shadow-rose-100 text-rose-500 transform -rotate-6 hover:rotate-0 transition-transform border-2 border-rose-50">
                {detail.icon === 'Calendar' && <Calendar className="w-10 h-10 stroke-[3]" />}
                {detail.icon === 'Clock' && <Clock className="w-10 h-10 stroke-[3]" />}
                {detail.icon === 'Users' && <Users className="w-10 h-10 stroke-[3]" />}
              </div>
              {detail.title}
            </div>
          ))}
        </Container>
      </section>
    )
  }

  // Otherwise, it's the Featured Speakers or Agenda
  return (
    <section className="py-40 relative z-20">
      <Container>
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6">
            {block.title}
          </h2>
          <p className="text-2xl text-slate-600 font-medium">{block.subtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10">
          {block.features.map((speaker, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="aspect-square rounded-[3rem] overflow-hidden mb-8 relative bg-white shadow-2xl border-4 border-white transform hover:-translate-y-4 transition-all duration-500">
                <img
                  src={
                    [
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
                      'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
                      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
                    ][i % 4]
                  }
                  alt={speaker.title}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rose-500/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity mix-blend-multiply" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tight group-hover:text-rose-500 transition-colors">
                {speaker.title}
              </h3>
              <p className="text-slate-500 font-bold text-lg uppercase tracking-wide">
                {speaker.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

const TicketsSection = ({ block }: { block: ServiceSelectorBlock }) => {
  const [activeTicket, setActiveTicket] = useState<string>(block.services[0]?.id || '')

  return (
    <section className="py-40 bg-white/60 backdrop-blur-2xl border-y-4 border-white relative z-20">
      <Container className="max-w-6xl">
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6">
            {block.title}
          </h2>
          <p className="text-2xl text-slate-600 font-medium">{block.subtitle}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 justify-center items-stretch">
          {block.services?.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setActiveTicket(ticket.id)}
              className={`flex-1 rounded-[3rem] p-10 transition-all duration-500 cursor-pointer border-4 flex flex-col relative overflow-hidden ${
                activeTicket === ticket.id
                  ? 'bg-slate-900 border-slate-900 shadow-2xl shadow-slate-900/20 transform scale-105 z-10'
                  : 'bg-white border-white shadow-xl hover:-translate-y-2'
              }`}
            >
              {activeTicket === ticket.id && (
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500 blur-[50px] opacity-50 rounded-full pointer-events-none" />
              )}

              <div className="mb-12">
                <h3
                  className={`text-3xl font-black mb-4 tracking-tight ${activeTicket === ticket.id ? 'text-white' : 'text-slate-900'}`}
                >
                  {ticket.label}
                </h3>
                <div
                  className={`text-6xl font-black ${activeTicket === ticket.id ? 'text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-violet-400' : 'text-slate-900'}`}
                >
                  {ticket.price}
                </div>
              </div>

              <p
                className={`text-lg font-medium leading-relaxed flex-1 ${activeTicket === ticket.id ? 'text-slate-300' : 'text-slate-600'}`}
              >
                {ticket.description}
              </p>

              <Button
                className={`mt-10 w-full rounded-full h-16 text-xl font-bold shadow-xl transition-all ${
                  activeTicket === ticket.id
                    ? 'bg-rose-500 text-white hover:bg-rose-400 shadow-rose-500/30 hover:scale-105'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200 hover:scale-105'
                }`}
              >
                Select {ticket.label}
              </Button>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

const FormSection = ({ block, title }: { block: FormBlock; title: string }) => {
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
    <footer className="py-32 relative z-20 bg-[#FFF5F5]">
      <Container className="text-center max-w-3xl">
        <div className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center mx-auto mb-10 transform rotate-6 border-4 border-rose-100">
          <Ticket className="w-12 h-12 text-rose-500 stroke-[3]" />
        </div>
        <h2 className="font-black text-5xl md:text-6xl mb-12 text-slate-900 tracking-tighter leading-tight">
          {block.title}
        </h2>

        <div className="mb-24">
          {isSubmitted ? (
            <div className="p-10 rounded-[3rem] bg-white border-4 border-white shadow-2xl shadow-rose-200/50 text-center transform hover:scale-105 transition-transform">
              <div className="w-20 h-20 rounded-full bg-green-100 text-green-500 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Check className="w-10 h-10 stroke-[4]" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
                {block.successMessage || "You're registered!"}
              </h3>
              <p className="text-slate-500 text-xl font-medium">
                Check your inbox for the calendar invite.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="relative group">
              <div className="absolute inset-0 bg-rose-200 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity rounded-full" />
              <div className="relative flex flex-col sm:flex-row gap-3 bg-white rounded-full p-3 shadow-2xl border-4 border-white z-10">
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Enter your email address..."
                  className="flex-1 bg-slate-50 border-none rounded-full text-slate-900 px-8 py-6 focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder:text-slate-400 font-bold text-xl"
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-slate-900 hover:bg-rose-500 text-white rounded-full px-12 py-6 text-xl font-black transition-all disabled:opacity-50 flex items-center justify-center gap-3 hover:scale-105 shadow-xl shadow-slate-900/20"
                >
                  {isSubmitting && <Loader2 className="w-6 h-6 animate-spin" />}
                  {block.buttonLabel}
                </Button>
              </div>
              {errors.email && (
                <p className="text-red-500 text-lg mt-4 px-6 absolute -bottom-12 font-bold w-full text-center">
                  {errors.email.message}
                </p>
              )}
            </form>
          )}
        </div>

        <div className="text-slate-400 font-bold text-lg flex flex-col sm:flex-row justify-center items-center gap-8 border-t-2 border-slate-200 pt-12">
          <div>© 2026 {(title.split('-')[0] || '').trim()}. All rights reserved.</div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-rose-500 transition-colors">
              Twitter
            </a>
            <a href="#" className="hover:text-rose-500 transition-colors">
              Instagram
            </a>
          </div>
        </div>
      </Container>
    </footer>
  )
}

const BookingPickerSection = ({ block }: { block: BookingPickerBlock }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  const dates = ['Oct 12', 'Oct 13', 'Oct 14', 'Oct 15']
  const times = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM']

  return (
    <section className="py-24 relative overflow-hidden">
      <Container className="max-w-4xl relative z-10">
        <div className="bg-white rounded-[3rem] p-12 border-[3px] border-rose-200 shadow-xl shadow-rose-100">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-slate-900 mb-4">
              {block.title || 'Book Your Spot'}
            </h2>
            <p className="text-xl text-slate-500 font-medium">
              {block.subtitle || 'Select a date and time to attend.'}
            </p>
          </div>

          <div className="flex justify-between mb-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-rose-400 -translate-y-1/2 z-0 transition-all duration-500"
              style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
            />

            <div
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 bg-white transition-colors ${step >= 1 ? 'border-rose-400 text-rose-500' : 'border-slate-200 text-slate-400'}`}
            >
              1
            </div>
            <div
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 bg-white transition-colors ${step >= 2 ? 'border-rose-400 text-rose-500' : 'border-slate-200 text-slate-400'}`}
            >
              2
            </div>
            <div
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 bg-white transition-colors ${step >= 3 ? 'border-rose-400 text-rose-500' : 'border-slate-200 text-slate-400'}`}
            >
              3
            </div>
          </div>

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-rose-400" /> Select Date
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dates.map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`p-6 rounded-2xl border-2 font-bold text-lg transition-all ${
                      selectedDate === date
                        ? 'border-rose-400 bg-rose-50 text-rose-600 scale-105 shadow-md shadow-rose-100'
                        : 'border-slate-100 text-slate-600 hover:border-rose-200 hover:bg-rose-50/50'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
              <div className="mt-12 flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedDate}
                  className="bg-slate-900 text-white rounded-full px-8 h-14 font-bold disabled:opacity-50"
                >
                  Next Step <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Clock className="w-6 h-6 text-teal-400" /> Select Time
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {times.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-6 rounded-2xl border-2 font-bold text-lg transition-all ${
                      selectedTime === time
                        ? 'border-teal-400 bg-teal-50 text-teal-600 scale-105 shadow-md shadow-teal-100'
                        : 'border-slate-100 text-slate-600 hover:border-teal-200 hover:bg-teal-50/50'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
              <div className="mt-12 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-full px-8 h-14 font-bold border-2"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!selectedTime}
                  className="bg-slate-900 text-white rounded-full px-8 h-14 font-bold disabled:opacity-50"
                >
                  Confirm <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in zoom-in duration-500 text-center py-12">
              <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100">
                <Check className="w-10 h-10 stroke-[4]" />
              </div>
              <h3 className="text-3xl font-black mb-4 text-slate-900">You&apos;re booked!</h3>
              <p className="text-xl text-slate-500 font-medium mb-8">
                We&apos;ll see you on{' '}
                <span className="text-rose-500 font-bold">{selectedDate}</span> at{' '}
                <span className="text-teal-500 font-bold">{selectedTime}</span>.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1)
                  setSelectedDate(null)
                  setSelectedTime(null)
                }}
                className="rounded-full border-2 font-bold"
              >
                Book another session
              </Button>
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}

const HotspotViewerSection = ({ block }: { block: HotspotViewerBlock }) => {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null)

  return (
    <section className="py-32 relative">
      <Container>
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            {block.title || 'The Venue Map'}
          </h2>
          <p className="text-xl text-slate-500 font-medium">Explore the festival grounds.</p>
        </div>

        <div className="max-w-5xl mx-auto relative rounded-[3rem] overflow-hidden border-[8px] border-white shadow-2xl shadow-rose-100 bg-rose-50">
          <img src={block.baseImage.url} alt={block.baseImage.alt} className="w-full h-auto" />

          {block.hotspots.map((hotspot) => (
            <div
              key={hotspot.id}
              className="absolute"
              style={{
                top: `${hotspot.y}%`,
                left: `${hotspot.x}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseEnter={() => setActiveHotspot(hotspot.id)}
              onMouseLeave={() => setActiveHotspot(null)}
            >
              <div className="relative group cursor-pointer">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-rose-300 hover:border-rose-500 hover:scale-110 transition-all z-10 relative text-rose-500 font-bold">
                  {hotspot.id}
                </div>

                {/* Pulse */}
                <div className="absolute inset-0 bg-rose-400 rounded-full animate-ping opacity-50 z-0" />

                {/* Tooltip */}
                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-white rounded-2xl p-4 shadow-xl border-2 border-rose-100 transition-all duration-300 pointer-events-none ${
                    activeHotspot === hotspot.id
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  }`}
                >
                  <h4 className="font-bold text-lg text-slate-900 mb-1">{hotspot.label}</h4>
                  {hotspot.description && (
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      {hotspot.description}
                    </p>
                  )}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-rose-100 transform rotate-45 -translate-y-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

// --- Main Template ---

export function EventPastel({ data }: { data?: PageModel }) {
  if (!data) return null

  return (
    <div className="min-h-screen bg-[#FFF5F5] text-slate-900 font-sans selection:bg-rose-200 overflow-hidden relative">
      {/* Pastel Blobs */}
      <div className="fixed inset-0 pointer-events-none opacity-60 mix-blend-multiply">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-200 blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-200 blur-[120px] animate-[pulse_12s_ease-in-out_infinite]" />
        <div className="absolute top-[30%] left-[50%] w-[60%] h-[60%] rounded-full bg-violet-200 blur-[150px] animate-[pulse_14s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Nav */}
        <nav className="py-8 bg-white/40 backdrop-blur-3xl sticky top-0 z-50 border-b border-white/60">
          <Container className="flex justify-between items-center">
            <div className="font-black text-3xl tracking-tighter text-slate-900 flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-tr from-rose-400 to-violet-400 rounded-xl" />
              {(data.title.split('-')[0] || '').trim()}
            </div>
            <div className="hidden md:flex bg-white/70 backdrop-blur-md rounded-full px-8 py-4 border-2 border-white shadow-sm gap-10 text-base font-bold text-slate-500">
              {data.navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  className="hover:text-rose-500 transition-colors uppercase tracking-wide"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-6">
              <Button className="hidden sm:flex bg-slate-900 hover:bg-rose-500 text-white rounded-full px-8 py-6 text-lg font-black shadow-xl shadow-rose-200 transition-all hover:scale-105 active:scale-95">
                Register Now
              </Button>
              <MobileNav
                links={data.navLinks.map((l) => ({ label: l.label, href: l.url }))}
                overlayClassName="bg-[#FFF5F5]/95 backdrop-blur-xl text-slate-900 border-l-2 border-rose-200"
                linkClassName="text-4xl font-black tracking-tight text-slate-900"
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
            case 'feature_grid':
              return <FeatureGridSection key={index} block={block as FeatureGridBlock} />
            case 'hotspot_viewer':
              return <HotspotViewerSection key={index} block={block as HotspotViewerBlock} />
            case 'service_selector':
              return <TicketsSection key={index} block={block as ServiceSelectorBlock} />
            case 'booking_picker':
              return <BookingPickerSection key={index} block={block as BookingPickerBlock} />
            case 'form':
              return <FormSection key={index} block={block as FormBlock} title={data.title} />
            default:
              return null
          }
        })}
      </div>
    </div>
  )
}
