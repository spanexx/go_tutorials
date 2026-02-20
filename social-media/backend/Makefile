.PHONY: build run test clean migrate-up migrate-down generate docs

# Build the application
build:
	go build -o bin/auth-service ./cmd/auth-service

# Run the application
run:
	go run ./cmd/auth-service

# Run tests
test:
	go test -v ./...

# Run tests with coverage
test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Clean build artifacts
clean:
	rm -rf bin/
	rm -rf coverage.out coverage.html

# Run migrations up
migrate-up:
	migrate -path migrations -database "$(DATABASE_URL)" up

# Run migrations down
migrate-down:
	migrate -path migrations -database "$(DATABASE_URL)" down

# Generate sqlc code
generate:
	sqlc generate

# Generate Swagger documentation
docs:
	swag init -g cmd/auth-service/main.go -o docs

# Install dependencies
deps:
	go mod download
	go install github.com/swaggo/swag/cmd/swag@latest
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
	go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Lint the code
lint:
	golangci-lint run

# Format the code
fmt:
	go fmt ./...

# Vet the code
vet:
	go vet ./...

# Build Docker image
docker-build:
	docker build -t socialhub/auth-service:latest .

# Run with Docker Compose
docker-run:
	docker-compose up -d

# Stop Docker Compose
docker-stop:
	docker-compose down

# View Docker logs
docker-logs:
	docker-compose logs -f
