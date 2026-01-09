import { sql } from 'drizzle-orm';
import { pgTable, pgEnum, uuid, varchar, date, text, timestamp } from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);

export const USER_NAME_LENGTH = 120;
export const USER_EMAIL_LENGTH = 100;
export const USER_PHONE_LENGTH = 32;
export const USER_PROFILE_PIC_URL_LENGTH = 1024;
export const USER_DOCUMENT_TYPE_LENGTH = 100;
export const USER_DOCUMENT_NUMBER_LENGTH = 50;

export const invoices = pgTable('invoices', {
  id: uuid('id')
    .primaryKey()
    .notNull()
    .default(sql`uuidv7()`),
  fullName: varchar('full_name', { length: USER_NAME_LENGTH }).notNull(),
  userPhotoUrl: varchar('user_photo_url', { length: USER_PROFILE_PIC_URL_LENGTH }),
  dateOfBirth: date('date_of_birth').notNull(),
  userNotes: text('user_notes'),
  // TODO: Move status to a credentials table
  status: userStatusEnum('status').notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
