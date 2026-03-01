# Complete App Migration Guide: Base44 → Node.js/Next.js

**Version:** 1.0
**Date:** 2026-02-05
**Status:** Pre-Migration Plan

---

## EXECUTIVE SUMMARY

This guide documents the transition from Base44 to a standard Node.js/Next.js stack:
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (or Clerk for managed option)
- **File Storage:** AWS S3 (dev: local disk)
- **API:** Next.js API routes
- **Frontend:** React + TypeScript (unchanged)
- **Deployment:** Replit / standard Node environment

**Timeline:** 8-10 development days
**Risk Level:** Medium (well-structured, testable)
**Feature Impact:** None (100% feature parity maintained)

---

## PHASE 1: PRE-MIGRATION SETUP

### 1.1 Environment Prep

```bash
# Clone repo
git clone <repo>
cd project

# Install Node 18+ and npm
node --version # Should be 18.x or 20.x
npm --version # 9.x or 10.x

# Install dependencies
npm install

# Install new dependencies needed for migration
npm install -D typescript @types/node @types/react prisma
npm install next-auth @prisma/client openai stripe nodemailer
```

### 1.2 Database Setup

**PostgreSQL Installation:**

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Linux (Ubuntu)
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/

# Verify
psql --version
```

**Create Database:**

```bash
createdb app_production
# Or via psql:
psql -U postgres
CREATE DATABASE app_production;
```

**Connection String (.env.local):**

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/app_production"
```

### 1.3 TypeScript Setup

```bash
# Create tsconfig.json if needed
npx tsc --init

# Install @types packages
npm install -D @types/react @types/node @types/express
```

**tsconfig.json (Base44 Next.js compatible):**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "allowJs": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["components/*"],
      "@/services/*": ["services/*"],
      "@/types/*": ["types/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

---

## PHASE 2: DATABASE & SCHEMA

### 2.1 Setup Prisma

```bash
# Initialize Prisma
npx prisma init

# This creates:
# - prisma/schema.prisma (database schema)
# - .env.local (environment variables)
```

### 2.2 Define Prisma Schema

Create `prisma/schema.prisma` mapping all Base44 entities to PostgreSQL tables.

**Example schema (excerpt):**

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// === USERS & AUTH ===
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  full_name     String?
  phone         String?
  company_name  String?
  password_hash String?   // If using custom auth (not NextAuth)
  
  role          String    @default("user") // "admin" | "user" | "client"
  
  // OAuth/Session (for NextAuth)
  accounts      Account[]
  sessions      Session[]
  
  // Relations
  projects      Project[]      @relation("ClientProjects")
  teamAssignments TeamAssignment[]
  messages      ConversationMessage[]
  
  // Metadata
  onboarding_complete Boolean @default(false)
  onboarding_checklist Json?  // Store as JSON
  selected_template_id String?
  notification_preferences Json? // Notification settings
  
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  @@index([email])
}

// NextAuth tables (required for NextAuth)
model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?  @db.Text
  access_token       String?  @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?  @db.Text
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// === PROJECTS ===
model Project {
  id                String    @id @default(cuid())
  project_name      String
  project_number    String?   @unique
  description       String?   @db.Text
  
  status            String    @default("Planning") 
  // "Planning" | "In Progress" | "On Hold" | "Under Review" | "Completed" | "Closed"
  
  project_type      String?
  // "SWPPP" | "Construction" | "Inspections" | "Engineering" | "Special Inspections" | "Multiple Services"
  
  client_email      String
  client            User       @relation("ClientProjects", fields: [client_email], references: [email])
  
  budget            Float?
  budget_remaining  Float?
  start_date        DateTime?
  end_date          DateTime?
  
  progress_percentage Float @default(0)
  
  // Relations
  milestones        ProjectMilestone[]
  tasks             ProjectTask[]
  documents         ProjectDocument[]
  messages          ConversationMessage[]
  expenses          ProjectExpense[]
  teamAssignments   TeamAssignment[]
  invoices          Invoice[]
  
  created_date      DateTime  @default(now())
  updated_date      DateTime  @updatedAt
  created_by        String? // Email of creator

  @@index([client_email])
  @@index([status])
}

