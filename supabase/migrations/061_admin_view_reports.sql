-- Migration 061: Allow admins to view all issue reports
-- The admin reports page was showing zero because RLS only allowed users to see their own reports.

CREATE POLICY "Admins can view all reports" ON issue_reports
  FOR SELECT USING (
    auth.uid() IN ('5ab25825-1e29-4949-b798-61a8724170d6')
  );

-- Also allow admins to update reports (status, priority, admin_notes)
CREATE POLICY "Admins can update reports" ON issue_reports
  FOR UPDATE USING (
    auth.uid() IN ('5ab25825-1e29-4949-b798-61a8724170d6')
  );
