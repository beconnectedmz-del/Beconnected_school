package gateway

import (
	"context"
	"errors"
	"os"
)

// ErrPaymentFailed is returned when a gateway rejects the payment.
var ErrPaymentFailed = errors.New("pagamento rejeitado pelo gateway")

// InitiateRequest holds the parameters needed to start a payment.
type InitiateRequest struct {
	TransactionRef string  // internal ID
	CustomerPhone  string  // MSISDN e.g. "258841234567"
	Amount         float64 // in MZN (or gateway currency)
	Currency       string  // "MZN"
	Description    string
}

// InitiateResponse is returned after the gateway accepts the payment request.
type InitiateResponse struct {
	GatewayTxID    string // gateway transaction ID
	Status         string // "pending" | "completed" | "failed"
	RedirectURL    string // for card payments (empty for M-Pesa push)
	Raw            map[string]interface{}
}

// StatusResponse is returned when querying a transaction.
type StatusResponse struct {
	GatewayTxID string
	Status      string // "pending" | "completed" | "failed"
}

// Gateway defines the interface all payment providers must implement.
type Gateway interface {
	Initiate(ctx context.Context, req InitiateRequest) (*InitiateResponse, error)
	QueryStatus(ctx context.Context, gatewayTxID string) (*StatusResponse, error)
}

// New returns the configured gateway based on PAYMENT_GATEWAY env var.
// Defaults to mpesa.
func New() Gateway {
	switch os.Getenv("PAYMENT_GATEWAY") {
	case "stripe":
		return NewStripe(os.Getenv("PAYMENT_GATEWAY_KEY"))
	default:
		return NewMpesa(MpesaConfig{
			APIKey:              os.Getenv("PAYMENT_GATEWAY_KEY"),
			SecretKey:           os.Getenv("PAYMENT_GATEWAY_SECRET"),
			ServiceProviderCode: os.Getenv("MPESA_SP_CODE"),
			Sandbox:             os.Getenv("APP_ENV") != "production",
		})
	}
}
