'use client';

import { Notification } from '@/hooks/useNotification';

interface ToastProps {
  notification: Notification | null;
}

export function Toast({ notification }: ToastProps) {
  if (!notification) return null;

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-orange-500',
  }[notification.type];

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
      <div className={`px-4 py-3 rounded-lg shadow-lg ${bgColor} text-white max-w-md`}>
        <p className="text-sm font-medium">{notification.message}</p>
      </div>
    </div>
  );
}
