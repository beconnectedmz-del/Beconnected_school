package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type stripeGateway struct {
	secretKey string
	http      *http.Client
}

func NewStripe(secretKey string) Gateway {
	return &stripeGateway{
		secretKey: secretKey,
		http:      &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *stripeGateway) Initiate(ctx context.Context, req InitiateRequest) (*InitiateResponse, error) {
	// Create a PaymentIntent
	amountCents := int64(req.Amount * 100)

	params := url.Values{}
	params.Set("amount", fmt.Sprintf("%d", amountCents))
	params.Set("currency", strings.ToLower(req.Currency))
	params.Set("description", req.Description)
	params.Set("metadata[transaction_ref]", req.TransactionRef)
	params.Set("payment_method_types[]", "card")

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.stripe.com/v1/payment_intents",
		strings.NewReader(params.Encode()))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+s.secretKey)
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("stripe: request failed: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)

	var result struct {
		ID           string `json:"id"`
		Status       string `json:"status"`
		ClientSecret string `json:"client_secret"`
		Error        *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("stripe: decode error: %w", err)
	}
	if result.Error != nil {
		return nil, fmt.Errorf("stripe: %s", result.Error.Message)
	}

	status := "pending"
	if result.Status == "succeeded" {
		status = "completed"
	} else if result.Status == "canceled" || result.Status == "requires_payment_method" {
		status = "failed"
	}

	var rawMap map[string]interface{}
	json.Unmarshal(raw, &rawMap)

	return &InitiateResponse{
		GatewayTxID: result.ID,
		Status:      status,
		// For card payments, frontend needs client_secret to complete payment
		RedirectURL: result.ClientSecret,
		Raw:         rawMap,
	}, nil
}

func (s *stripeGateway) QueryStatus(ctx context.Context, gatewayTxID string) (*StatusResponse, error) {
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://api.stripe.com/v1/payment_intents/"+gatewayTxID, nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+s.secretKey)

	resp, err := s.http.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	status := "pending"
	switch result.Status {
	case "succeeded":
		status = "completed"
	case "canceled", "requires_payment_method":
		status = "failed"
	}

	return &StatusResponse{GatewayTxID: gatewayTxID, Status: status}, nil
}

// unused import workaround
var _ = bytes.NewReader
