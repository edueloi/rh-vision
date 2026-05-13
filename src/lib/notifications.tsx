import React, { createContext, useContext, useState, useCallback } from "react";

export interface AppNotification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  at: Date;
  read: boolean;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  push: (n: Omit<AppNotification, "id" | "at" | "read">) => void;
  markAllRead: () => void;
  clear: () => void;
}

const Ctx = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  push: () => {},
  markAllRead: () => {},
  clear: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const push = useCallback((n: Omit<AppNotification, "id" | "at" | "read">) => {
    setNotifications(prev => [
      { ...n, id: crypto.randomUUID(), at: new Date(), read: false },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Ctx.Provider value={{ notifications, unreadCount, push, markAllRead, clear }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications() {
  return useContext(Ctx);
}
