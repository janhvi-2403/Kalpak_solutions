'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  Bell,
  CheckCheck,
  Clock,
  AlertTriangle,
  Ticket,
  UserCheck,
  CheckCircle2,
  Lock,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  channel: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count periodically or on mount
  const fetchUnreadCount = async () => {
    try {
      const res = await apiClient<{ unreadCount: number }>('/notifications/unread-count');
      if (res && typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Ignore background errors
    }
  };

  // Fetch full recent notifications when opening dropdown
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<{
        data: NotificationItem[];
        unreadCount: number;
      }>('/notifications', { params: { pageSize: 15 } });

      if (res && Array.isArray(res.data)) {
        setNotifications(res.data);
        if (typeof res.unreadCount === 'number') {
          setUnreadCount(res.unreadCount);
        }
      }
    } catch {
      // Ignore error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 20000); // poll every 20s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient('/notifications/mark-all-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await handleMarkAsRead(item.id);
    }
    setIsOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SLA_BREACH':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'TICKET_ASSIGNED':
        return <UserCheck className="w-4 h-4 text-indigo-600" />;
      case 'TICKET_RESOLVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'TICKET_CLOSED':
        return <Lock className="w-4 h-4 text-slate-500" />;
      case 'STATUS_CHANGED':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'NOTE_ADDED':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'TICKET_CREATED':
      default:
        return <Ticket className="w-4 h-4 text-blue-600" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications & Alerts"
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          isOpen
            ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-100'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="notification-dropdown-panel"
          className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-slate-900 tracking-tight">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                id="mark-all-read-btn"
                onClick={handleMarkAllRead}
                className="text-[12px] font-medium text-blue-600 hover:text-blue-800 flex items-center space-x-1 hover:underline transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">All caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No notifications right now.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isBreach = item.type === 'SLA_BREACH';
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start space-x-3 group relative ${
                      !item.isRead
                        ? isBreach
                          ? 'bg-red-50/50 hover:bg-red-50'
                          : 'bg-blue-50/40 hover:bg-blue-50/70'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${
                        isBreach
                          ? 'bg-red-100 border border-red-200'
                          : !item.isRead
                          ? 'bg-blue-100/70 border border-blue-200'
                          : 'bg-slate-100'
                      }`}
                    >
                      {getNotificationIcon(item.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-bold truncate ${
                            isBreach ? 'text-red-950' : 'text-slate-900'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {formatTimestamp(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                        {item.message}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center space-x-2 mt-1.5">
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.channel}
                        </span>
                        {item.link && (
                          <span className="text-[10px] text-blue-600 font-medium inline-flex items-center space-x-0.5 group-hover:underline">
                            <span>Open</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unread indicator / Mark Read */}
                    {!item.isRead && (
                      <div className="absolute right-3 top-4 flex items-center space-x-1">
                        <button
                          type="button"
                          title="Mark as read"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          className="w-2 h-2 rounded-full bg-blue-600 hover:scale-150 transition-transform"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              href="/dashboard/tickets"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
            >
              View Service Tickets &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
