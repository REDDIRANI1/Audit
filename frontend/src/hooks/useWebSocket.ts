/**
 * useWebSocket.ts
 *
 * Custom hook for connecting to the backend WebSocket server.
 * Handles connection lifecycle, reconnection, and typed messages.
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("http", "ws") ?? "ws://localhost:8000";

export type WsMessage = Record<string, unknown>;

interface UseWebSocketOptions {
    onMessage?: (msg: WsMessage) => void;
    enabled?: boolean;
}

export function useWebSocket(path: string, options: UseWebSocketOptions = {}) {
    const { onMessage, enabled = true } = options;
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const unmounted = useRef(false);

    const connect = useCallback(() => {
        if (unmounted.current || !enabled) return;

        const url = `${WS_BASE}${path}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!unmounted.current) setConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data: WsMessage = JSON.parse(event.data);
                onMessage?.(data);
            } catch {
                // ignore non-JSON
            }
        };

        ws.onclose = () => {
            if (!unmounted.current) {
                setConnected(false);
                // Reconnect after 3 seconds
                reconnectTimer.current = setTimeout(connect, 3000);
            }
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [path, enabled, onMessage]);

    useEffect(() => {
        unmounted.current = false;
        if (enabled) connect();

        return () => {
            unmounted.current = true;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [connect, enabled]);

    const send = useCallback((msg: WsMessage) => {
        wsRef.current?.send(JSON.stringify(msg));
    }, []);

    return { connected, send };
}
