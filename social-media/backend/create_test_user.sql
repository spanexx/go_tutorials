INSERT INTO users (id, email, username, password_hash, display_name, avatar_url, email_verified, created_at, updated_at)
VALUES (
    'test-user-001',
    'test@example.com',
    'testuser',
    '$2a$10$jxvO0keVWfo6N8vHs2CEoOm70Ozo3K94gQSOZxpY1Bc7aBH2xvcUK',
    'Test User',
    '',
    true,
    NOW(),
    NOW()
);