// === TASKS ===
model ProjectTask {
  id                String    @id @default(cuid())
  project_id        String
  project           Project   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  
  task_name         String
  description       String?   @db.Text
  
  status            String    @default("not_started")
  // "not_started" | "in_progress" | "completed" | "blocked"
  
  priority          String    @default("medium")
  // "low" | "medium" | "high" | "critical"
  
  start_date        DateTime?
  end_date          DateTime?
  duration_days     Int?
  
  progress_percentage Float @default(0)
  
  assigned_to       String[]  // Array of email addresses
  estimated_cost    Float?
  actual_cost       Float?
  
  dependencies      String[]  // Task IDs
  
  created_date      DateTime  @default(now())
  updated_date      DateTime  @updatedAt

  @@index([project_id])
}

// === MILESTONES ===
model ProjectMilestone {
  id                String    @id @default(cuid())
  project_id        String
  project           Project   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  
  milestone_name    String
  description       String?   @db.Text
  
  status            String    @default("Pending")
  // "Pending" | "Pending Client Approval" | "Completed" | "Rejected"
  
  due_date          DateTime?
  amount            Float?
  
  order             Int?
  
  created_date      DateTime  @default(now())
  updated_date      DateTime  @updatedAt

  @@index([project_id])
}

// === MESSAGES & COMMUNICATION ===
model ConversationMessage {
  id                String    @id @default(cuid())
  conversation_id   String
  project_id        String
  project           Project   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  
  sender_email      String
  sender_name       String
  sender_role       String    // "admin" | "client" | "team_member"
  
  message           String    @db.Text
  
  attachments       Json?     // Array of file objects: { file_name, file_url, file_type, uploaded_at }
  mentions          String[]  // Email addresses
  
  parent_message_id String?   // For threaded replies
  is_internal       Boolean   @default(false)
  
  read_by           Json?     // Array: [{ email, read_at }]
  
  urgency           String    @default("normal") // "normal" | "high" | "urgent"
  thread_depth      Int       @default(0)
  
  created_date      DateTime  @default(now())
  updated_date      DateTime  @updatedAt

  @@index([project_id])
  @@index([conversation_id])
}

// === INVOICES ===
model Invoice {
  id                String    @id @default(cuid())
  project_id        String
  project           Project   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  
  invoice_number    String    @unique
  client_email      String
  
  total_amount      Float
  amount_paid       Float     @default(0)
  amount_due        Float
  
  status            String    @default("Draft")
  // "Draft" | "Sent" | "Viewed" | "Partial" | "Paid" | "Overdue"
  
  due_date          DateTime?
  payment_date      DateTime?
  
  line_items        Json?     // Array: { description, quantity, rate, amount }
  
  stripe_invoice_id String?
  
  created_date      DateTime  @default(now())
  updated_date      DateTime  @updatedAt

  @@index([client_email])
  @@index([project_id])
}

// === DOCUMENTS ===
model ProjectDocument {
  id                String    @id @default(cuid())
  project_id        String
  project           Project   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  
  document_name     String
  document_type     String?   // "Contract" | "Report" | "Plan" | "Receipt" | "Other"
  
  file_url          String
  file_size         Int?
  
  uploaded_by       String    // Email
  uploaded_date     DateTime  @default(now())
  
  description       String?   @db.Text
  
  created_date      DateTime  @default(now())
  updated_date      DateTime  @updatedAt

  @@index([project_id])
}

// === TEAM ===
model TeamAssignment {
  id                String    @id @default(cuid())
  project_id        String
  project           Project   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  
  user_email        String
  user_name         String
  user              User      @relation(fields: [user_email], references: [email])
  
  role              String
  // "project_manager" | "engineer" | "inspector" | "coordinator" | "consultant"
  
  responsibilities  String[]
  hourly_rate       Float?
  hours_allocated   Float?
  hours_worked      Float     @default(0)
  
  start_date        DateTime?
  end_date          DateTime?
  
  created_date      DateTime  @default(now())
  updated_date      DateTime  @updatedAt

  @@index([project_id])
  @@index([user_email])
}

// === NOTIFICATIONS ===
model Notification {
  id                String    @id @default(cuid())
  recipient_email   String
  
  type              String    // "message" | "approval" | "task" | "invoice" | "project_update" | etc.
  title             String
  message           String    @db.Text
  
  link              String?   // URL to navigate to
  read              Boolean   @default(false)
  read_at           DateTime?
  
  priority          String    @default("medium") // "low" | "medium" | "high" | "urgent"
  related_id        String?   // ID of related entity
  
  metadata          Json?
  
  created_date      DateTime  @default(now())

  @@index([recipient_email])
  @@index([read])
}

// Add more models as needed...
```

### 2.3 Create & Run Migration

```bash
# Generate migration
npx prisma migrate dev --name init

