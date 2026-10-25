import type { ComponentType } from 'react'
import CompanyApprovalPage from '../pages/signup/CompanyApprovalPage'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import PublicLayout from '../layouts/PublicLayout'
import ApplicantsPage from '../pages/applicants/ApplicantsPage'
import ApplicantProfilePage from '../pages/applicants/ApplicantProfilePage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import CreateJobPage from '../pages/jobs/CreateJobPage'
import JobsPage from '../pages/jobs/JobsPage'
import JobDetailsPage from '../pages/jobs/JobDetailsPage'
import SettingsPage from '../pages/settings/SettingsPage'
import ApplicationPage from '../pages/public/ApplicationPage'
import ApplicationSuccessPage from '../pages/public/ApplicationSuccessPage'
import CareersPage from '../pages/public/CareersPage'
import PublicJobPage from '../pages/public/PublicJobPage'
import LoginPage from '../pages/auth/LoginPage'
import SignupPage from '../pages/signup/SignupPage'
import CompanySignupPage from '../pages/signup/CompanySignupPage'
import EmployeeSignupPage from '../pages/signup/EmployeeSignupPage'
import PendingApprovalPage from '../pages/signup/PendingApprovalPage'
import ProtectedRoute from './ProtectedRoute'

// Remount form/detail state when company or job parameters change.
function ScopedRoutePage({ page: Page }: { page: ComponentType }) {
  const { pathname } = useLocation()
  return <Page key={pathname} />
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="signup/company" element={<CompanySignupPage />} />
        <Route path="signup/employee" element={<EmployeeSignupPage />} />
        <Route path="signup/approve" element={<CompanyApprovalPage />} />
        <Route path="signup/pending" element={<PendingApprovalPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="jobs/new" element={<ScopedRoutePage page={CreateJobPage} />} />
            <Route path="jobs/:jobId" element={<ScopedRoutePage page={JobDetailsPage} />} />
            <Route path="jobs/:jobId/edit" element={<ScopedRoutePage page={CreateJobPage} />} />
            <Route path="applicants" element={<ApplicantsPage />} />
            <Route path="applicants/:applicantId" element={<ScopedRoutePage page={ApplicantProfilePage} />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route element={<PublicLayout />}>
          <Route path="companies/:companySlug/careers" element={<ScopedRoutePage page={CareersPage} />} />
          <Route path="companies/:companySlug/careers/:jobSlug" element={<ScopedRoutePage page={PublicJobPage} />} />
          <Route path="companies/:companySlug/careers/:jobSlug/apply" element={<ScopedRoutePage page={ApplicationPage} />} />
          <Route path="companies/:companySlug/careers/:jobSlug/application-success" element={<ScopedRoutePage page={ApplicationSuccessPage} />} />
          <Route path="careers" element={<ScopedRoutePage page={CareersPage} />} />
          <Route path="careers/:jobSlug" element={<ScopedRoutePage page={PublicJobPage} />} />
          <Route path="careers/:jobSlug/apply" element={<ScopedRoutePage page={ApplicationPage} />} />
          <Route path="careers/:jobSlug/application-success" element={<ScopedRoutePage page={ApplicationSuccessPage} />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
