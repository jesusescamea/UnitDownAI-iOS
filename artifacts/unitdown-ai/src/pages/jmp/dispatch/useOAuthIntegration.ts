import { useState, useEffect, useCallback, useRef } from 'react';

export type OAuthProvider = 'outlook' | 'google';

export interface OAuthStatus {
  configured: boolean;
  connected:  boolean;
}

export interface GraphCalendarEvent {
  id:          string;
  subject:     string;
  start:       { dateTime?: string; date?: string };
  end:         { dateTime?: string; date?: string };
  location?:   { displayName?: string };
  bodyPreview?: string;
  body?:       { content?: string; contentType?: string };
}

export interface GoogleCalendarEvent {
  id:          string;
  summary?:    string;
  start:       { dateTime?: string; date?: string };
  end:         { dateTime?: string; date?: string };
  location?:   string;
  description?: string;
}

export type CalendarEvent = GraphCalendarEvent | GoogleCalendarEvent;

export interface GmailMessage {
  id:      string;
  snippet?: string;
  payload?: {
    headers?: { name: string; value: string }[];
  };
}

export interface GraphMailMessage {
  id:               string;
  subject?:         string;
  from?:            { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  bodyPreview?:     string;
}

export type MailMessage = GmailMessage | GraphMailMessage;

export function isGraphMail(m: MailMessage): m is GraphMailMessage {
  return 'bodyPreview' in m || ('from' in m && typeof (m as GraphMailMessage).from === 'object' && !Array.isArray((m as GraphMailMessage).from));
}

export function getMailSubject(m: MailMessage): string {
  if (isGraphMail(m)) return (m as GraphMailMessage).subject ?? '(no subject)';
  const gm = m as GmailMessage;
  return gm.payload?.headers?.find(h => h.name === 'Subject')?.value ?? '(no subject)';
}

export function getMailSnippet(m: MailMessage): string {
  if (isGraphMail(m)) return (m as GraphMailMessage).bodyPreview ?? '';
  return (m as GmailMessage).snippet ?? '';
}

export function getMailFrom(m: MailMessage): string {
  if (isGraphMail(m)) {
    const ea = (m as GraphMailMessage).from?.emailAddress;
    return ea?.name ?? ea?.address ?? '';
  }
  const gm = m as GmailMessage;
  return gm.payload?.headers?.find(h => h.name === 'From')?.value ?? '';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOAuthIntegration(provider: OAuthProvider, userId: string | undefined) {
  const [status,      setStatus]      = useState<OAuthStatus>({ configured: false, connected: false });
  const [statusLoading, setStatusLoading] = useState(true);
  const [events,      setEvents]      = useState<CalendarEvent[]>([]);
  const [messages,    setMessages]    = useState<MailMessage[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [connecting,  setConnecting]  = useState(false);
  const [error,       setError]       = useState('');

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupRef  = useRef<Window | null>(null);

  const checkStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/integrations/${provider}/status?clientId=${userId}`, { credentials: 'include' });
      if (res.ok) setStatus(await res.json() as OAuthStatus);
    } catch { /* network - ignore */ }
  }, [provider, userId]);

  useEffect(() => {
    let alive = true;
    setStatusLoading(true);
    checkStatus().finally(() => { if (alive) setStatusLoading(false); });
    return () => { alive = false; };
  }, [checkStatus]);

  const connect = useCallback(async () => {
    if (!userId) return;
    setError('');
    setConnecting(true);
    try {
      const res = await fetch(`/api/integrations/${provider}/auth-url?clientId=${userId}`, { credentials: 'include' });
      if (!res.ok) {
        setError('Could not start authentication. Please try again.');
        setConnecting(false);
        return;
      }
      const { url } = await res.json() as { url: string };

      const popup = window.open(url, `${provider}_oauth`, 'width=600,height=720,scrollbars=yes,resizable=yes');
      popupRef.current = popup;

      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        setConnecting(false);
      };

      const onMessage = (evt: MessageEvent) => {
        if (evt.data?.type === 'oauth_success' && evt.data?.provider === provider) {
          cleanup();
          checkStatus();
        }
        if (evt.data?.type === 'oauth_error') {
          cleanup();
          setError('Connection failed or was cancelled.');
        }
      };
      window.addEventListener('message', onMessage);

      pollRef.current = setInterval(() => {
        if (popupRef.current?.closed) {
          cleanup();
          checkStatus();
        }
      }, 1500);
    } catch {
      setError('Connection failed. Please try again.');
      setConnecting(false);
    }
  }, [provider, userId, checkStatus]);

  const disconnect = useCallback(async () => {
    if (!userId) return;
    setError('');
    try {
      await fetch(`/api/integrations/${provider}/disconnect?clientId=${userId}`, { method: 'DELETE', credentials: 'include' });
      setStatus(s => ({ ...s, connected: false }));
      setEvents([]);
      setMessages([]);
    } catch {
      setError('Failed to disconnect. Please try again.');
    }
  }, [provider, userId]);

  const fetchCalendarEvents = useCallback(async () => {
    if (!userId) return;
    setDataLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/integrations/${provider}/calendar/events?clientId=${userId}`, { credentials: 'include' });
      if (res.status === 401) {
        setStatus(s => ({ ...s, connected: false }));
        setError('Session expired. Please reconnect.');
        return;
      }
      if (!res.ok) { setError('Could not fetch events. Please try again.'); return; }
      const data = await res.json() as { events: CalendarEvent[] };
      setEvents(data.events ?? []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setDataLoading(false);
    }
  }, [provider, userId]);

  const fetchEmails = useCallback(async () => {
    if (!userId) return;
    setDataLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/integrations/${provider}/mail?clientId=${userId}`, { credentials: 'include' });
      if (res.status === 401) {
        setStatus(s => ({ ...s, connected: false }));
        setError('Session expired. Please reconnect.');
        return;
      }
      if (!res.ok) { setError('Could not fetch emails. Please try again.'); return; }
      const data = await res.json() as { messages: MailMessage[] };
      setMessages(data.messages ?? []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setDataLoading(false);
    }
  }, [provider, userId]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  return {
    status, statusLoading, events, messages, dataLoading, connecting, error,
    connect, disconnect, fetchCalendarEvents, fetchEmails, setError,
  };
}
