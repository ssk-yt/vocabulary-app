
import { pgTable, uuid, text, boolean, timestamp, vector, integer, pgEnum } from "drizzle-orm/pg-core";

// Enums
export const learningStatusEnum = pgEnum("learning_status", [
    "uninput",
    "inputted",
    "instant",
    "speakable",
]);

// Tables

export const profiles = pgTable("profiles", {
    id: uuid("id").primaryKey().notNull(), // references auth.users implicitly
    encrypted_api_key: text("encrypted_api_key"),
    is_ai_auto_complete_on: boolean("is_ai_auto_complete_on").default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const categories = pgTable("categories", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    user_id: uuid("user_id").notNull(),
    name: text("name").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const vocabulary = pgTable("vocabulary", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    user_id: uuid("user_id").notNull(),
    category_id: uuid("category_id"), // references categories.id

    term: text("term").notNull(),
    definition: text("definition"),
    part_of_speech: text("part_of_speech"),
    ipa: text("ipa"),

    example: text("example"),
    etymology: text("etymology"),
    synonyms: text("synonyms").array(),
    collocations: text("collocations").array(),

    source_memo: text("source_memo"),

    // Note: 768 dimensions for Gemini Flash/Pro, 1536 for OpenAI.
    // Matching current usage: 768
    embedding: vector("embedding", { dimensions: 768 }),

    is_generating: boolean("is_generating").default(false),

    status: learningStatusEnum("status").default("uninput"),
    last_reviewed_at: timestamp("last_reviewed_at", { withTimezone: true }),
    correct_count: integer("correct_count").default(0),
    incorrect_count: integer("incorrect_count").default(0),

    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
