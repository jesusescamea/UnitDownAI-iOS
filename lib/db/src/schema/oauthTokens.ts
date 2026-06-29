import { pgTable, text, bigint, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const oauthTokens = pgTable(
  "oauth_tokens",
  {
    id:           text("id").primaryKey(),
    userId:       text("user_id").notNull(),
    provider:     text("provider").notNull(),
    accessToken:  text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt:    bigint("expires_at", { mode: "number" }),
    scope:        text("scope"),
    createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("oauth_tokens_user_provider_idx").on(table.userId, table.provider)],
);

export type OAuthToken    = typeof oauthTokens.$inferSelect;
export type InsertOAuthToken = typeof oauthTokens.$inferInsert;
