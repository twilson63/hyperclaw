import { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalProps {
  url?: string;
}

export function Terminal({ url }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerminal | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!containerRef.current || !url) return;

    // Initialize terminal
    const terminal = new XTerminal({
      theme: {
        background: '#0a0a0f',
        foreground: '#f0f0f5',
        cursor: '#00e5ff',
        cursorAccent: '#00e5ff',
        selectionBackground: 'rgba(0, 229, 255, 0.3)',
        black: '#0a0a0f',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#6272a4',
        magenta: '#ff79c6',
        cyan: '#00e5ff',
        white: '#f0f0f5',
        brightBlack: '#606070',
        brightRed: '#ff6e6e',
        brightGreen: '#69ffa8',
        brightYellow: '#ffffa1',
        brightBlue: '#8292ff',
        brightMagenta: '#ff92df',
        brightCyan: '#66f1ff',
        brightWhite: '#ffffff',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 14,
      lineHeight: 1.6,
      cursorBlink: true,
      cursorStyle: 'block',
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;

    // Connect WebSocket
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      terminal.writeln('\x1b[1;36mConnected to instance\x1b[0m');
      terminal.writeln('');
    };

    socket.onmessage = (event) => {
      const data = event.data;
      if (typeof data === 'string') {
        terminal.write(data);
      }
    };

    socket.onerror = () => {
      terminal.writeln('\x1b[1;31mConnection error\x1b[0m');
    };

    socket.onclose = () => {
      terminal.writeln('\x1b[1;33mConnection closed\x1b[0m');
    };

    // Handle terminal input
    terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      const { cols, rows } = terminal;
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.close();
      terminal.dispose();
    };
  }, [url]);

  if (!url) {
    return (
      <div className="flex items-center justify-center py-8 text-text-muted">
        No connection URL provided
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-80 bg-bg-primary"
      style={{ height: '320px' }}
    />
  );
}