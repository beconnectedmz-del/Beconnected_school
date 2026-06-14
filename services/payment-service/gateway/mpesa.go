package gateway

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// MpesaConfig holds Vodacom Mozambique M-Pesa IPG credentials.
type MpesaConfig struct {
	APIKey              string
	SecretKey           string
	ServiceProviderCode string // assigned by Vodacom e.g. "171717"
	Sandbox             bool
}

type mpesaGateway struct {
	cfg        MpesaConfig
	baseURL    string
	http       *http.Client
	mu         sync.Mutex
	token      string
	tokenExpiry time.Time
}

func NewMpesa(cfg MpesaConfig) Gateway {
	base := "https://api.vm.co.mz:8443"
	if cfg.Sandbox {
		base = "https://api.sandbox.vm.co.mz:8443"
	}
	return &mpesaGateway{
		cfg:     cfg,
		baseURL: base,
		http:    &http.Client{Timeout: 30 * time.Second},
	}
}

// ─── Bearer token (cached) ────────────────────────────────────────────────────
func (m *mpesaGateway) getToken(ctx context.Context) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if time.Now().Before(m.tokenExpiry) && m.token != "" {
		return m.token, nil
	}

	creds := base64.StdEncoding.EncodeToString([]byte(m.cfg.APIKey + ":" + m.cfg.SecretKey))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, m.baseURL+"/getbearertoken", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Basic "+creds)
	req.Header.Set("Origin", "developer.vo.mz")

	resp, err := m.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("mpesa: token request failed: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		OutputResponseCode string `json:"output_responseCode"`
		OutputToken        string `json:"output_token"`
		OutputError        string `json:"output_error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("mpesa: token decode error: %w", err)
	}
	if result.OutputResponseCode != "INS-0" {
		return "", fmt.Errorf("mpesa: token error %s: %s", result.OutputResponseCode, result.OutputError)
	}

	m.token = result.OutputToken
	m.tokenExpiry = time.Now().Add(55 * time.Minute) // tokens valid for ~1h
	return m.token, nil
}

// ─── C2B Single Stage Payment ─────────────────────────────────────────────────
func (m *mpesaGateway) Initiate(ctx context.Context, req InitiateRequest) (*InitiateResponse, error) {
	token, err := m.getToken(ctx)
	if err != nil {
		return nil, err
	}

	payload := map[string]string{
		"input_TransactionReference":  req.TransactionRef,
		"input_CustomerMSISDN":        req.CustomerPhone,
		"input_Amount":                fmt.Sprintf("%.0f", req.Amount),
		"input_Currency":              req.Currency,
		"input_ServiceProviderCode":   m.cfg.ServiceProviderCode,
		"input_ThirdPartyReference":   req.TransactionRef,
		"input_PurchasedItemsDesc":    req.Description,
	}

	body, _ := json.Marshal(payload)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		m.baseURL+"/ipg/v1x/c2bPayment/singleStage/", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Origin", "developer.vo.mz")

	resp, err := m.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("mpesa: initiate request failed: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		OutputResponseCode          string `json:"output_responseCode"`
		OutputResponseDesc          string `json:"output_responseDesc"`
		OutputTransactionID         string `json:"output_transactionID"`
		OutputThirdPartyReference   string `json:"output_thirdPartyReference"`
		OutputConversationID        string `json:"output_conversationID"`
	}
	raw, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("mpesa: initiate decode error: %w", err)
	}

	// INS-0 = success, INS-1 = internal error, INS-6 = insufficient funds, etc.
	status := "pending"
	if result.OutputResponseCode == "INS-0" {
		status = "completed"
	} else if result.OutputResponseCode != "" {
		return nil, fmt.Errorf("mpesa: %s — %s", result.OutputResponseCode, result.OutputResponseDesc)
	}

	var rawMap map[string]interface{}
	json.Unmarshal(raw, &rawMap)

	return &InitiateResponse{
		GatewayTxID: result.OutputTransactionID,
		Status:      status,
		Raw:         rawMap,
	}, nil
}

// ─── Query Transaction Status ─────────────────────────────────────────────────
func (m *mpesaGateway) QueryStatus(ctx context.Context, gatewayTxID string) (*StatusResponse, error) {
	token, err := m.getToken(ctx)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/ipg/v1x/queryTransactionStatus/?input_QueryReference=%s&input_ServiceProviderCode=%s&input_ThirdPartyReference=%s",
		m.baseURL, gatewayTxID, m.cfg.ServiceProviderCode, gatewayTxID)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Origin", "developer.vo.mz")

	resp, err := m.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		OutputResponseCode string `json:"output_responseCode"`
		OutputResponseDesc string `json:"output_responseDesc"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	status := "pending"
	switch result.OutputResponseCode {
	case "INS-0":
		status = "completed"
	case "INS-1", "INS-6", "INS-9", "INS-10":
		status = "failed"
	}

	return &StatusResponse{
		GatewayTxID: gatewayTxID,
		Status:      status,
	}, nil
}
