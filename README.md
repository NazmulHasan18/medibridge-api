# Next Blog Starter

A simple **Blog Application Starter Pack** built with **TypeScript, Express.js**.  
This project is designed for the **Next Level Web Development Bootcamp** to help learners practice Prisma hands-on by building a blog platform.

---

## Features

- TypeScript + Express.js setup
- Modular project structure
- Environment configuration with `dotenv`
- Ready to extend with blog modules (Posts, Users, etc.)

---

## Installation

Clone the repository:

```bash
git clone https://github.com/Apollo-Level2-Web-Dev/next-blog-starter.git
cd next-blog-starter
```

Install dependencies:

```bash
# using npm
npm install

# using yarn
yarn install

# using pnpm
pnpm install
```

Setup environment variables:

```bash
cp .env.example .env
```

Run the development server:

```bash
# using npm
npm run dev

# using yarn
yarn dev

# using pnpm
pnpm dev
```

---

## Folder Structure

```
Prisma-Blog/
│── node_modules/          # Dependencies
│── src/
│   ├── app.ts             # Express app configuration
│   ├── server.ts          # Server entry point
│   ├── config/            # Environment & configuration files
│   └── modules/           # Application modules (posts, users, etc.)
│── package.json           # Project metadata & scripts
│── pnpm-lock.yaml         # Lockfile (pnpm)
│── tsconfig.json          # TypeScript configuration
│── README.md              # Documentation
```

---

## Scripts

```bash
# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

---

## Important Docs Link

- Project Overview - [https://docs.google.com/document/d/1oJNhs9dYbdlLBxWPY2MuMxhHNZJTXlWZfPhXs5dtdSc/edit?tab=t.tpbf5nj3qoz4]
- ERD Diagram - [https://lucid.app/lucidchart/df76cc55-7f6a-4d21-93bf-bfc31eafff5e/edit?view_items=~LW0iTMIlcXW&page=0_0&invitationId=inv_e7b0e1a3-93fa-4c69-a627-d2c84f55a706]
