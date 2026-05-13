# ScoreMenu hotfix - Admin login after register on Render

Fixes the Render auth flow after the backend became reachable:

- Admin register now saves the returned API token/session and routes directly to the dashboard.
- Re-registering an existing username with the same password becomes idempotent and logs the user in.
- Re-registering an existing username with a different password returns a clearer conflict message.
- Login 401 now displays the backend message such as `Tài khoản hoặc mật khẩu chưa đúng` instead of the generic expired-session text.

If a tester already created an account with a forgotten password on Render JSON storage, either use another username or reset the Render data file for that test deployment.
