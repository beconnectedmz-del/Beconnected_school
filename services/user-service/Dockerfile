FROM golang:1.22-alpine AS builder
ENV GOPROXY=https://proxy.golang.org,direct
ENV GONOSUMDB=*
ENV GOFLAGS=-mod=mod

RUN apk add --no-cache git ca-certificates

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o user-service .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/user-service .
EXPOSE 8082
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8082/health || exit 1
USER nobody
ENTRYPOINT ["./user-service"]
