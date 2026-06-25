-- Up: Normalize superadmin role string
UPDATE user_roles SET role = 'superadmin' WHERE role = 'super_admin';

-- Down: Restore legacy role string
-- UPDATE user_roles SET role = 'super_admin' WHERE role = 'superadmin';
