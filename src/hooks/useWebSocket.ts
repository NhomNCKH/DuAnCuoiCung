// hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";

const RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 10000; // 10 seconds
const WEBSOCKET_TIMEOUT = 15000; // 15 seconds timeout

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: "ping" }));
        } catch (e) {
          console.error("Failed to send heartbeat:", e);
        }
      }
    }, 30000); // Ping every 30 seconds
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const attemptConnection = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.error("WebSocket connection timeout");
          ws.close();
          setIsConnected(false);
        }
      }, WEBSOCKET_TIMEOUT);

      ws.onopen = () => {
        clearConnectionTimeout();
        console.log("WebSocket connected");
        setIsConnected(true);
        reconnectCountRef.current = 0; // Reset reconnect count on success
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        setLastMessage(event.data);
      };

      ws.onerror = (error) => {
        clearConnectionTimeout();
        console.error("WebSocket error:", error);
        setIsConnected(false);
        stopHeartbeat();
      };

      ws.onclose = () => {
        clearConnectionTimeout();
        console.log("WebSocket disconnected");
        setIsConnected(false);
        stopHeartbeat();

        // Attempt to reconnect with exponential backoff
        if (reconnectCountRef.current < RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectCountRef.current),
            MAX_RECONNECT_DELAY,
          );
          console.log(
            `Attempting to reconnect in ${delay}ms (attempt ${reconnectCountRef.current + 1}/${RECONNECT_ATTEMPTS})`,
          );
          reconnectCountRef.current += 1;
          reconnectTimerRef.current = setTimeout(() => {
            attemptConnection();
          }, delay);
        } else {
          console.error(
            "Max reconnection attempts reached. WebSocket connection failed.",
          );
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setIsConnected(false);
    }
  }, [url, startHeartbeat, stopHeartbeat, clearConnectionTimeout]);

  useEffect(() => {
    attemptConnection();

    return () => {
      clearReconnectTimer();
      clearConnectionTimeout();
      stopHeartbeat();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [
    url,
    attemptConnection,
    clearReconnectTimer,
    clearConnectionTimeout,
    stopHeartbeat,
  ]);

  const sendMessage = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(data);
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    } else {
      console.warn(
        "WebSocket is not connected. Message not sent.",
        "State:",
        wsRef.current?.readyState,
      );
    }
  }, []);

  return { sendMessage, lastMessage, isConnected };
};
