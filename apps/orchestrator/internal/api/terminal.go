package api

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/hyperclaw/orchestrator/internal/instances"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, check origin properly
		return true
	},
}

// handleSerialConsole proxies WebSocket to Firecracker serial console
func handleSerialConsole(conn *websocket.Conn, instance *instances.Instance) {
	log.Printf("WebSocket connected to instance %s", instance.ID)

	// Send welcome message
	conn.WriteMessage(websocket.TextMessage, []byte("Connected to HyperClaw instance: "+instance.Name))
	conn.WriteMessage(websocket.TextMessage, []byte("\r\nModel: "+instance.Model))
	conn.WriteMessage(websocket.TextMessage, []byte("\r\nStatus: "+instance.Status))
	conn.WriteMessage(websocket.TextMessage, []byte("\r\n\r\n$ "))

	// TODO: Connect to actual Firecracker serial socket
	// For now, simulate a terminal echo
	
	done := make(chan struct{})
	
	// Read from WebSocket
	go func() {
		defer close(done)
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway) {
					log.Printf("WebSocket error: %v", err)
				}
				break
			}

			msg := string(message)
			log.Printf("Received from %s: %s", instance.ID, msg)
			
			// Handle resize events
			if len(msg) > 7 && msg[:7] == "resize:" {
				conn.WriteMessage(websocket.TextMessage, []byte("\r\nTerminal resized.\r\n$ "))
				continue
			}
			
			// Echo back (simulated terminal)
			conn.WriteMessage(websocket.TextMessage, []byte(msg))
			
			// Simulate command response
			switch msg {
			case "\r", "\n":
				conn.WriteMessage(websocket.TextMessage, []byte("\r\n$ "))
			case "help\r", "help\n":
				conn.WriteMessage(websocket.TextMessage, []byte("\r\nCommands: help, status, exit\r\n$ "))
			case "status\r", "status\n":
				conn.WriteMessage(websocket.TextMessage, []byte("\r\nInstance: "+instance.Name))
				conn.WriteMessage(websocket.TextMessage, []byte("\r\nStatus: "+instance.Status))
				conn.WriteMessage(websocket.TextMessage, []byte("\r\nModel: "+instance.Model))
				conn.WriteMessage(websocket.TextMessage, []byte("\r\n$ "))
			case "exit\r", "exit\n":
				conn.WriteMessage(websocket.TextMessage, []byte("\r\nGoodbye!\r\n"))
				conn.Close()
				return
			}
		}
	}()

	// Keepalive ping
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// WebSocketMessage represents a message format for terminal
type WebSocketMessage struct {
	Type    string `json:"type"`    // "input", "resize", "ping"
	Data    string `json:"data"`    // Terminal input or command
	Rows    int    `json:"rows"`    // For resize events
	Cols    int    `json:"cols"`    // For resize events
}

// WriteJSON writes a JSON message to the WebSocket
func WriteJSON(conn *websocket.Conn, v interface{}) error {
	return conn.WriteJSON(v)
}

// ReadJSON reads a JSON message from the WebSocket
func ReadJSON(conn *websocket.Conn, v interface{}) error {
	return conn.ReadJSON(v)
}