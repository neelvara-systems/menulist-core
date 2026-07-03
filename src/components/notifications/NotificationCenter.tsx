/**
 * Notification Center Component
 * In-app notification system with badge and dropdown
 */

'use client';

import { timeAgo } from '@util/dateTime/timeAgo';
import { Badge, Button, Dropdown, Empty, List, Typography } from 'antd';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  LuAlertTriangle,
  LuBell,
  LuCheck,
  LuCheckCircle,
  LuInfo,
  LuXCircle,
} from 'react-icons/lu';

const { Text } = Typography;

// ================================================================
// TYPES
// ================================================================

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationCenterProps {
  tenantId: string;
  storeId: string;
  maxDisplay?: number;
}

// ================================================================
// COMPONENT
// ================================================================

export function NotificationCenter({
  tenantId,
  storeId,
  maxDisplay = 5,
}: NotificationCenterProps) {
  const t = useTranslations('Common');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [tenantId, storeId]);

  function fetchNotifications() {
    setNotifications([]);
  }

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const dropdownContent = (
    <div
      style={{
        width: 380,
        maxHeight: 500,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text strong style={{ fontSize: 16 }}>
          {t('notifications' as any)}
        </Text>
        {unreadCount > 0 && (
          <Button
            type="text"
            size="small"
            onClick={handleMarkAllAsRead}
            icon={<LuCheck size={14} />}
          >
            {t('markAllRead' as any)}
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <Empty
            description={t('noNotifications' as any)}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            dataSource={notifications.slice(0, maxDisplay)}
            renderItem={notification => (
              <NotificationItem
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
              />
            )}
          />
        )}
      </div>

      {/* Footer */}
      {notifications.length > maxDisplay && (
        <div
          style={{
            padding: 12,
            borderTop: '1px solid #f0f0f0',
            textAlign: 'center',
          }}
        >
          <Button type="link" size="small">
            {t('viewAll')}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge count={unreadCount} offset={[-5, 5]}>
        <Button
          type="text"
          icon={<LuBell size={20} />}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
          }}
        />
      </Badge>
    </Dropdown>
  );
}

// ================================================================
// NOTIFICATION ITEM
// ================================================================

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <LuCheckCircle size={20} color="#52c41a" />;
      case 'warning':
        return <LuAlertTriangle size={20} color="#faad14" />;
      case 'error':
        return <LuXCircle size={20} color="#f5222d" />;
      case 'info':
      default:
        return <LuInfo size={20} color="#1890ff" />;
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          background: notification.read ? '#fff' : '#f5f5f5',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onClick={() => !notification.read && onMarkAsRead(notification.id)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#fafafa';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = notification.read ? '#fff' : '#f5f5f5';
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Icon */}
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            {getIcon()}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 4,
              }}
            >
              <Text strong style={{ fontSize: 14 }}>
                {notification.title}
              </Text>
              {!notification.read && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#1890ff',
                    marginTop: 6,
                    marginLeft: 8,
                  }}
                />
              )}
            </div>

            <Text
              type="secondary"
              style={{
                fontSize: 13,
                display: 'block',
                marginBottom: 6,
                lineHeight: 1.4,
              }}
            >
              {notification.message}
            </Text>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                {timeAgo(notification.timestamp)}
              </Text>

              {notification.actionUrl && notification.actionLabel && (
                <Button type="link" size="small" style={{ padding: 0 }}>
                  {notification.actionLabel} →
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ================================================================
// EXPORTS
// ================================================================

export default NotificationCenter;
