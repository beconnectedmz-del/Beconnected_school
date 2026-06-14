FROM golang:1.22-alpine AS builder
ENV GOPROXY=direct
ENV GONOSUMDB=*
RUN apk add --no-cache git ca-certificates
WORKDIR /app
COPY . .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o course-service .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/course-service .
EXPOSE 8088
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8088/health || exit 1
USER nobody
ENTRYPOINT ["./course-service"]
