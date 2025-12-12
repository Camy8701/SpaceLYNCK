-- ============================================================================
-- CLEANUP SCRIPT - Remove all dummy contacts and lists
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Delete all email sends first (foreign key dependency)
DELETE FROM email_sends;

-- Delete all list-contact relationships
DELETE FROM email_list_contacts;

-- Delete all contacts
DELETE FROM email_contacts;

-- Delete all lists
DELETE FROM email_lists;

-- Reset campaign statuses back to draft
UPDATE email_campaigns
SET status = 'draft',
    total_sent = 0,
    total_failed = 0,
    started_at = NULL,
    completed_at = NULL
WHERE status IN ('sending', 'sent', 'failed');

-- Verify cleanup
SELECT 'Contacts' as table_name, COUNT(*) as remaining FROM email_contacts
UNION ALL
SELECT 'Lists', COUNT(*) FROM email_lists
UNION ALL
SELECT 'List Contacts', COUNT(*) FROM email_list_contacts
UNION ALL
SELECT 'Sends', COUNT(*) FROM email_sends;