# This creates:
# - prisma/migrations/[timestamp]_init/migration.sql
# - Applies migration to dev database
# - Generates Prisma Client

# For production:
npx prisma migrate deploy
```

---

## PHASE 3: AUTHENTICATION SETUP

### 3.1 NextAuth.js Configuration

**Install:**

```bash
npm install next-auth
```

**Create API route: `pages/api/auth/[...nextauth].ts`**

```typescript
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password_hash || ""
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
        };
      },
    }),
    // Can add OAuth providers here (GitHub, Google, etc.)
  ],
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  
  pages: {
    signIn: "/auth",
  },
};

export default NextAuth(authOptions);
```

### 3.2 Create Auth Service

**`services/auth/index.ts`**

```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function getMe() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  
  return await prisma.user.findUnique({
    where: { email: session.user.email },
  });
}

export async function isAuthenticated() {
  const user = await getMe();
  return !!user;
}

export async function updateProfile(data: any) {
  const user = await getMe();
  if (!user) throw new Error("Not authenticated");
  
  return await prisma.user.update({
    where: { id: user.id },
    data,
  });
}
```

### 3.3 Update Login Page

**`pages/ClientAuth.jsx` (refactored):**

```typescript
"use client";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export default function ClientAuth() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push("/clientportal");
      toast.success("Logged in successfully");
    } else {
      toast.error(result?.error || "Login failed");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
      <form onSubmit={handleLogin} className="w-96 space-y-4">
        <h1 className="text-2xl font-bold">Client Login</h1>
        
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </div>
  );
}
```

---

## PHASE 4: DATA SERVICE LAYER

Create abstraction for database operations so queries are consistent everywhere.

**`services/data/index.ts`**

```typescript
import { prisma } from "@/lib/prisma";

export async function listProjects(clientEmail: string, limit = 50) {
  return prisma.project.findMany({
    where: { client_email: clientEmail },
    orderBy: { created_date: "desc" },
    take: limit,
  });
}

export async function createProject(data: any) {
  return prisma.project.create({ data });
}

export async function updateProject(id: string, data: any) {
  return prisma.project.update({ where: { id }, data });
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } });
}

// Continue for all entities...
```

**Usage in components:**

```typescript
// BEFORE (Base44)
const projects = await base44.entities.Project.filter({ client_email });

// AFTER (Prisma)
import { listProjects } from "@/services/data";
const projects = await listProjects(userEmail);
```

---

## PHASE 5: FILE STORAGE SETUP

### 5.1 AWS S3 (Production)

**Install:**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Create `services/storage/S3StorageService.ts`:**

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_S3_REGION || "us-east-1" });

export async function uploadFile(file: File): Promise<{ url: string; key: string }> {
  const key = `uploads/${Date.now()}-${file.name}`;
  
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: await file.arrayBuffer(),
      ContentType: file.type,
    })
  );

  const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;
  return { url, key };
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    }),
    { expiresIn }
  );
}
```

### 5.2 Local Storage (Development)

**`services/storage/LocalStorageService.ts`:**

```typescript
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function uploadFile(file: File): Promise<{ url: string; key: string }> {
  const buffer = await file.arrayBuffer();
  const filename = `${Date.now()}-${file.name}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  // Ensure directory exists
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  // Write file
  await fs.writeFile(filepath, Buffer.from(buffer));

  return {
    url: `/uploads/${filename}`,
    key: filename,
  };
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  // Local storage doesn't need signed URLs
  return `/uploads/${key}`;
}
```

### 5.3 Use in Components

```typescript
// Update DocumentUploader to use new service
import { uploadFile } from "@/services/storage";

const handleFileUpload = async (file: File) => {
  const { url } = await uploadFile(file);
  // Store url in database
};
```

---

## PHASE 6: EMAIL SERVICE

### 6.1 Setup Nodemailer or Resend

**Option A: Nodemailer (SMTP)**

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

**`services/email/index.ts`:**

```typescript
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || "noreply@example.com",
    to,
    subject,
    html,
  });
}
```

**Option B: Resend (Recommended)**

```bash
npm install resend
```

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string) {
  return resend.emails.send({
    from: "noreply@example.com",
    to,
    subject,
    html,
  });
}
```

---

## PHASE 7: CONVERT TO TYPESCRIPT

Update all `.jsx` files to `.tsx` and add type annotations.

**Example conversion:**

