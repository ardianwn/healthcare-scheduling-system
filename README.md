# Healthcare Scheduling System

Sistem penjadwalan konsultasi healthcare berbasis microservice dengan fitur email notification, queue processing, caching, dan unit testing.

---

## Cara Menjalankan Project

### Prerequisites
- Docker dan Docker Compose

### Langkah-langkah

1. **Clone repository**
```bash
git clone https://github.com/ardianwn/healthcare-scheduling-system
cd healthcare-scheduling-system
```

2. **Konfigurasi environment variables**
```bash
cp .env.example .env
# Edit .env dengan credentials Anda
```

3. **Jalankan semua services**
```bash
docker-compose up --build -d
```

4. **Verifikasi services berjalan**
```bash
docker-compose ps
```

5. **Akses GraphQL Playground**
- Auth Service: http://localhost:3001/graphql
- Schedule Service: http://localhost:3002/graphql

---

## Arsitektur Sistem

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

**Penjelasan:**
- **Auth Service**: Mengelola registrasi, login, dan validasi JWT token
- **Schedule Service**: Mengelola data customers, doctors, dan schedules
- **PostgreSQL**: Database terpisah untuk setiap service
- **Redis**: Backend untuk Bull queue dan caching
- **Komunikasi**: Schedule Service memvalidasi token dengan memanggil Auth Service

---

## Environment Variables

### File: `.env`

| Variable | Deskripsi | Contoh Value |
|----------|-----------|--------------|
| **PostgreSQL - Auth Service** | | |
| `POSTGRES_USER` | Username database auth | `postgres` |
| `POSTGRES_PASSWORD` | Password database auth | `postgres123` |
| `POSTGRES_DB` | Nama database auth | `auth_db` |
| `AUTH_DATABASE_URL` | Connection string auth service | `postgresql://postgres:postgres123@postgres-auth:5432/auth_db?schema=public` |
| **PostgreSQL - Schedule Service** | | |
| `SCHEDULE_POSTGRES_USER` | Username database schedule | `postgres` |
| `SCHEDULE_POSTGRES_PASSWORD` | Password database schedule | `postgres123` |
| `SCHEDULE_POSTGRES_DB` | Nama database schedule | `schedule_db` |
| `SCHEDULE_DATABASE_URL` | Connection string schedule service | `postgresql://postgres:postgres123@postgres-schedule:5433/schedule_db?schema=public` |
| **JWT Configuration** | | |
| `AUTH_JWT_SECRET` | Secret key untuk JWT | `your-secret-key-min-32-chars` |
| `AUTH_JWT_EXPIRES_IN` | Durasi expiry token | `24h` |
| **Auth Service** | | |
| `AUTH_SERVICE_URL` | URL auth service (internal Docker) | `http://auth-service:3001/graphql` |
| **Redis Configuration** | | |
| `REDIS_HOST` | Redis host | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| **Email Configuration (Optional)** | | |
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | Email pengirim | `your-email@gmail.com` |
| `SMTP_PASS` | Gmail App Password (16 char) | `abcd efgh ijkl mnop` |
| `SMTP_FROM` | Email pengirim | `your-email@gmail.com` |

### Cara Generate JWT Secret
```bash
# Menggunakan Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Menggunakan OpenSSL
openssl rand -hex 32
```

### Cara Mendapatkan Gmail App Password
1. Aktifkan 2-Factor Authentication di Gmail
2. Buka: https://myaccount.google.com/apppasswords
3. Generate password baru
4. Copy 16-character password ke `SMTP_PASS`

---

## Contoh GraphQL Queries/Mutations

### Auth Service (Port 3001)

#### 1. Register - Registrasi User Baru
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

#### 2. Login - Mendapatkan JWT Token
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

#### 3. Validate Token - Validasi JWT Token
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

**PENTING:** Semua endpoint Schedule Service memerlukan authentication. Tambahkan JWT token ke HTTP Headers:

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN_FROM_LOGIN"
}
```

#### 1. Customer - Buat Customer Baru
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

#### 2. Customer - Get Semua Customers (dengan pagination)
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

#### 6. Doctor - Buat Doctor Baru
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

#### 7. Doctor - Get Semua Doctors (dengan pagination)
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

#### 11. Schedule - Buat Schedule Baru (dengan Email Notification)
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

**Note:** Mutation ini akan otomatis:
- Queue email notification ke Bull/Redis
- Send email ke customer (jika SMTP dikonfigurasi)
- Cache invalidation untuk schedules list

#### 12. Schedule - Get Semua Schedules (dengan filter dan pagination)
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

#### 14. Schedule - Delete Schedule (dengan Cancellation Email)
```graphql
mutation DeleteSchedule {
  deleteSchedule(id: "schedule-uuid-here") {
    id
    objective
    scheduledAt
  }
}
```

**Note:** Mutation ini akan otomatis:
- Queue cancellation email notification
- Send cancellation email ke customer (jika SMTP dikonfigurasi)
- Cache invalidation untuk schedules list

---

## Fitur Bonus

### 1. Email Notifications
- Otomatis send email saat schedule dibuat/dihapus
- Menggunakan Nodemailer + Gmail SMTP
- Email template profesional

### 2. Queue System
- Bull Queue + Redis untuk async processing
- Retry mechanism (3 attempts dengan exponential backoff)
- Job persistence di Redis

### 3. Caching
- In-memory caching dengan @nestjs/cache-manager
- Cache TTL 5 menit
- Auto invalidation saat data berubah
- Performance improvement ~95%

### 4. Unit Testing
- 37 test cases (semua passing)
- Coverage >50% semua services
- Auth Service: 89.18% coverage
- Schedule Service: 85-100% coverage per file

**Cara run tests:**
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