-- Simpsons-themed role limits
-- Run this after initial migration to seed the role_limits table

INSERT INTO role_limits (role, character_name, max_iterations_per_workstream, max_concurrent_workstreams, max_workstreams_per_day) VALUES
  ('free', 'Ralph Wiggum', 5, 1, 2),
  ('dev', 'Bart Simpson', 20, 3, 10),
  ('pro', 'Lisa Simpson', 50, 5, 25),
  ('team', 'Marge Simpson', 100, 10, 50),
  ('enterprise', 'Homer Simpson', 200, 25, 100),
  ('admin', 'Mr. Burns', 999, 999, 999)
ON CONFLICT (role) DO UPDATE SET
  character_name = EXCLUDED.character_name,
  max_iterations_per_workstream = EXCLUDED.max_iterations_per_workstream,
  max_concurrent_workstreams = EXCLUDED.max_concurrent_workstreams,
  max_workstreams_per_day = EXCLUDED.max_workstreams_per_day;
