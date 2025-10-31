-- init.sql
-- Grant full privileges to 'student' user for development
GRANT ALL PRIVILEGES ON *.* TO 'student'@'%';
FLUSH PRIVILEGES;
