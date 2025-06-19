#!/bin/bash

echo "🔍 HELLO FROM NEW START SCRIPT"
echo "🔍 DEBUG - Environment variables at script start:"
echo "  VITE_GITHUB_TOKEN: ${VITE_GITHUB_TOKEN:-[NOT SET]}"
echo "  VITE_PERSONAL_GITHUB_TOKEN: ${VITE_PERSONAL_GITHUB_TOKEN:-[NOT SET]}"
echo "  VITE_ORG: ${VITE_ORG:-[NOT SET]}"

# X9 Chat AI Startup Script
echo "🚀 Starting X9 Chat AI Service..."

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install Java 21 or later."
    exit 1
fi

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "❌ Maven is not installed. Please install Maven."
    exit 1
fi

# Check if Ollama is running
echo "🔍 Checking if Ollama is running..."
if ! curl -s http://localhost:11434/api/version &> /dev/null; then
    echo "⚠️  Ollama is not running. Starting Ollama..."
    echo "Please ensure Ollama is installed and run: ollama serve"
    echo "Also make sure you have the required models:"
    echo "  ollama pull llama3.2"
    echo "  ollama pull nomic-embed-text"
    exit 1
fi

echo "✅ Ollama is already running"

# Check required models
echo "🔍 Checking required models..."
if ! ollama list | grep -q "llama3.2" || ! ollama list | grep -q "nomic-embed-text"; then
    echo "⚠️  Required models not found. Installing..."
    ollama pull llama3.2
    ollama pull nomic-embed-text
fi

echo "✅ All models are ready"

# Navigate to the Spring AI app directory
cd "$(dirname "$0")"

echo "📦 Building the application..."
mvn clean compile

echo "🔄 Starting the Spring AI service..."
echo "The service will be available at: http://localhost:8081"
echo "API endpoints:"
echo "  - Chat: POST http://localhost:8081/api/chat"
echo "  - Topics: GET http://localhost:8081/api/topics"
echo "  - Stats: GET http://localhost:8081/api/stats"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

# Get environment variables from parent process
GITHUB_TOKEN="${VITE_GITHUB_TOKEN:-}"
PERSONAL_GITHUB_TOKEN="${VITE_PERSONAL_GITHUB_TOKEN:-}"
ORG="${VITE_ORG:-}"

echo "🔑 Final environment check before starting Maven:"
echo "  GITHUB_TOKEN: ${GITHUB_TOKEN:+[PRESENT]} ${GITHUB_TOKEN:-[MISSING]}"
echo "  PERSONAL_GITHUB_TOKEN: ${PERSONAL_GITHUB_TOKEN:+[PRESENT]} ${PERSONAL_GITHUB_TOKEN:-[MISSING]}"
echo "  ORG: ${ORG:-[MISSING]}"

# Run with environment variables passed directly as system properties
mvn spring-boot:run -DVITE_GITHUB_TOKEN="${GITHUB_TOKEN}" -DVITE_PERSONAL_GITHUB_TOKEN="${PERSONAL_GITHUB_TOKEN}" -DVITE_ORG="${ORG}"