```typescript
// BEFORE (JavaScript)
import React, { useState } from "react";
export default function ClientPortal() {
  const [user, setUser] = useState(null);
  // ...
}

// AFTER (TypeScript)
import React, { useState } from "react";
import { User } from "@/types/models";

export default function ClientPortal() {
  const [user, setUser] = useState<User | null>(null);
  // ...
}
```

**Define types in `types/models.ts`:**

```typescript
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "user" | "client";
  onboarding_complete: boolean;
}

export interface Project {
  id: string;
  project_name: string;
  status: string;
  client_email: string;
  budget: number;
  progress_percentage: number;
  created_date: Date;
  updated_date: Date;
}

// Continue for all entities...
```

---

## PHASE 8: ENVIRONMENT VARIABLES

**`.env.local` (development):**

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/app_dev"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Email
RESEND_API_KEY="your-resend-api-key"
# OR
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"

# File Storage
AWS_S3_BUCKET="app-uploads-dev"
AWS_S3_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"

# LLM
OPENAI_API_KEY="your-openai-key"

# Payments
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
NODE_ENV="development"
```

---

## PHASE 9: DEPLOYMENT TO REPLIT

### 9.1 Replit Setup

1. **Sign up** at replit.com
2. **Create new Repl:**
   - Language: Node.js
   - Import from GitHub (or upload)
3. **Install dependencies:**
   - Replit auto-installs from package.json
   - Run: `npm install`

### 9.2 Database Setup (Replit)

**Option A: Replit's PostgreSQL**

```bash
# Replit provides a free PostgreSQL instance
# Use the DATABASE_URL provided in Replit secrets
```

**Option B: External PostgreSQL (recommended for production)**

Use **Neon.tech** (free PostgreSQL):

```bash
1. Sign up at neon.tech
2. Create database
3. Copy connection string
4. Add to Replit secrets as DATABASE_URL
```

### 9.3 Run on Replit

**`.replit` (config file):**

```bash
run = "npm run dev"
```

**`package.json` (scripts):**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "node scripts/seed.ts"
  }
}
```

### 9.4 Deploy

```bash
# On Replit
1. Click "Run" button
2. App runs at https://your-repl-name.replit.dev

# For production deployment
npm run build
npm run start
```

---

## PHASE 10: TESTING CHECKLIST

After migration, verify:

- [ ] **Auth:** Login/logout works
- [ ] **Data:** Create/read/update/delete works for all entities
- [ ] **Files:** Upload/download works
- [ ] **Email:** Emails send on key events
- [ ] **Notifications:** In-app notifications work
- [ ] **Real-time:** Message subscriptions work (if using socket.io)
- [ ] **UI:** No console errors, no broken links
- [ ] **Performance:** App performs as expected

---

## REFERENCE: FILE STRUCTURE

```
project/
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth].ts (NEW)
│   │   └── ...
│   ├── ClientPortal.tsx (CONVERTED)
│   ├── Home.tsx (CONVERTED)
│   └── ...
├── components/
│   ├── ui/ (unchanged)
│   ├── portal/ (UPDATED)
│   └── ...
├── services/ (NEW)
│   ├── auth/
│   │   └── index.ts
│   ├── data/
│   │   └── index.ts
│   ├── storage/
│   │   ├── S3StorageService.ts
│   │   └── LocalStorageService.ts
│   └── email/
│       └── index.ts
├── types/ (NEW)
│   └── models.ts
├── prisma/
│   ├── schema.prisma (NEW)
│   └── migrations/ (NEW)
├── lib/
│   └── prisma.ts (NEW)
├── tsconfig.json (UPDATED)
├── next.config.js (UPDATED)
├── .env.local (NEW)
└── package.json (UPDATED)
```

---

## TROUBLESHOOTING

### "Cannot find module '@/api/base44Client'"
✅ **Solution:** Remove Base44 imports, use new services instead

### "Prisma client not generated"
✅ **Solution:** Run `npx prisma generate`

### "Database connection error"
✅ **Solution:** Check DATABASE_URL env var, verify PostgreSQL running

### "NextAuth not finding callback"
✅ **Solution:** Ensure route is `pages/api/auth/[...nextauth].ts`, restart dev server

---

## SUCCESS CRITERIA

✅ App runs locally without Base44 SDK
✅ All CRUD operations work
✅ Auth flow works (login/logout/sessions)
✅ Files upload/download correctly
✅ Email notifications send
✅ No TypeScript errors
✅ Tests pass
✅ Deploys to Replit successfully
✅ Feature parity with Base44 version