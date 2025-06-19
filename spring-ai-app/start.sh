#!/bin/bash

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

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Please install Ollama first."
    echo "Visit: https://ollama.ai"
    exit 1
fi

# Check if Ollama is running, start it if not
echo "🔍 Checking if Ollama is running..."
if ! curl -s http://localhost:11434/api/version &> /dev/null; then
    echo "🚀 Starting Ollama..."
    # Start Ollama in the background
    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!
    
    # Wait for Ollama to start (up to 30 seconds)
    echo "⏳ Waiting for Ollama to start..."
    for i in {1..30}; do
        if curl -s http://localhost:11434/api/version &> /dev/null; then
            echo "✅ Ollama is now running (PID: $OLLAMA_PID)"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo "❌ Ollama failed to start within 30 seconds"
            kill $OLLAMA_PID 2>/dev/null
            exit 1
        fi
    done
    
    # Save PID for cleanup
    echo $OLLAMA_PID > .ollama.pid
    STARTED_OLLAMA=true
else
    echo "✅ Ollama is already running"
    STARTED_OLLAMA=false
fi

# Check and pull required models
echo "🔍 Checking required models..."
if ! ollama list | grep -q "llama3.2"; then
    echo "📥 Pulling llama3.2 model (this may take a few minutes)..."
    ollama pull llama3.2
fi

if ! ollama list | grep -q "nomic-embed-text"; then
    echo "📥 Pulling nomic-embed-text model (this may take a few minutes)..."
    ollama pull nomic-embed-text
fi

echo "✅ All models are ready"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    if [ "$STARTED_OLLAMA" = true ] && [ -f .ollama.pid ]; then
        OLLAMA_PID=$(cat .ollama.pid)
        echo "🔄 Stopping Ollama (PID: $OLLAMA_PID)..."
        kill $OLLAMA_PID 2>/dev/null
        rm -f .ollama.pid
    fi
    exit 0
}

# Set up signal handlers for cleanup
trap cleanup SIGINT SIGTERM

echo "📦 Building the application..."
mvn clean compile

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
    echo ""
    echo "🔄 Starting the Spring AI service..."
    echo "The service will be available at: http://localhost:8080"
    echo "API endpoints:"
    echo "  - Chat: POST http://localhost:8080/api/chat"
    echo "  - Topics: GET http://localhost:8080/api/topics"
    echo "  - Stats: GET http://localhost:8080/api/stats"
    echo "  - Web UI: http://localhost:8080"
    echo ""
    echo "Press Ctrl+C to stop the service"
    echo ""
    mvn spring-boot:run
else
    echo "❌ Build failed. Please check the errors above."
    cleanup
    exit 1
fi
