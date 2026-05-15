import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const sponsorInquiries = pgTable("sponsor_inquiries", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  website: text("website"),
  inquiryType: text("inquiry_type").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SponsorInquiry = typeof sponsorInquiries.$inferSelect;
export type InsertSponsorInquiry = typeof sponsorInquiries.$inferInsert;
