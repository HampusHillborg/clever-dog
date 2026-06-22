import { useRef } from 'react';
import type { Dog } from '../../lib/customerApi';
import { buildContractHtml } from '../../lib/contractTemplate';

export default function ContractView({ dog }: { dog: Dog }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Kontrakt</h2>
      <div
        ref={ref}
        className="bg-white rounded-2xl shadow"
        dangerouslySetInnerHTML={{ __html: buildContractHtml(dog) }}
      />
    </div>
  );
}
