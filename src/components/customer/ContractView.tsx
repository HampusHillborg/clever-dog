import { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import type { Dog } from '../../lib/customerApi';
import { buildContractHtml } from '../../lib/contractTemplate';

export default function ContractView({ dog }: { dog: Dog }) {
  const ref = useRef<HTMLDivElement>(null);

  const download = () => {
    if (!ref.current) return;
    html2pdf().from(ref.current).set({
      filename: `Kontrakt-${dog.name}.pdf`,
      margin: 10,
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).save();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Kontrakt</h2>
        <button onClick={download} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">
          Ladda ner PDF
        </button>
      </div>
      <div
        ref={ref}
        className="bg-white rounded-2xl shadow"
        dangerouslySetInnerHTML={{ __html: buildContractHtml(dog) }}
      />
    </div>
  );
}
