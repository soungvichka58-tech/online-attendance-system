// Live updates come from the platform's chat-service WebSocket (/ws), which delivers
// {"type", "data"} messages that attendflow-service publishes for the signed-in teacher.
import { API_URL, refreshSession } from './client.js';

const CLOSE_UNAUTHORIZED = 4401;
const CLOSE_POLICY = 1008;

const socketUrl = () => {
  const explicit = import.meta.env?.VITE_WS_URL;
  if (explicit) return explicit;
  if (API_URL) return `${API_URL.replace(/^http/, 'ws')}/ws`;
  return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
};

const listeners = new Map();
let socket = null;
let wanted = false;
let retryDelay = 1000;
let retryTimer = null;

const deliver = (message) => {
  (listeners.get(message.type) || []).forEach((handler) => {
    try {
      handler(message.data);
    } catch (err) {
      console.error(err);
    }
  });
};

function connect() {
  if (!wanted || socket) return;
  const current = new WebSocket(socketUrl());
  socket = current;
  current.onopen = () => {
    retryDelay = 1000;
  };
  current.onmessage = (event) => {
    try {
      deliver(JSON.parse(event.data));
    } catch {
      // Ignore messages that are not JSON.
    }
  };
  current.onclose = async (event) => {
    if (socket === current) socket = null;
    if (!wanted) return;
    if (event.code === CLOSE_POLICY) {
      // This website's origin is not allowed by chat-service; retrying cannot help.
      console.warn('Live updates are unavailable: the realtime server refused this website.');
      wanted = false;
      return;
    }
    if (event.code === CLOSE_UNAUTHORIZED) {
      // The access token expired: refresh the session, then reconnect.
      try {
        await refreshSession();
      } catch {
        wanted = false;
        return;
      }
    }
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 30000);
  };
}

export function startRealtime() {
  wanted = true;
  connect();
}

export function stopRealtime() {
  wanted = false;
  clearTimeout(retryTimer);
  socket?.close();
  socket = null;
}

// Returns an unsubscribe function.
export function onRealtime(type, handler) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(handler);
  return () => listeners.get(type)?.delete(handler);
}

export const ATTENDANCE_CREATED = 'attendflow.attendance.created';
