package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"
)

type Client struct {
	baseURL string
	http    *http.Client
}

func New() *Client {
	return &Client{
		baseURL: os.Getenv("NOTIFICATION_SERVICE_URL"),
		http:    &http.Client{Timeout: 5 * time.Second},
	}
}

func (c *Client) Send(ctx context.Context, notifType string, data map[string]interface{}) {
	if c.baseURL == "" {
		return
	}
	payload := map[string]interface{}{"type": notifType}
	for k, v := range data {
		payload[k] = v
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/notify/internal", bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err == nil {
		resp.Body.Close()
	}
}
