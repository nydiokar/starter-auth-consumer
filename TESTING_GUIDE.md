# Auth Module Testing Guide

**UI Running at:** http://localhost:4000  
**Status:** ✅ All systems operational

---

## 📧 Email Testing (Development Mode)

**How it works:**
- Emails are NOT sent (SMTP config is ignored in dev mode)
- Verification/reset tokens are captured in-memory
- Use "Dev: Get Token" buttons to retrieve tokens
- Or manually call: `GET /dev/tokens?email=your@email.com`

**This is intentional** - makes testing fast without needing a real email server!

---

## 🎯 Test Plan: Complete Walkthrough

### Test 1: User Registration & Email Verification

**Steps:**
1. **Register a new user**
   - Email: `test1@example.com`
   - Password: `SecurePass123!` (must be 8+ chars)
   - Click **Register**
   - ✅ Expected: Success message, user created but NOT logged in

2. **Get verification token**
   - In "Email Verification" section
   - Email field: `test1@example.com`
   - Click **Dev: Get Token** button
   - ✅ Expected: Token auto-filled in "Token" field

3. **Verify email**
   - Token should be filled from step 2
   - Click **Verify** button
   - ✅ Expected: Email verified successfully

4. **Login with verified user**
   - Email: `test1@example.com`
   - Password: `SecurePass123!`
   - Click **Login**
   - ✅ Expected: Session cookie set, "Signed out" → "Signed in"

5. **Check user info**
   - Click **Me** button
   - ✅ Expected: Shows user details with `emailVerifiedAt` timestamp

---

### Test 2: Login Without Verification

**Steps:**
1. **Register another user**
   - Email: `test2@example.com`
   - Password: `SecurePass456!`
   - Click **Register**

2. **Try to login immediately** (skip verification)
   - Email: `test2@example.com`
   - Password: `SecurePass456!`
   - Click **Login**
   - ✅ Expected: May succeed but check if verification is required
   - Click **Me** to check `emailVerifiedAt` (should be null)

---

### Test 3: Password Reset Flow

**Steps:**
1. **Use the verified user from Test 1**
   - Make sure you're logged OUT first
   - Click **Logout** if needed

2. **Request password reset**
   - In "Password Reset" section
   - Email: `test1@example.com`
   - Click **Request Reset**
   - ✅ Expected: Success message

3. **Get reset token**
   - Click **Dev: Get Token** in Password Reset section
   - ✅ Expected: Token auto-filled

4. **Reset password**
   - New Password: `NewSecurePass789!`
   - Click **Reset Password**
   - ✅ Expected: Password changed successfully

5. **Login with NEW password**
   - Email: `test1@example.com`
   - Password: `NewSecurePass789!` (the NEW one)
   - Click **Login**
   - ✅ Expected: Login successful

6. **Verify old password doesn't work**
   - Logout
   - Try to login with: `SecurePass123!` (old password)
   - ✅ Expected: Login fails

---

### Test 4: Session Management

**Steps:**
1. **Login** (if not already)
   - Email: `test1@example.com`
   - Password: `NewSecurePass789!`

2. **View sessions**
   - In "Sessions" section
   - Click **List Sessions**
   - ✅ Expected: Shows current session(s) with details:
     - Session ID
     - IP hash
     - User agent
     - Created/expires times

3. **Check Who Am I**
   - In "Dev Tools" section
   - Click **Who Am I**
   - ✅ Expected: Shows current session ID and TTL

4. **Test session expiration**
   - Click **Set TTL 5s** (sets session to expire in 5 seconds)
   - Wait 6 seconds
   - Click **Me** button
   - ✅ Expected: Session expired error (401)

5. **Login again and revoke session**
   - Login fresh
   - Click **List Sessions**
   - Note the session ID
   - Manual revoke: Click revoke button next to session
   - Try **Me** again
   - ✅ Expected: 401 Unauthorized

---

### Test 5: CSRF Protection

**Steps:**
1. **Enable CSRF testing**
   - In "Settings" section
   - ✅ Check "Include credentials (cookies)"
   - ✅ Check "Send CSRF header on POST"
   - Both should be checked by default

