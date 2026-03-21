# Technical Specification (TZ)
## Project: Dzen Comments SPA

Version: 1.0  
Prepared by: Senior Full Stack Architecture Draft (.NET + Angular)  
Source basis: task PDF in repository + additional levels (Junior+, Middle)

---

## 1. Goal and Product Vision
Build a SPA web application for managing posts and comments where all UI actions happen without full page reloads.

The system must include:
- **Frontend:** Angular + JavaScript + AJAX (HTTP requests, no full page refresh);
- **Backend:** ASP.NET Core;
- **Data layer:** relational DB through Entity Framework Core;
- **Middle-level additions:** GraphQL, RabbitMQ, Elasticsearch;
- **No cloud dependencies required** (run locally via Docker).

Primary user value:
- fast comment browsing/searching;
- creating/editing/deleting comments in real time UX style;
- scalable architecture suitable for future growth.

---

## 2. Scope

### 2.1 In Scope (MVP + Junior+ + Middle)
1. Authentication and authorization (JWT, roles: User/Admin).
2. CRUD for posts and comments.
3. Comment threading up to configurable depth (default: 3).
4. SPA behavior with optimistic UI updates.
5. REST API for core operations.
6. GraphQL endpoint for flexible query scenarios.
7. Event publication to RabbitMQ on comment lifecycle actions.
8. Async indexing/search in Elasticsearch.
9. Pagination, sorting, filtering.
10. Validation, logging, observability endpoints.
11. Full local deployment through Docker Compose.

### 2.2 Out of Scope
- Cloud managed services.
- Mobile native apps.
- Distributed multi-region deployment.

---

## 3. Functional Requirements

### 3.1 User Management
- Register/login/logout.
- JWT access token + refresh token flow.
- Profile endpoint with basic user info.
- Role-based access control.

### 3.2 Posts
- Create/read/update/delete posts.
- Post list view with pagination and sorting.
- Post details view with comments block.

### 3.3 Comments
- Create comment for a post.
- Reply to comment (nested comments).
- Edit own comment.
- Delete own comment; admin can delete any.
- Soft delete support (optional) with audit trail.

### 3.4 SPA UX Rules
- No full page refresh after auth, post, comment, search, edit, delete actions.
- Update data via AJAX/fetch through Angular HttpClient.
- Display loaders, errors, retry actions.
- Keep route state in Angular Router.

### 3.5 Search (Middle)
- Full text search by comment content and author name in Elasticsearch.
- Filtering by post, date range, user.
- Highlight search fragments.

### 3.6 GraphQL (Middle)
- Query comments/posts with field-level selection.
- Mutations for create/update/delete comment.
- DataLoader to prevent N+1 issue.
- GraphQL authorization policies.

### 3.7 Messaging (Middle)
- Publish domain events:
  - CommentCreated
  - CommentUpdated
  - CommentDeleted
- Consumer updates Elasticsearch index asynchronously.
- Retry policy + dead-letter queue.

---

## 4. Non-Functional Requirements

1. **Performance**
   - API p95 response <= 400 ms for standard list/read requests.
   - Search p95 <= 600 ms for datasets up to 1M comments.
2. **Scalability**
   - Stateless API instances.
   - Horizontal scaling readiness.
3. **Security**
   - JWT auth, password hashing (PBKDF2/BCrypt), CORS policy, input sanitization.
4. **Reliability**
   - Eventual consistency between DB and Elasticsearch via RabbitMQ retries.
5. **Maintainability**
   - SOLID, clean architecture boundaries, high cohesion/low coupling.
6. **Testability**
   - Unit + integration tests for core use cases.

---

## 5. Architecture (Senior Full Stack)

### 5.1 High-Level Components
1. **Angular SPA**
   - presentation, state orchestration, route guards, error handling.
2. **ASP.NET Core API**
   - REST + GraphQL endpoints.
3. **Application Layer**
   - use-cases, commands/queries, validation, policies.
4. **Domain Layer**
   - entities, value objects, domain services, invariants.
5. **Infrastructure Layer**
   - EF Core repositories, RabbitMQ producer/consumer, Elasticsearch adapter.
6. **PostgreSQL**
   - source of truth.
7. **RabbitMQ**
   - event bus.
8. **Elasticsearch**
   - search index.

### 5.2 OOP and SOLID Mapping
- **S**RP: separate handlers/services per business capability.
- **O**CP: extensible search and transport providers through interfaces.
- **L**SP: repository abstractions replaceable by test doubles.
- **I**SP: small interfaces (ICommentSearchService, IEventPublisher, ITokenService).
- **D**IP: application depends on abstractions, wiring in composition root.

### 5.3 Suggested Project Structure
- `src/backend/Dzen.Api`
- `src/backend/Dzen.Application`
- `src/backend/Dzen.Domain`
- `src/backend/Dzen.Infrastructure`
- `src/backend/Dzen.Contracts`
- `src/frontend/dzen-web`
- `tests/unit`
- `tests/integration`

