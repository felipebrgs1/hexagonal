# 📋 Cronograma - Sistema de Pedidos (Hexagonal + Domain Events)

## 🎯 Objetivo do Projeto
Sistema de pedidos com **Arquitetura Hexagonal**, **Domain Events**, PostgreSQL e RabbitMQ, com cobertura completa de testes.

**Stack**: Node.js + TypeScript + PostgreSQL + RabbitMQ + Jest

---

## 📅 **FASE 1: Fundação e Infraestrutura (Semana 1)**

### ✅ **Sprint 1.1: Setup Base **
- [x] Inicializar projeto Node.js + TypeScript
- [x] Setup Jest + supertest para testes
- [x] Docker Compose (PostgreSQL + RabbitMQ + App)
- [x] Estrutura hexagonal de pastas:
  ```
  src/
  ├── domain/           # Entidades, VOs, Events
  ├── application/      # Use Cases, Ports
  ├── infrastructure/   # Adapters (DB, Queue, HTTP)
  └── tests/           # Testes integrados
  ```
- [x] Scripts npm e Makefile

### ✅ **Sprint 1.2: Infraestrutura Base **
- [x] **PostgreSQL Adapter**
  - Conexão e migrations (Prisma)
  - Repository pattern base
- [x] **RabbitMQ Adapter** 
  - Publisher/Consumer pattern
  - Connection management
- [x] **Event Dispatcher** para Domain Events
- [x] **Logger** estruturado (winston)
- [x] Testes de infraestrutura

---

## 📅 **FASE 2: Domínio e Domain Events (Semana 2)**

### ✅ **Sprint 2.1: Domain Core**
- [x] **Value Objects**:
  - `Money` (valor + moeda)
  - `ItemPedido` (produto, quantidade, preço)
  - `StatusPedido` enum
- [x] **Entidade `Pedido`** (Aggregate Root):
  - Propriedades básicas
  - Métodos de negócio
  - Validações de invariantes
- [x] **Testes unitários do domínio** (100% cobertura)

### ✅ **Sprint 2.2: Domain Events**
- [x] **Base Events**:
  - `DomainEvent` interface
  - `PedidoCriado`
  - `ItemAdicionado`
  - `StatusAlterado`
  - `PedidoPago`
- [x] **Event Dispatcher** no domínio
- [x] **Testes dos eventos** (criação, dispatch)

---

## 📅 **FASE 3: Use Cases e Ports (Semana 3)**

### ✅ **Sprint 3.1: Ports (Interfaces)**
- [x] `IPedidoRepository` (port secundária)
- [x] `IEventPublisher` (port secundária)
- [x] `INotificacaoService` (port secundária)
- [x] `ICalculadoraDesconto` (port secundária)

### ✅ **Sprint 3.2: Use Cases Core**
- [x] **`CriarPedidoUseCase`**
  - Validações
  - Criação do agregado
  - Dispatch de `PedidoCriado`
- [x] **`AdicionarItemUseCase`**
  - Validar item
  - Adicionar ao pedido
  - Recalcular total
  - Dispatch `ItemAdicionado`
- [x] **Testes unitários dos use cases** (mocks)

### ✅ **Sprint 3.3: Use Cases Avançados**
- [x] **`AtualizarStatusUseCase`**
- [x] **`CalcularTotalUseCase`** (com descontos)
- [x] Testes com cenários complexos

---

## 📅 **FASE 4: Adapters e Integrações (Semana 4)**

### ✅ **Sprint 4.1: Database Adapters**
- [ ] **PostgreSQL Repository**
  - `PedidoRepository` implementação
  - Queries otimizadas
  - Transações
- [ ] **Migrations**
  - Tabela `pedidos`
  - Tabela `itens_pedido`
  - Índices
- [ ] **Testes de integração** (testcontainers)

### ✅ **Sprint 4.2: Message Queue Adapters**
- [ ] **RabbitMQ Publisher**
  - Publicar domain events
  - Dead letter queue
  - Retry policy
- [ ] **Event Handlers**
  - `NotificarEstoque` handler
  - `EnviarEmail` handler (mock)
