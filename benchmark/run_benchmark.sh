#!/bin/bash

# 🚀 Script de Benchmark Automatizado
# Sistema de Pedidos - Hexagonal Architecture

set -e

echo "🔥 INICIANDO BENCHMARK DO SISTEMA DE PEDIDOS"
echo "============================================="

# Verificar se a aplicação está rodando
echo "📡 Verificando se a aplicação está rodando..."
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "❌ Aplicação não está rodando!"
    echo "💡 Execute: bun run start &"
    exit 1
fi

echo "✅ Aplicação está online!"
echo ""

# Criar diretório de resultados
mkdir -p benchmark/results
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_DIR="benchmark/results/$TIMESTAMP"
mkdir -p "$RESULTS_DIR"

echo "📊 EXECUTANDO BATERIA DE TESTES..."
echo "Resultados serão salvos em: $RESULTS_DIR"
echo ""

# Teste 1: Quick burst test
echo "🚀 Teste 1: Quick Burst (1000 requests)"
npx artillery quick --count 10 --num 100 http://localhost:3000/health \
    > "$RESULTS_DIR/quick_burst.txt" 2>&1
echo "✅ Concluído!"

# Teste 2: Sustained load
echo "🔄 Teste 2: Carga Sustentada (60s @ 50 QPS)"
npx artillery run benchmark/quick-test.yml \
    --output "$RESULTS_DIR/sustained_load.json" \
    > "$RESULTS_DIR/sustained_load.txt" 2>&1
echo "✅ Concluído!"

# Teste 3: Comprehensive load test (se arquivo existir)
if [ -f "benchmark/load-test.yml" ]; then
    echo "📈 Teste 3: Teste Completo (Progressive Load)"
    npx artillery run benchmark/load-test.yml \
        --output "$RESULTS_DIR/comprehensive_load.json" \
        > "$RESULTS_DIR/comprehensive_load.txt" 2>&1 || true
    echo "✅ Concluído!"
fi

# Gerar relatórios HTML
echo "📑 Gerando relatórios HTML..."
for json_file in "$RESULTS_DIR"/*.json; do
    if [ -f "$json_file" ]; then
        base_name=$(basename "$json_file" .json)
        npx artillery report "$json_file" \
            --output "$RESULTS_DIR/${base_name}_report.html" 2>/dev/null || true
    fi
done

# Métricas do sistema
echo "💻 Coletando métricas do sistema..."
{
    echo "=== SYSTEM METRICS ==="
    echo "Timestamp: $(date)"
    echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    echo "Memory Usage:"
    free -h
    echo ""
    echo "Node.js Processes:"
    ps aux | grep -E "(node|bun)" | grep -v grep
} > "$RESULTS_DIR/system_metrics.txt"

# Sumário dos resultados
echo ""
echo "📊 RESUMO DOS RESULTADOS"
echo "========================"

# Extrair QPS do quick test
QUICK_QPS=$(grep "http.request_rate" "$RESULTS_DIR/quick_burst.txt" | tail -1 | awk '{print $2}' | cut -d'/' -f1)
echo "🚀 Quick Burst QPS: ${QUICK_QPS:-"N/A"}"

# Extrair tempo de resposta médio
QUICK_MEAN=$(grep "mean:" "$RESULTS_DIR/quick_burst.txt" | head -1 | awk '{print $2}')
echo "⚡ Response Time Mean: ${QUICK_MEAN:-"N/A"}ms"

# Extrair P95
QUICK_P95=$(grep "p95:" "$RESULTS_DIR/quick_burst.txt" | head -1 | awk '{print $2}')
echo "📊 Response Time P95: ${QUICK_P95:-"N/A"}ms"

echo ""
echo "✅ BENCHMARK CONCLUÍDO!"
echo "📁 Resultados salvos em: $RESULTS_DIR"
echo "🌐 Relatórios HTML disponíveis para visualização"
echo ""
echo "🔗 Para visualizar:"
echo "   open $RESULTS_DIR/*_report.html"
