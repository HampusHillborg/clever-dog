// Build-time rendering must never initialize auth or access customer data.
// BookingForm is closed during rendering; this function must never be invoked.
export function saveApplication() {
  throw new Error('Database access is forbidden during static prerendering');
}