2. **Login** (creates session)
   - Email: `test1@example.com`
   - Password: `NewSecurePass789!`

3. **Test with CSRF protection**
   - Try **Request Reset** (a POST endpoint)
   - ✅ Expected: Works fine

4. **Disable CSRF header**
   - In "Settings"
   - ❌ Uncheck "Send CSRF header on POST"
   
5. **Try POST request without CSRF**
   - Try **Request Reset** again
   - ✅ Expected: 403 Forbidden (CSRF token missing)

6. **Re-enable CSRF**
   - ✅ Check "Send CSRF header on POST" again
   - Verify it works

---

### Test 6: Role-Based Access Control (RBAC)

**Steps:**
1. **Login as regular user**
   - Email: `test1@example.com`
   - Password: `NewSecurePass789!`

2. **Try admin endpoint WITHOUT admin role**
   - In "RBAC / Admin" section
   - Click **GET /admin/ping**
   - ✅ Expected: 403 Forbidden (insufficient permissions)

3. **Promote user to admin**
   - In "RBAC / Admin" section
   - Click **Dev: Promote Admin**
   - ✅ Expected: Admin role assigned

4. **Try admin endpoint WITH admin role**
   - Click **GET /admin/ping** again
   - ✅ Expected: Success! Response: `{"message": "pong from admin"}`

---

### Test 7: Rate Limiting

**Steps:**
1. **Logout** (rate limits apply to failed logins)

2. **Configure rate limit test**
   - In "Rate Limit Tester" section
   - Attempts: `10`
   - Delay (ms): `100`

3. **Run rapid failed login attempts**
   - Click **Run Wrong-Password Attempts**
   - ✅ Expected: 
     - First few attempts: 401 (wrong password)
     - After threshold: 429 Too Many Requests (rate limited)

4. **View rate limit config**
   - In "Dev Tools" section
   - Click **Show Config**
   - ✅ Expected: Shows rate limit thresholds

5. **Clear rate limits**
   - In "Dev Tools" section
   - Click **Clear Rate Limits**
   - ✅ Expected: Rate limit buckets cleared
   - Try logging in normally - should work now

---

### Test 8: Audit Logs

**Steps:**
1. **Perform various actions**
   - Register user
   - Login
   - Request verification
   - Logout

2. **View audit logs**
   - In "Audit Logs" section
   - Click **List Last 50**
   - ✅ Expected: Shows all recent actions:
     - `register`
     - `login_success`
     - `login_failed`
     - `logout`
     - `verify_request`
     - `password_reset_request`
     - Each with: timestamp, userId, IP, user agent

3. **Clear audit logs** (for testing)
   - Click **Clear All**
   - ✅ Expected: Logs cleared
   - List again → should be empty or only have new actions

---

### Test 9: Dev Tokens Panel

**Steps:**
1. **Register and request verifications for multiple users**
   - Register: `user1@example.com`
   - Register: `user2@example.com`
   - Request verify for both

2. **List all captured tokens**
   - In "Dev Tokens" section
   - Click **List Tokens**
   - ✅ Expected: Shows all captured tokens:
     - Email
     - Token type (verify/reset)
     - Token value
     - Timestamp

3. **Clear tokens**
   - Click **Clear Tokens**
   - ✅ Expected: Token store cleared

---

### Test 10: Multiple Sessions (Different Browsers/Devices)

**Steps:**
1. **Open another browser** (or incognito)
   - Navigate to http://localhost:4000

2. **Login from second browser**
   - Same user: `test1@example.com`

3. **List sessions from first browser**
   - Click **List Sessions**
   - ✅ Expected: Shows 2+ sessions for same user

4. **Revoke one session**
   - In first browser, revoke the second session
   - In second browser, try **Me**
   - ✅ Expected: Second browser gets 401

---

## 🎯 Edge Cases to Test

### Invalid Inputs
- **Empty email/password** → Should show validation error
- **Invalid email format** → Should reject
- **Short password** (< 8 chars) → Should reject
- **Invalid token** → Should show error

