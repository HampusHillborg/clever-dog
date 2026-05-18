import { BTN } from '../../lib/uiTokens';

export default function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center px-6 py-10">
      <div className="w-11 h-11 mx-auto rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center mb-3">
        <span className="text-xl">{icon}</span>
      </div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">{body}</p>
      {cta && (
        <button onClick={cta.onClick} className={`${BTN.ghost} mt-4`}>
          {cta.label}
        </button>
      )}
    </div>
  );
}