- [ ] **Testes de mensageria**

### ✅ **Sprint 4.3: HTTP Adapter**
- [ ] **REST Controllers**
  - POST `/pedidos`
  - POST `/pedidos/:id/itens`
  - PUT `/pedidos/:id/status`
  - GET `/pedidos/:id`
- [ ] Middleware de validação
- [ ] Testes E2E

---

## 📅 **FASE 5: Regras de Negócio Avançadas (Semana 5)**

### ✅ **Sprint 5.1: Sistema de Descontos**
- [ ] **Estratégias de Desconto**:
  - Desconto por quantidade
  - Desconto por valor total
  - Cupom de desconto
- [ ] **`CalculadoraDesconto`** service
- [ ] **Events**: `DescontoAplicado`
- [ ] **Testes das regras** de desconto

### ✅ **Sprint 5.2: Workflow Completo**
- [ ] **Máquina de Estados** para status
- [ ] **Validações de transição**
- [ ] **Events**: `PedidoEnviado`, `PedidoEntregue`
- [ ] **Saga pattern** para operações complexas
- [ ] **Testes de fluxo completo**

### ✅ **Sprint 5.3: Notificações Mock**
- [ ] **Service de Estoque** (mock)
- [ ] **Handler** para baixa no estoque
- [ ] **Compensação** em caso de erro
- [ ] Testes de integração

---

## 📅 **FASE 6: Testes e Qualidade (Semana 6)**

### ✅ **Sprint 6.1: Cobertura de Testes**
- [ ] **Testes Unitários**: Domain + Use Cases (>95%)
- [ ] **Testes Integração**: Repositories + Handlers
- [ ] **Testes E2E**: Fluxos completos
- [ ] **Testes Performance**: Load testing básico

### ✅ **Sprint 6.2: Observabilidade**
- [ ] **Logging estruturado** em todos events
- [ ] **Métricas**: Pedidos criados, processados
- [ ] **Health checks**: DB, RabbitMQ
- [ ] **Monitoring** de filas

### ✅ **Sprint 6.3: Deploy e CI/CD**
- [ ] **GitHub Actions**
- [ ] **Docker multi-stage**
- [ ] **Environment configs**
- [ ] **README** completo

---

## 🧪 **Estratégia de Testes**

### **Pirâmide de Testes**
```
    E2E Tests (poucos)
   ╱─────────────────╲
  ╱  Integration Tests  ╲
 ╱─────────────────────────╲
╱      Unit Tests           ╲
╲     (maioria - 70%)      ╱
 ╲─────────────────────────╱
```

### **Tipos de Teste**
- **Unit**: Domain entities, value objects, use cases
- **Integration**: Repositories, event handlers, message queue  
- **E2E**: HTTP endpoints, workflow completo
- **Contract**: Interfaces entre camadas

---

## 🚀 **Entregáveis Principais**

### **Demonstração de Domain Events**
- [ ] Events disparados automaticamente
- [ ] Handlers assíncronos
- [ ] Saga pattern para operações complexas
- [ ] Replay de events para debugging

### **Showcase de Testes**
- [ ] TDD nos use cases
- [ ] Mocks vs Stubs vs Fakes
- [ ] Test doubles para ports
- [ ] Testes de contrato

### **Arquitetura Hexagonal**
- [ ] Inversão de dependência clara
- [ ] Ports e Adapters bem definidos
- [ ] Domain isolado de infraestrutura
- [ ] Facilidade para trocar adapters

---

## 📊 **Métricas de Sucesso**

- ✅ **Cobertura**: >90% nos testes unitários
- ✅ **Performance**: <200ms para criar pedido
- ✅ **Reliability**: 99.9% uptime simulado
- ✅ **Events**: Todos domain events testados
- ✅ **Docs**: README + ADRs completos

---

## 🔧 **Stack Detalhada**

**Core**: Node.js 20+ | TypeScript 5+
**Database**: PostgreSQL 15 + node-postgres
**Queue**: RabbitMQ + amqplib
**Tests**: Jest + supertest + testcontainers
**Infra**: Docker + Docker Compose