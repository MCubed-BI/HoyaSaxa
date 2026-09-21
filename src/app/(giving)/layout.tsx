/**
 * Giving lives outside the staff (coach) layout so claimed alum /
 * `hoya_alum_session` can open /giving. This group does not unlock
 * Data Sync, blast, Admin login, or /fundraising campaign tools.
 */
export default function GivingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