---

## 6. Data Model (Core)

### 6.1 Entities
- **User**: Id, Email, PasswordHash, Role, CreatedAt.
- **Post**: Id, Title, Body, AuthorId, CreatedAt, UpdatedAt.
- **Comment**: Id, PostId, ParentCommentId(nullable), AuthorId, Content, Status, CreatedAt, UpdatedAt.
- **RefreshToken**: Id, UserId, Token, ExpiresAt, RevokedAt.

### 6.2 Constraints
- Comment content length: 1..2000 chars.
- Post title: 3..200 chars.
- One parent per comment; root comments have ParentCommentId=null.

### 6.3 Indexing
- DB indexes: PostId, ParentCommentId, AuthorId, CreatedAt.
- Elasticsearch index: comments text analyzer + keyword fields for filtering.

---

## 7. API Contract (Draft)

### 7.1 REST
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/posts`
- `GET /api/posts/{id}`
- `POST /api/posts`
- `PUT /api/posts/{id}`
- `DELETE /api/posts/{id}`
- `GET /api/posts/{postId}/comments`
- `POST /api/posts/{postId}/comments`
- `PUT /api/comments/{id}`
- `DELETE /api/comments/{id}`
- `GET /api/search/comments?q=...`

### 7.2 GraphQL
- endpoint: `/graphql`
- queries: `posts`, `post(id)`, `comments(postId, filter)`
- mutations: `createComment`, `updateComment`, `deleteComment`

---

## 8. Frontend Requirements (Angular)

1. Angular standalone architecture or NgModules (team preference).
2. State strategy: RxJS services first; optionally NgRx for scaling.
3. Feature modules/pages:
   - Auth
   - Post List
   - Post Details
   - Comments Tree
   - Search
   - Admin
4. Reusable components:
   - comment-item
   - comment-form
   - pagination
   - notification/toast
5. HTTP interceptors:
   - auth token attach
   - global error handler
6. Route guards for role-restricted pages.

---

## 9. Backend Requirements (ASP.NET Core)

1. ASP.NET Core 8 (or latest LTS).
2. EF Core + PostgreSQL provider.
3. CQRS-style handlers in Application layer.
4. FluentValidation for requests.
5. MediatR (optional) for clean command/query flow.
6. Serilog structured logging.
7. GraphQL via HotChocolate.
8. RabbitMQ client + hosted background consumers.
9. Elasticsearch client integration.

---

## 10. Event Flow

1. User creates comment in SPA.
2. API validates command and writes to PostgreSQL.
3. API publishes CommentCreated event to RabbitMQ.
4. Search indexer consumer receives event and updates Elasticsearch.
5. SPA can poll or receive updated search results in next request.

Consistency model: transactional write to DB, asynchronous search index update (eventual consistency).

---

## 11. Validation and Error Handling
- Unified error envelope with code/message/details.
- Domain-specific exceptions translated to 4xx.
- Unexpected exceptions logged and returned as 500 with trace id.

---

## 12. Testing Strategy

1. Unit tests:
   - domain invariants
   - command/query handlers
   - validators
2. Integration tests:
   - API + testcontainers for Postgres/RabbitMQ/Elasticsearch.
3. Frontend tests:
   - component tests
   - core user flow e2e.

Minimum coverage target: 70% for backend business logic.

---

## 13. DevOps and Containers

### 13.1 Docker Compose Services
- `api` (ASP.NET Core)
- `web` (Angular app served via Nginx)
- `postgres`
- `rabbitmq`
- `elasticsearch`
- `kibana` (optional local diagnostics)

### 13.2 Environment Variables
- Connection strings, JWT secrets, RabbitMQ host, Elastic host, CORS origins.

### 13.3 Run Modes
- Development: mounted source + hot reload.
- Production-like local: optimized images.

---

## 14. Milestones
1. M1: project skeleton + auth + posts CRUD.
2. M2: comments tree + SPA interactions.
3. M3: GraphQL schema and resolvers.
4. M4: RabbitMQ events + Elasticsearch indexing/search.
5. M5: tests, hardening, documentation.

---

## 15. Acceptance Criteria
- SPA behavior without full page reload for core scenarios.
- CRUD operations for posts and comments work with role rules.
- GraphQL endpoint operational with auth and pagination.
- RabbitMQ events produced and consumed.
- Elasticsearch search available and returns expected results.
- One-command local startup via Docker Compose.
- README contains setup/run/test steps.

---

## 16. Risks and Mitigations
- Eventual consistency confusion -> show UI note "search may update in a few seconds".
- N+1 in GraphQL -> DataLoader mandatory.
- Deep nesting performance -> max depth + flattened query options.

---

## 17. Deliverables
1. `tz.pdf` - this technical specification in PDF format.
2. `README.md` - setup and architecture guide.
3. Docker files for local execution.

