import { pgTable, text, serial, timestamp, boolean, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  displayName: text("display_name"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false).notNull(),
  hasCompletedQuestionnaire: boolean("has_completed_questionnaire").default(false).notNull(),
  aotScore: integer("aot_score"),
  totalScore: integer("total_score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Registration schema with enhanced validation
export const registerUserSchema = z.object({
  username: z.string()
    .min(1, "Username is required")
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters"),
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .refine(
      (email) => email.toLowerCase().endsWith('@education.nsw.gov.au'),
      "Must be a valid @education.nsw.gov.au email address"
    ),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
});

// Login schema (username and password only)
export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// User response schema for onboarding questionnaires
export const userResponseSchema = z.object({
  questionId: z.number(),
  questionType: z.enum(['aot', 'topic']),
  response: z.number().min(1).max(6),
});

export const insertUserSchema = registerUserSchema;
export const selectUserSchema = createSelectSchema(users);

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserResponse = typeof userResponses.$inferSelect;
export type AOTQuestion = typeof aotQuestions.$inferSelect;
export type TopicQuestion = typeof topicQuestions.$inferSelect;
export type LSTQuestion = typeof lstQuestions.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type BadgeType = z.infer<typeof badgeTypeSchema>;

export const aotQuestions = pgTable("aot_questions", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  isReversed: boolean("is_reversed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const topicQuestions = pgTable("topic_questions", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userResponses = pgTable("user_responses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  questionId: integer("question_id").notNull(),
  questionType: text("question_type").notNull(), // 'aot' or 'topic'
  response: integer("response").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lstQuestions = pgTable("lst_questions", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define badge types for skill recognition
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Track badges earned by users
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  badgeId: integer("badge_id").notNull().references(() => badges.id),
  earnedAt: timestamp("earned_at").defaultNow(),
  gameType: varchar("game_type", { length: 50 }).notNull(), // e.g., 'thought_zombies', 'aura_eater', etc.
});

// Badge types as a zod enum for validation
export const badgeTypeSchema = z.enum([
  'reason_giver',      // Gives a reason for their main point
  'fact_checker',      // Questions if something is actually true
  'link_cutter',       // Challenges premise-conclusion link
  'hidden_premise_hunter', // Points out an unstated assumption
  'evidence_expert'    // Backs up point with proof or example
]);