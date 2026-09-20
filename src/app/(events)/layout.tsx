/**
 * Events + check-in live outside the staff (coach) layout so alum
 * `hoya_alum_session` can use them. Pages still require getEventActor.
 * This group does not unlock Data Sync, blast, or Register myself.
 */
export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
