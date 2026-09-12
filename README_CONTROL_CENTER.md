# CYBERSTAT — Full Control Center

This version adds a complete centralized admin control center.

## Admin modules
- Dashboard: live ranking, totals, participants, leader, countdown and quick controls.
- Finalists: create/edit/delete/archive, author photo, project logo, description, rating and active state.
- Vote Control: server-side + / - adjustment with mandatory reason and audit trail.
- Analytics: private admin statistics and recent daily vote counts.
- Site Content: edit public project name, final headline, hero description, badge, public note and footer text.
- Final Control: open, pause or close voting; show/hide public results; set countdown.
- Audit Log: private history of administrator actions.

## Supabase
Run `supabase/upgrade_control_center.sql` after your existing schema. Keep the `candidate-images` public bucket and admin-only upload policies.

## Deployment
1. Replace your local project with this version or copy the changed files.
2. `npm install`
3. `npm run dev`
4. Test `/admin` locally.
5. Commit and push to `main`; Vercel deploys automatically.

Public users never receive audit details or admin identity. Public state is returned through `get_public_state()` and only includes public-safe fields.
