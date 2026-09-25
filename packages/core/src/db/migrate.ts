export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS operator_session (
  id VARCHAR(64) PRIMARY KEY,
  vendor_id VARCHAR(64) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  INDEX operator_session_token (token_hash)
);

CREATE TABLE IF NOT EXISTS zalo_control (
  vendor_id VARCHAR(64) PRIMARY KEY,
  relink INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS zalo_link (
  vendor_id VARCHAR(64) PRIMARY KEY,
  status VARCHAR(32) NOT NULL,
  display_name VARCHAR(255) NULL,
  qr_image TEXT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  vendor_id VARCHAR(64) NOT NULL,
  thread_id VARCHAR(128) NOT NULL,
  thread_type VARCHAR(16) NOT NULL,
  title VARCHAR(255) NOT NULL,
  avatar_url TEXT NULL,
  last_message TEXT NULL,
  last_message_at BIGINT NULL,
  ai_enabled TINYINT(1) NOT NULL DEFAULT 0,
  stage VARCHAR(32) NOT NULL DEFAULT 'chao_hoi',
  UNIQUE KEY conversations_vendor_thread (vendor_id, thread_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  vendor_id VARCHAR(64) NOT NULL,
  conversation_id VARCHAR(64) NOT NULL,
  direction VARCHAR(8) NOT NULL,
  source VARCHAR(16) NOT NULL,
  content TEXT NOT NULL,
  attachment_path VARCHAR(255) NULL,
  zalo_msg_id VARCHAR(128) NULL,
  status VARCHAR(16) NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY messages_vendor_zalo_msg (vendor_id, zalo_msg_id),
  INDEX messages_conversation_time (vendor_id, conversation_id, created_at)
);

CREATE TABLE IF NOT EXISTS shop_profiles (
  vendor_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  tagline VARCHAR(255) NOT NULL DEFAULT '',
  address VARCHAR(255) NOT NULL DEFAULT '',
  directions TEXT NOT NULL,
  hotline VARCHAR(32) NOT NULL DEFAULT '',
  hours_json TEXT NOT NULL,
  intro TEXT NOT NULL,
  amenities TEXT NOT NULL,
  policy_booking TEXT NOT NULL,
  policy_cancel TEXT NOT NULL,
  policy_late TEXT NOT NULL,
  policy_new_guest TEXT NOT NULL,
  voice TEXT NOT NULL,
  forbidden TEXT NOT NULL,
  ai_all TINYINT(1) NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(64) PRIMARY KEY,
  vendor_id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  duration_minutes INT NOT NULL,
  price_vnd INT NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  INDEX services_vendor_sort (vendor_id, sort_order)
);

CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(64) PRIMARY KEY,
  vendor_id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  gender VARCHAR(16) NOT NULL,
  specialties VARCHAR(255) NOT NULL DEFAULT '',
  years_experience INT NOT NULL DEFAULT 0,
  bio VARCHAR(500) NOT NULL DEFAULT '',
  active TINYINT(1) NOT NULL DEFAULT 1,
  photo_path VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  INDEX staff_vendor_sort (vendor_id, sort_order)
);

CREATE TABLE IF NOT EXISTS staff_shifts (
  id VARCHAR(64) PRIMARY KEY,
  vendor_id VARCHAR(64) NOT NULL,
  staff_id VARCHAR(64) NOT NULL,
  weekday INT NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  INDEX staff_shifts_vendor_staff (vendor_id, staff_id)
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  id VARCHAR(64) PRIMARY KEY,
  vendor_id VARCHAR(64) NOT NULL,
  conversation_id VARCHAR(64) NOT NULL,
  display_name VARCHAR(120) NULL,
  phone VARCHAR(32) NULL,
  notes TEXT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE KEY customer_profiles_vendor_chat (vendor_id, conversation_id)
);

CREATE TABLE IF NOT EXISTS customer_facts (
  id VARCHAR(64) PRIMARY KEY,
  vendor_id VARCHAR(64) NOT NULL,
  conversation_id VARCHAR(64) NOT NULL,
  kind VARCHAR(24) NOT NULL,
  content VARCHAR(500) NOT NULL,
  confidence INT NOT NULL,
  created_at BIGINT NOT NULL,
  INDEX customer_facts_vendor_chat (vendor_id, conversation_id, created_at)
);

CREATE TABLE IF NOT EXISTS conversation_summaries (
  id VARCHAR(64) PRIMARY KEY,
  vendor_id VARCHAR(64) NOT NULL,
  conversation_id VARCHAR(64) NOT NULL,
  body TEXT NOT NULL,
  from_created_at BIGINT NOT NULL,
  to_created_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  INDEX summaries_vendor_chat (vendor_id, conversation_id, created_at)
);

CREATE TABLE IF NOT EXISTS booking_anchors (
  vendor_id VARCHAR(64) NOT NULL,
  conversation_id VARCHAR(64) NOT NULL,
  service_name VARCHAR(120) NOT NULL DEFAULT '',
  staff_name VARCHAR(120) NOT NULL DEFAULT '',
  when_text VARCHAR(120) NOT NULL DEFAULT '',
  missing VARCHAR(255) NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (vendor_id, conversation_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(64) PRIMARY KEY,
  vendor_id VARCHAR(64) NOT NULL,
  conversation_id VARCHAR(64) NOT NULL,
  service_name VARCHAR(120) NOT NULL,
  staff_id VARCHAR(64) NULL,
  staff_name VARCHAR(120) NOT NULL DEFAULT '',
  when_text VARCHAR(120) NOT NULL,
  customer_name VARCHAR(120) NOT NULL DEFAULT '',
  phone VARCHAR(32) NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  INDEX bookings_vendor_status (vendor_id, status, created_at)
);
`;
