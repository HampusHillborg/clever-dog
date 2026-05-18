import { useState } from 'react';
import { FaHome, FaCalendarAlt, FaImages, FaCommentDots, FaArrowRight } from 'react-icons/fa';

const STORAGE_KEY = 'cleverdog-onboarding-v1';

const STEPS = [
  {
    icon: <FaHome />,
    title: 'Hem',
    body: 'Här ser du när din hund är inbokad härnäst, senaste bilden från personalen och dagens dagrapport om den finns.',
    bg: 'from-orange-100 to-amber-50',
    iconBg: 'bg-orange-500',
  },
  {
    icon: <FaCalendarAlt />,
    title: 'Kalender',
    body: 'Begär extra dagar, avboka eller pensionat. Röda dagar och egna stängningar visas tydligt.',
    bg: 'from-purple-100 to-orange-50',
    iconBg: 'bg-purple-500',
  },
  {
    icon: <FaImages />,
    title: 'Album',
    body: 'Bilder och små uppdateringar från personalen under dagen.',
    bg: 'from-rose-100 to-orange-50',
    iconBg: 'bg-rose-500',
  },
  {
    icon: <FaCommentDots />,
    title: 'Chat',
    body: 'Skriv till personalen om något — frågor, ändringar, allt som rör din hund.',
    bg: 'from-sky-100 to-orange-50',
    iconBg: 'bg-sky-500',
  },
];

export const hasSeenOnboarding = (): boolean => {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return true; }
};

export const markOnboardingSeen = () => {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* localStorage might be blocked */ }
};

export default function OnboardingSheet({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      markOnboardingSeen();
      onDone();
    } else {
      setStep(step + 1);
    }
  };

  const skip = () => {
    markOnboardingSeen();
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-dark/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-lift animate-slide-in-top overflow-hidden">
        <div className={`bg-gradient-to-br ${current.bg} p-8 sm:p-10 flex items-center justify-center`}>
          <div className={`w-24 h-24 rounded-3xl ${current.iconBg} text-white flex items-center justify-center shadow-pop`}>
            <span className="text-4xl">{current.icon}</span>
          </div>
        </div>
        <div className="p-6">
          <h2 className="text-2xl font-bold tracking-tight mb-2">{current.title}</h2>
          <p className="text-gray-600 leading-relaxed">{current.body}</p>

          <div className="flex items-center gap-1.5 mt-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i === step ? 'bg-primary' : i < step ? 'bg-orange-300' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-5">
            <button
              onClick={skip}
              className="text-sm text-gray-500 hover:text-gray-900 px-2 py-2"
            >
              Hoppa över
            </button>
            <button
              onClick={next}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 active:scale-95 transition-all shadow-card"
            >
              {isLast ? 'Kom igång' : 'Nästa'}
              <FaArrowRight className="text-xs" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
