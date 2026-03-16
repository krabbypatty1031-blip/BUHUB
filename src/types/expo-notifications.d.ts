declare module 'expo-notifications' {
  export interface EventSubscription {
    remove: () => void;
  }

  export type PermissionStatus = 'undetermined' | 'denied' | 'granted';

  export interface NotificationPermissionsStatus {
    status: PermissionStatus;
    granted?: boolean;
  }

  export interface ExpoPushToken {
    data: string;
  }

  export interface NotificationRequestContent {
    data?: Record<string, unknown>;
  }

  export interface NotificationRequest {
    identifier: string;
    content: NotificationRequestContent;
  }

  export interface Notification {
    request: NotificationRequest;
  }

  export interface NotificationResponse {
    notification: Notification;
    actionIdentifier?: string;
  }

  export interface NotificationBehavior {
    shouldShowBanner?: boolean;
    shouldShowList?: boolean;
    shouldPlaySound?: boolean;
    shouldSetBadge?: boolean;
  }

  export const AndroidImportance: {
    MAX: number;
  };

  export function setNotificationHandler(handler: {
    handleNotification: () => Promise<NotificationBehavior> | NotificationBehavior;
  }): void;

  export function getPermissionsAsync(): Promise<NotificationPermissionsStatus>;
  export function requestPermissionsAsync(): Promise<NotificationPermissionsStatus>;
  export function getExpoPushTokenAsync(options?: { projectId?: string }): Promise<ExpoPushToken>;
  export function getLastNotificationResponseAsync(): Promise<NotificationResponse | null>;
  export function addNotificationReceivedListener(
    listener: (notification: Notification) => void
  ): EventSubscription;
  export function addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void
  ): EventSubscription;
  export function setBadgeCountAsync(badgeCount: number): Promise<boolean>;
  export function setNotificationChannelAsync(
    channelId: string,
    channel: {
      name: string;
      importance: number;
      vibrationPattern?: number[];
      lightColor?: string;
    }
  ): Promise<void>;
}
