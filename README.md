# MediBridge Backend

A scalable REST API for a healthcare appointment system built with **Node.js**, **Express**, and **Prisma ORM**.

---

## 🚀 Tech Stack

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Bcrypt
- Zod validation

---

## 📦 Features

- User authentication (Patient / Doctor / Admin)
- Role-based access control
- Doctor management
- Appointment booking system
- Schedule management
- Secure REST APIs
- Input validation with Zod

---

## 🛠️ Installation

```bash
git clone <backend-repo-url>
cd backend
npm install
```

---

## ⚙️ Environment Variables

Create a `.env` file:

```
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/medibridge

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

BCRYPT_SALT_ROUNDS=10

CLIENT_URL=http://localhost:3000
```

---

## 🧱 Prisma Setup

```bash
npx prisma generate
npx prisma migrate dev
```

---

## ▶️ Run Development Server

```bash
npm run dev
```

Server runs at:

```
http://localhost:4000
```

---

## 📡 API Structure

```
/api/v1/auth
/api/v1/users
/api/v1/doctors
/api/v1/appointments
/api/v1/schedules
```

---

## 🔐 Authentication Flow

- JWT-based authentication
- Access token required for protected routes
- Role-based middleware (patient, doctor, admin)

---

## 📁 Project Structure

```
src/
 ├── config/
 ├── jobs/
 ├── helper/
 ├── libs/
 ├── modules/
 │    ├── auth/
 │    ├── users/
 │    ├── doctors/
 │    ├── appointments/
 │    └── schedules/
 ├── middlewares/
 ├── utils/
 ├── app.ts
 └── server.ts
```

---

## 🧪 Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Important Docs Link

- Project Overview - [https://docs.google.com/document/d/1oJNhs9dYbdlLBxWPY2MuMxhHNZJTXlWZfPhXs5dtdSc/edit?tab=t.tpbf5nj3qoz4]
- ERD Diagram - [https://lucid.app/lucidchart/df76cc55-7f6a-4d21-93bf-bfc31eafff5e/edit?view_items=~LW0iTMIlcXW&page=0_0&invitationId=inv_e7b0e1a3-93fa-4c69-a627-d2c84f55a706]

---

## 📄 License

MIT
