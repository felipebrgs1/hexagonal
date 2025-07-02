.PHONY: help install dev build start test test-watch test-coverage clean docker-up docker-down docker-logs migrate generate studio

# Default target
help:
	@echo "Available commands:"
	@echo "  install        - Install dependencies"
	@echo "  dev           - Start development server with watch"
	@echo "  build         - Build the project"
	@echo "  start         - Start the production server"
	@echo "  test          - Run all tests"
	@echo "  test-watch    - Run tests in watch mode"
	@echo "  test-coverage - Run tests with coverage report"
	@echo "  clean         - Clean build artifacts and logs"
	@echo "  docker-up     - Start all services with Docker"
	@echo "  docker-down   - Stop all Docker services"
	@echo "  docker-logs   - Show Docker logs"
	@echo "  migrate       - Run database migrations"
	@echo "  generate      - Generate Prisma client"
	@echo "  studio        - Open Prisma Studio"

# Development commands
install:
	bun install

dev:
	bun run dev

build:
	bun run build

start:
	bun run start

# Testing commands
test:
	bun run test

test-watch:
	bun run test:watch

test-coverage:
	bun run test:coverage

# Docker commands
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-studio:
	docker compose --profile tools up prisma-studio

# Database commands
migrate:
	bun run migrate

generate:
	bun run generate

studio:
	bun run studio

# Utility commands
clean:
	rm -rf node_modules
	rm -rf coverage
	rm -rf logs
	rm -rf dist

lint:
	bun run lint

lint-fix:
	bun run lint --fix

# Full setup for new developers
setup: install generate migrate
	@echo "Project setup complete! Run 'make dev' to start development."