### Duplicate Registration
1. Register: `duplicate@example.com`
2. Try to register same email again
3. ✅ Expected: Error (email already exists)

### Expired Tokens
1. Request verification token
2. Wait (tokens have expiration - check auth module config)
3. Try to use expired token
4. ✅ Expected: Token expired error

### Session After Logout
1. Login and note session ID
2. Logout
3. Try to use **Me** endpoint
4. ✅ Expected: 401 Unauthorized (no session)

### Wrong Password Multiple Times
1. Try login with wrong password 3 times
2. ✅ Expected: Rate limited after threshold

---

## 🔍 What to Look For

### ✅ Success Indicators
- Clean error messages (not stack traces)
- Proper HTTP status codes (200, 401, 403, 429)
- Sessions persist across requests
- CSRF tokens automatically included
- Rate limiting kicks in at threshold
- Audit logs capture all events
- Tokens are captured and retrievable

### ❌ Failure Indicators
- Stack traces exposed to client
- 500 Internal Server Error
- Sessions not persisting
- CSRF bypass possible
- Rate limiting not working
- Missing audit logs
- Token capture not working

---

## 🛠️ Debugging Tips

### Check Browser Console
- Open DevTools (F12)
- Watch for:
  - Cookie being set (app.sid)
  - CSRF token cookie (app.csrf)
  - Network requests/responses
  - Console errors

### Check Redis
```powershell
# Connect to Redis
docker exec -it starter-auth-consumer-redis-1 redis-cli

# List all keys
KEYS *

# Check session
GET sess:your-session-id

# Exit
exit
```

### Check Database
```powershell
# Open SQLite database
sqlite3 prisma/dev.db

# Check users
SELECT * FROM User;

# Check sessions
SELECT * FROM Session;

# Check roles
SELECT u.email, r.name 
FROM User u 
JOIN UserRole ur ON u.id = ur.userId 
JOIN Role r ON ur.roleId = r.id;

# Check audit logs
SELECT * FROM AuditLog ORDER BY at DESC LIMIT 10;

# Exit
.exit
```

---

## 📊 Coverage Checklist

After testing, you should have validated:

- [ ] User registration
- [ ] Email verification flow
- [ ] Login/logout
- [ ] Password reset flow
- [ ] Session creation & management
- [ ] Session revocation
- [ ] Session expiration
- [ ] CSRF protection
- [ ] Role assignment
- [ ] Role-based access control
- [ ] Rate limiting on failed logins
- [ ] Audit logging
- [ ] Token capture (dev mode)
- [ ] Multiple concurrent sessions
- [ ] Invalid input handling
- [ ] Duplicate registration prevention
- [ ] Token expiration
- [ ] Cookie security settings

---

## 🚀 Quick Smoke Test (5 minutes)

If you want a quick validation:

1. **Register** → `quick@test.com` / `Password123!`
2. **Get Token** → Click "Dev: Get Token" in Email Verification
3. **Verify** → Click "Verify"
4. **Login** → Same credentials
5. **Check Me** → Should show user details
6. **Promote Admin** → Click "Dev: Promote Admin"
7. **Test Admin** → Click "GET /admin/ping" → Should work
8. **List Sessions** → Should show current session
9. **Check Audit** → Click "List Last 50" → Should show all actions

If all of these work → **Auth module is functional!** ✅

---

## 🎯 Production Readiness

For production deployment, you'd need to:

1. **Remove dev endpoints** (`/dev/*` routes)
2. **Configure real SMTP** (remove dev mailer override)
3. **Set strong AUTH_PEPPER** (not "dev-pepper")
4. **Enable secure cookies** (NODE_ENV=production)
5. **Configure proper domain** (not localhost)
6. **Set up Redis persistence** (not just in-memory)
7. **Add rate limiting on more endpoints**
8. **Configure CORS properly**
9. **Add request logging/monitoring**
10. **Set session TTL appropriately**

But for testing the auth module → **you're all set!** 🎉

