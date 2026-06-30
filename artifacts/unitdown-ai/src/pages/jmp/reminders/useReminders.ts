import { useState, useCallback } from 'react';

export type ReminderType = 'follow-up' | 'parts' | 'callback' | 'pm' | 'note';
export type ReminderPriority = 'low' | 'normal' | 'high';
export type ReminderStatus = 'open' | 'done';

export interface Reminder {
  id: string;
  title: string;
  type: ReminderType;
  priority: ReminderPriority;
  dueDate: string;
  dueTime?: string;
  linkedUnit?: string;
  notes?: string;
  status: ReminderStatus;
  createdAt: string;
}

function storageKey(userId: string) {
  return `unitdown_reminders_${userId}`;
}

function loadReminders(userId: string): Reminder[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as Reminder[];
  } catch {
    return [];
  }
}

function saveReminders(userId: string, reminders: Reminder[]) {
  if (!userId) return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(reminders));
  } catch { /* ignore quota errors */ }
}

export function useReminders(userId: string) {
  const [reminders, setReminders] = useState<Reminder[]>(() => loadReminders(userId));

  const addReminder = useCallback((data: Omit<Reminder, 'id' | 'status' | 'createdAt'>) => {
    const reminder: Reminder = {
      ...data,
      id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    setReminders(prev => {
      const next = [reminder, ...prev];
      saveReminders(userId, next);
      return next;
    });
  }, [userId]);

  const markDone = useCallback((id: string) => {
    setReminders(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status: 'done' as ReminderStatus } : r);
      saveReminders(userId, next);
      return next;
    });
  }, [userId]);

  const deleteReminder = useCallback((id: string) => {
    setReminders(prev => {
      const next = prev.filter(r => r.id !== id);
      saveReminders(userId, next);
      return next;
    });
  }, [userId]);

  return { reminders, addReminder, markDone, deleteReminder };
}
