# Healthcare Scheduling System

A comprehensive microservice-based healthcare scheduling system.
---

## How to Run the Project

### Prerequisites
- Docker and Docker Compose

### Steps

1. **Clone repository**
```bash
git clone https://github.com/ardianwn/healthcare-scheduling-system
cd healthcare-scheduling-system
```

2. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

3. **Start all services**
```bash
docker-compose up --build -d
```

4. **Verify services are running**
```bash
docker-compose ps
```

5. **Access GraphQL Playground**
- Auth Service: http://localhost:3001/graphql
- Schedule Service: http://localhost:3002/graphql

---

## System Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────┐
│  Auth Service   │      │ Schedule Service │◄─────┤   Redis      │
│   (Port 3001)   │◄─────┤   (Port 3002)    │      │  (Port 6379) │
│                 │      │                  │      │              │
│  - Register     │      │  - Customers     │      │ - Bull Queue │
│  - Login        │      │  - Doctors       │      │ - Caching    │
│  - Validate     │      │  - Schedules     │      └──────────────┘
│                 │      │  - Email Queue   │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌──────────────────┐
│  PostgreSQL     │      │   PostgreSQL     │
│  (auth_db)      │      │  (schedule_db)   │
│  Port 5432      │      │  Port 5433       │
└─────────────────┘      └──────────────────┘
```

**Explanation:**
- **Auth Service**: Handles registration, login, and JWT token validation
- **Schedule Service**: Manages customers, doctors, and schedules data
- **PostgreSQL**: Separate database for each service
- **Redis**: Backend for Bull queue and caching
- **Communication**: Schedule Service validates tokens by calling Auth Service

---

## Environment Variables

### File: `.env`

| Variable | Description | Example Value |
|----------|-------------|---------------|
| **PostgreSQL - Auth Service** | | |
| `POSTGRES_USER` | Auth database username | `postgres` |
| `POSTGRES_PASSWORD` | Auth database password | `postgres123` |
| `POSTGRES_DB` | Auth database name | `auth_db` |
| `AUTH_DATABASE_URL` | Auth service connection string | `postgresql://postgres:postgres123@postgres-auth:5432/auth_db?schema=public` |
| **PostgreSQL - Schedule Service** | | |
| `SCHEDULE_POSTGRES_USER` | Schedule database username | `postgres` |
| `SCHEDULE_POSTGRES_PASSWORD` | Schedule database password | `postgres123` |
| `SCHEDULE_POSTGRES_DB` | Schedule database name | `schedule_db` |
| `SCHEDULE_DATABASE_URL` | Schedule service connection string | `postgresql://postgres:postgres123@postgres-schedule:5433/schedule_db?schema=public` |
| **JWT Configuration** | | |
| `AUTH_JWT_SECRET` | JWT secret key | `your-secret-key-min-32-chars` |
| `AUTH_JWT_EXPIRES_IN` | Token expiry duration | `24h` |
| **Auth Service** | | |
| `AUTH_SERVICE_URL` | Auth service URL (internal Docker) | `http://auth-service:3001/graphql` |
| **Redis Configuration** | | |
| `REDIS_HOST` | Redis host | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| **Email Configuration (Optional)** | | |
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | Sender email | `your-email@gmail.com` |
| `SMTP_PASS` | Gmail App Password (16 char) | `abcd efgh ijkl mnop` |
| `SMTP_FROM` | Sender email | `your-email@gmail.com` |

### How to Generate JWT Secret
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

### How to Get Gmail App Password
1. Enable 2-Factor Authentication on your Gmail account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate a new password
4. Copy the 16-character password to `SMTP_PASS`

---

## GraphQL Queries/Mutations Examples

### Auth Service (Port 3001)

#### 1. Register - Create New User
```graphql
mutation Register {
  register(input: {
    email: "doctor@example.com"
    password: "password123"
  }) {
    accessToken
    user {
      id
      email
      createdAt
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "register": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "uuid-here",
        "email": "doctor@example.com",
        "createdAt": "2026-01-29T10:00:00.000Z"
      }
    }
  }
}
```

#### 2. Login - Get JWT Token
```graphql
mutation Login {
  login(input: {
    email: "doctor@example.com"
    password: "password123"
  }) {
    accessToken
    user {
      id
      email
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "login": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "uuid-here",
        "email": "doctor@example.com"
      }
    }
  }
}
```

#### 3. Validate Token - Validate JWT Token
```graphql
query ValidateToken {
  validateToken(token: "YOUR_JWT_TOKEN_HERE") {
    id
    email
    createdAt
  }
}
```

---

### Schedule Service (Port 3002)

