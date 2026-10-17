export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

export function permission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

/** Must be called from a tap handler. */
export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  try { return await Notification.requestPermission() } catch { return Notification.permission }
}

/** Local notification, only while the app is open and permission was granted. */
export function notifyIfAllowed(title: string, body: string, tag?: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try { new Notification(title, { body, tag, icon: '/favicon.ico' }) } catch { /* some browsers require a service worker */ }
}
