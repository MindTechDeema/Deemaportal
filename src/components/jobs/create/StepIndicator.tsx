import { Check } from 'lucide-react'

const steps = ['Job details', 'Application form', 'Review and publish']

export default function StepIndicator({ current }: { current: number }) {
  return (
    <ol aria-label="Create job progress" className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
      {steps.map((label, index) => {
        const number = index + 1
        const complete = number < current
        const active = number === current
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${active ? 'bg-teal-50 text-teal-900' : 'text-slate-500'}`}>
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${complete ? 'bg-teal-700 text-white' : active ? 'border-2 border-teal-700 text-teal-700' : 'border border-slate-300'}`}>
              {complete ? <Check className="size-4" aria-hidden="true" /> : number}
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

