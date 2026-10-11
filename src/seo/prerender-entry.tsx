import { MemoryRouter } from 'react-router-dom';
import { BookingProvider } from '../components/BookingContext';
import StaffanstorpPage from '../pages/StaffanstorpPage';
import ServicePage from '../pages/ServicePage';
import { servicePages } from './pages';
import i18n from '../i18n';

export { servicePages };
export async function publicTree(path: string) {
  await i18n.changeLanguage('sv');
  const page = servicePages.find(item => item.path === path);
  return <MemoryRouter initialEntries={[path]}><BookingProvider>
    {path === '/' ? <StaffanstorpPage /> : page ? <ServicePage page={page} /> : null}
  </BookingProvider></MemoryRouter>;
}
