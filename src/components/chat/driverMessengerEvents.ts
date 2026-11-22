// Small event bus so any header/button can open the global driver messenger.
export const OPEN_DRIVER_MESSENGER = 'open-driver-messenger';

export interface OpenDriverMessengerDetail {
  driverId?: string;
  mode?: 'chats' | 'compose';
}

export const openDriverMessenger = (detail: OpenDriverMessengerDetail = {}) => {
  window.dispatchEvent(new CustomEvent<OpenDriverMessengerDetail>(OPEN_DRIVER_MESSENGER, { detail }));
};
