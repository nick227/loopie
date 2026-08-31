import {
  ArrowRight,
  Activity,
  Heart,
  Clipboard,
  ShieldCheck,
  Pill,
  Lock,
  Phone,
  User,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
} from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { MobileNav } from '@/components/ui/MobileNav'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useState } from 'react'
import {
  PageModel,
  HeroBlock,
  FeatureGridBlock,
  TextMediaBlock,
  TestimonialBlock,
  FormBlock,
  ServiceSelectorBlock,
  FaqBlock,
  BookingPickerBlock,
  TimelineBlock,
  BeforeAfterBlock,
} from '@/types/content'
import { Button } from '@/components/ui/Button'

// --- Block Components ---

const HeroSection = ({ block }: { block: HeroBlock }) => (
  <main className="relative pt-40 pb-32 overflow-hidden">
    <div className="absolute top-0 right-0 -z-10 translate-x-1/3 -translate-y-1/4">
      <div className="w-[1000px] h-[1000px] rounded-full bg-gradient-to-tr from-[#3498DB]/20 to-[#48C9B0]/20 blur-[120px]" />
    </div>

    <Container className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
      <div className="max-w-2xl z-10">
        {block.badges && block.badges.length > 0 && (
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#E1EEF5] text-sm font-bold text-[#48C9B0] mb-10 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
            {block.badges[0]}
          </div>
        )}

        <h1
          className="text-6xl sm:text-7xl lg:text-[6.5rem] font-extrabold tracking-tighter leading-[0.95] mb-8 text-[#1E3A5F]"
          dangerouslySetInnerHTML={{ __html: block.headline.replace('\n', '<br />\n') }}
        />

        <p className="text-2xl text-[#4A6B8C] font-medium mb-12 leading-relaxed max-w-xl">
          {block.subheadline}
        </p>

        {block.interactionType === 'inline-form' ? (
          <div className="bg-white p-3 rounded-full shadow-xl border border-[#E1EEF5] flex items-center max-w-xl mb-12">
            <select className="flex-1 bg-transparent px-6 text-[#1E3A5F] text-lg font-bold outline-none cursor-pointer appearance-none">
              <option>Select a reason for visit...</option>
              <option>Cold & Flu Symptoms</option>
              <option>Mental Health Consult</option>
              <option>Prescription Refill</option>
            </select>
            <button className="bg-[#3498DB] text-white px-8 py-4 rounded-full font-bold hover:bg-[#2980B9] transition-all shadow-md flex items-center gap-2 shrink-0 text-lg">
              {block.ctas?.[0]?.label || 'Check Availability'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6 mb-12">
            {block.ctas &&
              block.ctas.map((cta, i) =>
                cta.variant === 'primary' ? (
                  <button
                    key={i}
                    className="bg-[#3498DB] text-white px-10 py-5 rounded-full font-bold hover:bg-[#2980B9] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-3 text-lg"
                  >
                    <Phone className="w-6 h-6" />
                    {cta.label}
                  </button>
                ) : (
                  <button
                    key={i}
                    className="bg-white text-[#1E3A5F] border border-[#E1EEF5] px-10 py-5 rounded-full font-bold hover:bg-[#F0F7FA] transition-colors flex items-center justify-center gap-3 shadow-md text-lg"
                  >
                    {cta.label}
                    {cta.icon === 'ArrowRight' && <ArrowRight className="w-6 h-6" />}
                  </button>
                ),
              )}
          </div>
        )}

        {/* Trust Indicators */}
        {block.proof && (
          <div className="pt-8 border-t border-[#E1EEF5] flex items-center gap-6 text-base font-bold text-[#4A6B8C]">
            <div className="flex -space-x-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full border-[3px] border-[#F0F7FA] bg-white flex items-center justify-center overflow-hidden shadow-sm"
                >
                  <img
                    src={`https://i.pravatar.cc/100?img=${i + 10}`}
                    alt="Patient"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <div>
              <div className="text-[#1E3A5F] text-xl mb-1 flex items-center gap-2">
                <span className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </span>
                {block.proof.rating} / 5
              </div>
              {block.proof.text}
            </div>
          </div>
        )}
      </div>

      {block.media && (
        <div className="relative z-10 hidden lg:block">
          <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-[12px] border-white max-h-[700px]">
            <img
              src={block.media.url}
              alt={block.media.alt}
              className="w-full h-full object-cover"
            />
            {/* Floating UI Element */}
            <div className="absolute bottom-10 left-[-2rem] bg-white p-6 rounded-3xl shadow-2xl flex items-center gap-5 animate-bounce-slow border border-[#E1EEF5]">
              <div className="w-16 h-16 rounded-full bg-[#48C9B0]/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-[#48C9B0]" />
              </div>
              <div>
                <div className="text-xl font-bold text-[#1E3A5F]">Dr. Sarah Jenkins</div>
                <div className="text-base text-[#4A6B8C] font-semibold">Available Now</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  </main>
)

const BenefitsSection = ({ block }: { block: FeatureGridBlock }) => (
  <section className="py-32 md:py-40 bg-white relative z-20">
    <Container>
      <div className="text-center max-w-4xl mx-auto mb-24">
        <h2 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tighter text-[#1E3A5F] leading-[0.9]">
          {block.title}
        </h2>
        <p className="text-xl md:text-2xl text-[#4A6B8C] font-medium leading-relaxed">
          {block.subtitle}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
        {block.features.map((feature, i) => (
          <div
            key={i}
            className="bg-[#F0F7FA] p-12 rounded-[3rem] hover:-translate-y-2 transition-transform duration-500 shadow-sm hover:shadow-xl"
          >
            <div className="w-20 h-20 bg-white rounded-3xl shadow-md flex items-center justify-center mb-10 text-[#3498DB]">
              {feature.icon === 'ShieldCheck' && <ShieldCheck className="w-10 h-10" />}
              {feature.icon === 'Pill' && <Pill className="w-10 h-10" />}
              {feature.icon === 'Lock' && <Lock className="w-10 h-10" />}
            </div>
            <h3 className="text-3xl font-bold mb-6 text-[#1E3A5F]">{feature.title}</h3>
            <p className="text-[#4A6B8C] leading-relaxed font-medium text-lg">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </Container>
  </section>
)

const VisionSection = ({ block }: { block: TextMediaBlock }) => (
  <section className="py-32 md:py-48 bg-[#F0F7FA]">
    <Container>
      <div
        className={`flex flex-col lg:flex-row items-center gap-20 lg:gap-32 ${block.alignment === 'right' ? '' : 'lg:flex-row-reverse'}`}
      >
        <div className="flex-1 space-y-10">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white border border-[#E1EEF5] text-base font-bold text-[#3498DB] shadow-sm uppercase tracking-widest">
            Our Mission
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-[6rem] font-extrabold leading-[0.9] tracking-tighter text-[#1E3A5F]">
            {block.headline}
          </h2>
          <p className="text-xl md:text-2xl text-[#4A6B8C] font-medium leading-relaxed">
            {block.body}
          </p>
          <ul className="space-y-6 pt-6">
            {['No waiting rooms', 'Upfront pricing', 'Top-tier specialists'].map((item, i) => (
              <li key={i} className="flex items-center gap-4 font-bold text-[#1E3A5F] text-2xl">
                <div className="w-8 h-8 rounded-full bg-[#48C9B0]/20 flex items-center justify-center text-[#48C9B0]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {block.media && (
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 bg-[#3498DB] rounded-[3rem] rotate-3 opacity-20 scale-105" />
            <img
              src={block.media.url}
              alt={block.media.alt}
              className="relative z-10 w-full rounded-[3rem] shadow-2xl border-8 border-white"
            />
          </div>
        )}
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
    <section className="py-32 md:py-48 bg-white text-[#1E3A5F]">
      <Container>
        <div className="text-center max-w-4xl mx-auto mb-24">
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-8 leading-[0.9]">
            {block.title}
          </h2>
          <p className="text-xl md:text-2xl text-[#4A6B8C] font-medium leading-relaxed">
            {block.subtitle}
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4 mb-20">
            {block.services.map((service) => (
              <button
                key={service.id}
                onClick={() => setActiveServiceId(service.id)}
                className={`px-10 py-5 rounded-full font-bold text-lg transition-all duration-300 ${
                  activeServiceId === service.id
                    ? 'bg-[#1E3A5F] text-white shadow-xl scale-105'
                    : 'bg-[#F0F7FA] text-[#4A6B8C] hover:bg-[#E1EEF5] hover:text-[#1E3A5F]'
                }`}
              >
                {service.label}
              </button>
            ))}
          </div>

          {activeService && (
            <div className="grid lg:grid-cols-2 gap-16 items-center bg-[#F0F7FA] rounded-[3rem] p-12 md:p-20 border border-[#E1EEF5] shadow-lg">
              <div>
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-10 text-[#3498DB]">
                  {activeService.icon === 'Activity' && <Activity className="w-10 h-10" />}
                  {activeService.icon === 'Heart' && <Heart className="w-10 h-10" />}
                  {activeService.icon === 'Clipboard' && <Clipboard className="w-10 h-10" />}
                </div>
                <h3 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-8 leading-[1]">
                  {activeService.headline}
                </h3>
                <p className="text-xl text-[#4A6B8C] font-medium mb-12 leading-relaxed">
                  {activeService.description}
                </p>
                {activeService.cta && (
                  <Button className="bg-[#3498DB] hover:bg-[#2980B9] text-white rounded-full px-10 h-16 text-xl font-bold flex items-center gap-3 group shadow-md hover:shadow-xl transition-all">
                    {activeService.cta.label}
                    {activeService.cta.icon === 'ArrowRight' && (
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    )}
                  </Button>
                )}
              </div>
              {activeService.media && (
                <div className="rounded-[2.5rem] overflow-hidden border-8 border-white bg-white aspect-square lg:aspect-[4/3] relative shadow-2xl">
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

const FaqSection = ({ block }: { block: FaqBlock }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  return (
    <section className="py-32 md:py-48 bg-[#F0F7FA] border-y border-[#E1EEF5]">
      <Container className="max-w-4xl">
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-8 leading-[0.9]">
            {block.title}
          </h2>
          <p className="text-xl md:text-2xl text-[#4A6B8C] font-medium">
            Everything you need to know about our virtual care.
          </p>
        </div>
        <div className="divide-y divide-[#E1EEF5]">
          {block.questions.map((q, i) => {
            const isOpen = openFaqIndex === i
            return (
              <div key={i} className="py-10">
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between text-left focus:outline-none group"
                >
                  <h3 className="text-2xl font-bold text-[#1E3A5F] group-hover:text-[#3498DB] transition-colors pr-8 leading-snug">
                    {q.question}
                  </h3>
                  <div className="shrink-0 w-12 h-12 rounded-full bg-white flex items-center justify-center group-hover:bg-[#3498DB] transition-colors shadow-sm">
                    {isOpen ? (
                      <ChevronUp className="w-6 h-6 text-[#1E3A5F] group-hover:text-white" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-[#1E3A5F] group-hover:text-white" />
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div className="pt-8 pr-16 animate-in fade-in slide-in-from-top-4 duration-300">
                    <p className="text-[#4A6B8C] leading-relaxed text-xl font-medium">{q.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

const TestimonialSection = ({ block }: { block: TestimonialBlock }) => {
  if (!block.testimonials || block.testimonials.length === 0) return null

  return (
    <section className="py-32 md:py-48 bg-[#3498DB] text-white">
      <Container className="max-w-5xl text-center">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tighter mb-20 italic">
          &ldquo;{block.testimonials[0].quote}&rdquo;
        </h2>
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 text-3xl font-extrabold border-2 border-white/40">
            {block.testimonials[0].author.charAt(0)}
          </div>
          <div className="font-bold text-2xl mb-2">{block.testimonials[0].author}</div>
          <div className="text-white/80 font-bold text-lg uppercase tracking-wider">
            {block.testimonials[0].role} &bull; {block.testimonials[0].metrics}
          </div>
        </div>
      </Container>
    </section>
  )
}

const FormSection = ({ block }: { block: FormBlock }) => {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const formSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
    firstName: z.string().min(2, 'First name is required.'),
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
    <section className="py-32 md:py-48 bg-white">
      <Container className="max-w-2xl text-center">
        <h2 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tighter text-[#1E3A5F] leading-[0.9]">
          {block.title}
        </h2>
        <p className="text-xl md:text-2xl text-[#4A6B8C] font-medium mb-16 leading-relaxed">
          Join thousands of patients who have switched to a better healthcare experience.
        </p>

        <div className="bg-[#F0F7FA] p-12 sm:p-16 rounded-[3rem] shadow-2xl border border-[#E1EEF5] text-left">
          {isSubmitted ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto bg-[#48C9B0]/20 rounded-full flex items-center justify-center mb-8">
                <CheckCircle2 className="w-12 h-12 text-[#48C9B0]" />
              </div>
              <h3 className="text-3xl font-bold mb-4 text-[#1E3A5F]">
                {block.successMessage || 'Success!'}
              </h3>
              <p className="text-[#4A6B8C] font-medium text-lg">
                Please check your email to confirm your account.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div>
                <label className="block text-base font-bold text-[#1E3A5F] mb-3 uppercase tracking-wider">
                  First Name
                </label>
                <input
                  {...register('firstName')}
                  type="text"
                  className="w-full bg-white border border-[#E1EEF5] rounded-2xl px-6 py-5 text-xl text-[#1E3A5F] focus:outline-none focus:ring-4 focus:ring-[#3498DB]/20 focus:border-[#3498DB] transition-all font-bold placeholder:font-medium shadow-sm"
                  placeholder="Jane"
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-base mt-3 font-bold">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-base font-bold text-[#1E3A5F] mb-3 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full bg-white border border-[#E1EEF5] rounded-2xl px-6 py-5 text-xl text-[#1E3A5F] focus:outline-none focus:ring-4 focus:ring-[#3498DB]/20 focus:border-[#3498DB] transition-all font-bold placeholder:font-medium shadow-sm"
                  placeholder="jane@example.com"
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-red-500 text-base mt-3 font-bold">{errors.email.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1E3A5F] text-white px-10 py-6 rounded-2xl font-bold hover:bg-[#3498DB] transition-colors flex items-center justify-center gap-3 mt-8 shadow-xl text-xl"
              >
                {isSubmitting && <Loader2 className="w-6 h-6 animate-spin" />}
                {block.buttonLabel}
              </button>
              <p className="text-center text-sm text-[#4A6B8C] font-medium mt-6">
                By registering, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          )}
        </div>
      </Container>
    </section>
  )
}

const BookingPickerSection = ({ block }: { block: BookingPickerBlock }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const dates = [
    { label: 'Today', date: 'Aug 24' },
    { label: 'Tomorrow', date: 'Aug 25' },
    { label: 'Wed', date: 'Aug 26' },
    { label: 'Thu', date: 'Aug 27' },
    { label: 'Fri', date: 'Aug 28' },
  ]

  return (
    <section className="py-24 bg-[#E1EEF5]/30">
      <Container>
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E3A5F] tracking-tight mb-6">
            {block.title || 'Book an Appointment'}
          </h2>
          {block.subtitle && <p className="text-xl text-[#4A6B8C]">{block.subtitle}</p>}
        </div>

        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-[0_20px_60px_-15px_rgba(30,58,95,0.1)] border border-[#E1EEF5]">
          <div className="mb-12">
            <h3 className="flex items-center gap-2 text-xl font-bold text-[#1E3A5F] mb-6">
              <Calendar className="w-6 h-6 text-[#3498DB]" />
              Select Date
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {dates.map((d) => (
                <button
                  key={d.date}
                  onClick={() => {
                    setSelectedDate(d.date)
                    setSelectedTime(null)
                  }}
                  className={`flex flex-col items-center min-w-[100px] p-4 rounded-2xl border-2 transition-all ${
                    selectedDate === d.date
                      ? 'border-[#3498DB] bg-[#3498DB]/5'
                      : 'border-[#E1EEF5] hover:border-[#3498DB]/30 bg-white'
                  }`}
                >
                  <span
                    className={`text-sm font-bold mb-1 ${selectedDate === d.date ? 'text-[#3498DB]' : 'text-[#4A6B8C]'}`}
                  >
                    {d.label}
                  </span>
                  <span
                    className={`text-lg font-bold ${selectedDate === d.date ? 'text-[#1E3A5F]' : 'text-[#8A9EB3]'}`}
                  >
                    {d.date}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            className={`transition-opacity duration-300 ${selectedDate ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}
          >
            <h3 className="flex items-center gap-2 text-xl font-bold text-[#1E3A5F] mb-6">
              <Clock className="w-6 h-6 text-[#3498DB]" />
              Select Time
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
              {block.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedTime(opt.value)}
                  className={`p-4 rounded-xl font-bold text-center border-2 transition-all ${
                    selectedTime === opt.value
                      ? 'border-[#3498DB] bg-[#3498DB] text-white shadow-lg shadow-[#3498DB]/20'
                      : 'border-[#E1EEF5] bg-white text-[#4A6B8C] hover:border-[#3498DB]/50 hover:bg-[#3498DB]/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-[#E1EEF5] flex justify-end">
            <Button
              disabled={!selectedDate || !selectedTime}
              className="bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold h-14 px-10 rounded-full text-lg disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              Continue to Details
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}

const TimelineScrubberSection = ({ block }: { block: TimelineBlock }) => {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <section className="py-24">
      <Container>
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E3A5F] tracking-tight mb-6">
            {block.title || 'How it works'}
          </h2>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Scrubber Navigation */}
          <div className="relative flex justify-between mb-16">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#E1EEF5] -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-[#48C9B0] -translate-y-1/2 z-0 transition-all duration-500 ease-out"
              style={{ width: `${(activeStep / (block.steps.length - 1)) * 100}%` }}
            />

            {block.steps.map((step, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className="relative z-10 flex flex-col items-center group"
              >
                <div
                  className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-lg transition-colors duration-300 bg-white ${
                    activeStep >= idx
                      ? 'border-[#48C9B0] text-[#48C9B0]'
                      : 'border-[#E1EEF5] text-[#8A9EB3]'
                  }`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`absolute top-14 text-sm font-bold whitespace-nowrap transition-colors duration-300 ${
                    activeStep === idx
                      ? 'text-[#1E3A5F]'
                      : 'text-[#8A9EB3] group-hover:text-[#4A6B8C]'
                  }`}
                >
                  {step.title}
                </span>
              </button>
            ))}
          </div>

          {/* Active Content */}
          <div className="bg-white border border-[#E1EEF5] rounded-3xl p-12 text-center shadow-sm relative overflow-hidden h-[250px] flex flex-col justify-center">
            {block.steps.map((step, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 p-12 flex flex-col justify-center items-center transition-all duration-500 ${
                  activeStep === idx
                    ? 'opacity-100 translate-x-0'
                    : activeStep > idx
                      ? 'opacity-0 -translate-x-full'
                      : 'opacity-0 translate-x-full'
                }`}
              >
                <h3 className="text-3xl font-bold text-[#1E3A5F] mb-4">{step.title}</h3>
                <p className="text-xl text-[#4A6B8C] leading-relaxed max-w-2xl">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

const BeforeAfterSection = ({ block }: { block: BeforeAfterBlock }) => {
  const [sliderPosition, setSliderPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDrag = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setSliderPosition((x / rect.width) * 100)
  }

  return (
    <section className="py-24 bg-[#1E3A5F] text-white">
      <Container>
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            {block.title || 'The Telehealth Difference'}
          </h2>
        </div>

        <div
          ref={containerRef}
          className="relative max-w-4xl mx-auto h-[400px] md:h-[500px] rounded-3xl overflow-hidden cursor-ew-resize select-none shadow-2xl"
          onMouseMove={(e) => e.buttons === 1 && handleDrag(e)}
          onMouseDown={handleDrag}
          onTouchMove={handleDrag}
          onTouchStart={handleDrag}
        >
          {/* Before */}
          <div className="absolute inset-0">
            <img
              src={block.beforeImage.url}
              alt={block.beforeImage.alt || 'Before'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-[#1E3A5F]/20 mix-blend-multiply" />
            <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider">
              {block.beforeLabel || 'Traditional Care'}
            </div>
          </div>

          {/* After */}
          <div
            className="absolute inset-0 overflow-hidden border-r-4 border-white shadow-[4px_0_15px_rgba(0,0,0,0.2)]"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={block.afterImage.url}
              alt={block.afterImage.alt || 'After'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-[#3498DB]/10" />
            <div className="absolute top-6 left-6 bg-[#3498DB] px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider">
              {block.afterLabel || 'Aura Health'}
            </div>
          </div>

          {/* Slider Handle */}
          <div
            className="absolute top-0 bottom-0 w-1 flex items-center justify-center pointer-events-none"
            style={{ left: `calc(${sliderPosition}% - 2px)` }}
          >
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-[#1E3A5F]">
              <div className="flex gap-1">
                <ChevronLeft className="w-4 h-4" />
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

// --- Main Template ---

export function HealthcareTelehealth({ data }: { data?: PageModel }) {
  if (!data) return null

  return (
    <div className="min-h-screen bg-[#F0F7FA] text-[#1E3A5F] font-sans selection:bg-[#3498DB] selection:text-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-xl border-b border-[#E1EEF5] shadow-sm">
        <Container className="flex justify-between items-center h-24">
          <div className="font-bold text-2xl lg:text-3xl tracking-tight text-[#1E3A5F] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3498DB] text-white flex items-center justify-center shadow-md">
              <Activity className="w-6 h-6" />
            </div>
            {(data.title.split('-')[0] || '').trim()}
          </div>
          <div className="hidden lg:flex gap-10 font-bold text-[#4A6B8C]">
            {data.navLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                className="hover:text-[#3498DB] transition-colors tracking-wide"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-6">
            <button className="hidden sm:block font-bold text-[#3498DB] hover:text-[#2980B9] transition-colors px-4 py-2 text-lg">
              Log In
            </button>
            <button className="hidden sm:flex items-center gap-2 font-bold text-white bg-[#3498DB] px-8 py-4 rounded-full hover:bg-[#2980B9] transition-colors shadow-lg hover:shadow-xl text-lg">
              Book Visit
            </button>
            <MobileNav
              links={data.navLinks.map((l) => ({ label: l.label, href: l.url }))}
              overlayClassName="bg-white text-[#1E3A5F]"
              linkClassName="text-2xl font-bold tracking-tight text-[#1E3A5F] hover:text-[#3498DB]"
              iconClassName="w-6 h-6 text-[#1E3A5F]"
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
          case 'service_selector':
            return <ServiceSelectorSection key={index} block={block as ServiceSelectorBlock} />
          case 'faq':
            return <FaqSection key={index} block={block as FaqBlock} />
          case 'testimonials':
            return <TestimonialSection key={index} block={block as TestimonialBlock} />
          case 'form':
            return <FormSection key={index} block={block as FormBlock} />
          case 'booking_picker':
            return <BookingPickerSection key={index} block={block as BookingPickerBlock} />
          case 'timeline':
            return <TimelineScrubberSection key={index} block={block as TimelineBlock} />
          case 'before_after':
            return <BeforeAfterSection key={index} block={block as BeforeAfterBlock} />
          default:
            return null
        }
      })}

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-white py-24 border-t-[12px] border-[#3498DB]">
        <Container className="grid md:grid-cols-2 lg:grid-cols-4 gap-16">
          <div className="lg:col-span-2">
            <div className="font-bold text-3xl tracking-tight mb-8 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#3498DB] text-white flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              {(data.title.split('-')[0] || '').trim()}
            </div>
            <p className="text-white/60 font-medium leading-relaxed max-w-md text-lg">
              Connect with board-certified doctors in minutes. 24/7 access to quality healthcare
              from the comfort of your home.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-8 text-white text-xl">Services</h4>
            <ul className="space-y-5 font-medium text-white/60 text-lg">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Urgent Care
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Mental Health
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Primary Care
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-8 text-white text-xl">Company</h4>
            <ul className="space-y-5 font-medium text-white/60 text-lg">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </Container>
        <Container className="mt-24 pt-10 border-t border-white/10 text-center font-bold text-white/40 uppercase tracking-widest text-sm">
          © 2026 {(data.title.split('-')[0] || '').trim()}. All rights reserved.
        </Container>
      </footer>
    </div>
  )
}
