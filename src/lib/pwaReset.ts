export const PWA_RESET_STORAGE_KEY = "novare-pwa-reset-token";
export const PWA_RESET_CHANNEL = "novare-pwa-reset";

type ResetOptions = {
  token: string;
  reload?: boolean;
  broadcastLocal?: boolean;
};

const deleteDatabase = (name: string) =>
  new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });

const clearIndexedDB = async () => {
  if (!("indexedDB" in window) || !("databases" in indexedDB)) return;
  const databases = await indexedDB.databases();
  await Promise.allSettled(databases.map((db) => (db.name ? deleteDatabase(db.name) : Promise.resolve())));
};

const clearCaches = async () => {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.allSettled(keys.map((key) => caches.delete(key)));
};

const unregisterServiceWorkers = async () => {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(registrations.map((registration) => registration.unregister()));
};

export const resetLocalPwaState = async ({ token, reload = true, broadcastLocal = false }: ResetOptions) => {
  if (broadcastLocal && "BroadcastChannel" in window) {
    const channel = new BroadcastChannel(PWA_RESET_CHANNEL);
    channel.postMessage({ type: "reset", token });
    channel.close();
  }

  await Promise.allSettled([clearCaches(), unregisterServiceWorkers(), clearIndexedDB()]);

  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem(PWA_RESET_STORAGE_KEY, token);

  if (reload) window.location.reload();
};