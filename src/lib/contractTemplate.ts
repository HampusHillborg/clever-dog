import type { Dog } from './customerApi';
import { PRICES } from './prices';

type ContractType = 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding';

const TYPE_LABEL: Record<ContractType, string> = {
  fulltime: 'Heltidsdagis',
  'parttime-3': 'Deltidsdagis 3 dgr/vecka',
  'parttime-2': 'Deltidsdagis 2 dgr/vecka',
  singleDay: 'Enstaka dag',
  boarding: 'Hundpensionat',
};

const priceFor = (t: ContractType): string => {
  switch (t) {
    case 'fulltime': return `${PRICES.staffanstorp.fulltime} kr/månad`;
    case 'parttime-3': return `${PRICES.staffanstorp.parttime3} kr/månad`;
    case 'parttime-2': return `${PRICES.staffanstorp.parttime2} kr/månad`;
    case 'singleDay': return `${PRICES.staffanstorp.singleDay} kr/dag`;
    case 'boarding': return `${PRICES.staffanstorp.boarding} kr/dygn`;
  }
};

const escape = (s: string | null | undefined) =>
  (s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const buildContractHtml = (dog: Dog): string => {
  const t = (dog.type as ContractType | null) ?? 'fulltime';
  const label = TYPE_LABEL[t] ?? 'Hunddagis';
  const price = priceFor(t);

  return `
<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 720px; color: #222;">
  <h1 style="margin:0 0 6px 0;">CleverDog Hunddagis</h1>
  <p style="color:#666; margin: 0 0 24px 0;">Kontrakt — ${label}</p>

  <h2 style="font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Hundens uppgifter</h2>
  <table style="width:100%; border-collapse: collapse; margin-bottom: 16px;">
    <tbody>
      <tr><td style="padding:4px 8px; color:#666;">Namn</td><td style="padding:4px 8px;">${escape(dog.name)}</td></tr>
      <tr><td style="padding:4px 8px; color:#666;">Ras</td><td style="padding:4px 8px;">${escape(dog.breed)}</td></tr>
      <tr><td style="padding:4px 8px; color:#666;">Ålder</td><td style="padding:4px 8px;">${escape(dog.age)}</td></tr>
      <tr><td style="padding:4px 8px; color:#666;">Kön</td><td style="padding:4px 8px;">${escape(dog.gender)}</td></tr>
      <tr><td style="padding:4px 8px; color:#666;">Födelsedatum</td><td style="padding:4px 8px;">${escape(dog.birth_date)}</td></tr>
      <tr><td style="padding:4px 8px; color:#666;">Chip-nr</td><td style="padding:4px 8px;">${escape(dog.chip_number)}</td></tr>
      <tr><td style="padding:4px 8px; color:#666;">Försäkringsbolag</td><td style="padding:4px 8px;">${escape(dog.insurance_company)}</td></tr>
      <tr><td style="padding:4px 8px; color:#666;">Försäkringsnr</td><td style="padding:4px 8px;">${escape(dog.insurance_number)}</td></tr>
    </tbody>
  </table>

  <h2 style="font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Ägarens uppgifter</h2>
  <table style="width:100%; border-collapse: collapse; margin-bottom: 16px;">
    <tbody>
      <tr><td style="padding:4px 8px; color:#666;">Namn</td><td style="padding:4px 8px;">${escape(dog.owner)}</td></tr>
      <tr><td style="padding:4px 8px; color:#666;">Personnummer</td><td style="padding:4px 8px;">${escape(dog.owner_personal_number)}</td></tr>
      <tr><td style="padding:4px 8px; color:#666;">Adress</td><td style="padding:4px 8px;">${escape(dog.owner_address)}</td></tr>
      <tr><td style="padding:4px 8px; color:#666;">Stad</td><td style="padding:4px 8px;">${escape(dog.owner_city)}</td></tr>
      <tr><td style="padding:4px 8px; color:#666;">Telefon</td><td style="padding:4px 8px;">${escape(dog.phone)}</td></tr>
      <tr><td style="padding:4px 8px; color:#666;">E-post</td><td style="padding:4px 8px;">${escape(dog.email)}</td></tr>
    </tbody>
  </table>

  <h2 style="font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Tjänst</h2>
  <p><strong>${label}</strong> &mdash; ${price}</p>
  <p style="color:#666; font-size:0.85rem;">Pris exklusive moms. Vid frågor kontakta CleverDog.</p>

  <p style="margin-top:40px; color:#666; font-size:0.75rem;">
    Detta är en sammanställning av ditt kontrakt. Originalkontraktet är det som signerades vid inskrivning.
  </p>
</div>
  `.trim();
};