**IMPORTANT:** All Schedule Service endpoints require authentication. Add JWT token to HTTP Headers:

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN_FROM_LOGIN"
}
```

#### 1. Customer - Create New Customer
```graphql
mutation CreateCustomer {
  createCustomer(input: {
    name: "John Doe"
    email: "john@example.com"
  }) {
    id
    name
    email
    createdAt
  }
}
```

#### 2. Customer - Get All Customers (with pagination)
```graphql
query GetCustomers {
  customers(page: 1, limit: 10) {
    customers {
      id
      name
      email
    }
    total
    page
    totalPages
  }
}
```

#### 3. Customer - Get Customer by ID
```graphql
query GetCustomer {
  customer(id: "customer-uuid-here") {
    id
    name
    email
  }
}
```

#### 4. Customer - Update Customer
```graphql
mutation UpdateCustomer {
  updateCustomer(
    id: "customer-uuid-here"
    input: {
      name: "John Updated"
      email: "john.updated@example.com"
    }
  ) {
    id
    name
    email
  }
}
```

#### 5. Customer - Delete Customer
```graphql
mutation DeleteCustomer {
  deleteCustomer(id: "customer-uuid-here") {
    id
    name
  }
}
```

#### 6. Doctor - Create New Doctor
```graphql
mutation CreateDoctor {
  createDoctor(input: {
    name: "Dr. Sarah Smith"
  }) {
    id
    name
    createdAt
  }
}
```

#### 7. Doctor - Get All Doctors (with pagination)
```graphql
query GetDoctors {
  doctors(page: 1, limit: 10) {
    doctors {
      id
      name
    }
    total
    totalPages
  }
}
```

#### 8. Doctor - Get Doctor by ID
```graphql
query GetDoctor {
  doctor(id: "doctor-uuid-here") {
    id
    name
  }
}
```

#### 9. Doctor - Update Doctor
```graphql
mutation UpdateDoctor {
  updateDoctor(
    id: "doctor-uuid-here"
    input: {
      name: "Dr. Sarah Updated"
    }
  ) {
    id
    name
  }
}
```

#### 10. Doctor - Delete Doctor
```graphql
mutation DeleteDoctor {
  deleteDoctor(id: "doctor-uuid-here") {
    id
    name
  }
}
```

#### 11. Schedule - Create New Schedule (with Email Notification)
```graphql
mutation CreateSchedule {
  createSchedule(input: {
    objective: "Annual checkup"
    customerId: "customer-uuid-here"
    doctorId: "doctor-uuid-here"
    scheduledAt: "2026-02-15T10:00:00Z"
  }) {
    id
    objective
    scheduledAt
    customer {
      id
      name
      email
    }
    doctor {
      id
      name
    }
  }
}
```

**Note:** This mutation will automatically:
- Queue email notification to Bull/Redis
- Send email to customer (if SMTP is configured)
- Cache invalidation for schedules list

#### 12. Schedule - Get All Schedules (with filters and pagination)
```graphql
query GetSchedules {
  schedules(
    page: 1
    limit: 10
    customerId: "customer-uuid-here"  # optional
    doctorId: "doctor-uuid-here"      # optional
    startDate: "2026-02-01T00:00:00Z" # optional
    endDate: "2026-02-28T23:59:59Z"   # optional
  ) {
    schedules {
      id
      objective
      scheduledAt
      customer {
        name
        email
      }
      doctor {
        name
      }
    }
    total
    totalPages
  }
}
```

#### 13. Schedule - Get Schedule by ID
```graphql
query GetSchedule {
  schedule(id: "schedule-uuid-here") {
    id
    objective
    scheduledAt
    customer {
      id
      name
      email
    }
    doctor {
      id
      name
    }
  }
}
```

#### 14. Schedule - Delete Schedule (with Cancellation Email)
```graphql
mutation DeleteSchedule {
  deleteSchedule(id: "schedule-uuid-here") {
    id
    objective
    scheduledAt
  }
}
```

**Note:** This mutation will automatically:
- Queue cancellation email notification
- Send cancellation email to customer (if SMTP is configured)
- Cache invalidation for schedules list

---

## Bonus Features

### 1. Email Notifications
- Automatically send email when schedule is created/deleted
- Using Nodemailer + Gmail SMTP
- Professional email templates

### 2. Queue System
- Bull Queue + Redis for async processing
- Retry mechanism (3 attempts with exponential backoff)
- Job persistence in Redis

### 3. Caching
- In-memory caching with @nestjs/cache-manager
- Cache TTL 5 minutes
- Auto invalidation when data changes
- Performance improvement ~95%

### 4. Unit Testing
- 37 test cases (all passing)
- Coverage >50% all services
- Auth Service: 89.18% coverage
- Schedule Service: 85-100% coverage per file

**How to run tests:**
```bash
# Auth Service
docker-compose exec auth-service npm run test:cov

# Schedule Service
docker-compose exec schedule-service npm run test:cov
```

---

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | NestJS | 10.x |
| Database | PostgreSQL | 15-alpine |
| ORM | Prisma | 5.8.0 |
| API | GraphQL (Apollo) | 4.x |
| Authentication | JWT + bcrypt | - |
| Queue | Bull | 4.12.0 |
| Cache | @nestjs/cache-manager | 2.1.1 |
| Email | Nodemailer | 6.9.8 |
| Testing | Jest | 29.x |
| Container | Docker Compose | - |

---