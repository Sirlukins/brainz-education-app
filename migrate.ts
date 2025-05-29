import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function main() {
  console.log('Running migrations...');

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE,
        has_completed_questionnaire BOOLEAN NOT NULL DEFAULT FALSE,
        aot_score INTEGER,
        total_score INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS aot_questions (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS topic_questions (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_responses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        question_id INTEGER NOT NULL,
        question_type TEXT NOT NULL CHECK (question_type IN ('aot', 'topic')),
        response INTEGER NOT NULL CHECK (response BETWEEN 1 AND 6),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS lst_questions (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);