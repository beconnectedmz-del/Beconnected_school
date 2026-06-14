FROM golang:1.22-alpine AS builder
ENV GOPROXY=direct
ENV GONOSUMDB=*
RUN apk add --no-cache git ca-certificates
WORKDIR /app
COPY . .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o payment-service .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/payment-service .
EXPOSE 8083
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8083/health || exit 1
USER nobody
ENTRYPOINT ["./payment-service"]
