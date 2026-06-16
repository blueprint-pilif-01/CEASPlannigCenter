import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import PlannerLogin from './pages/planner/Login';

// Protected pages
import PlannerDashboard from './pages/planner/Dashboard';
import AdminUsers from './pages/planner/AdminUsers';
import AdminContractSubmissions from './pages/planner/AdminContractSubmissions';
import AdminEventRegistrations from './pages/planner/AdminEventRegistrations';
import Notifications from './pages/planner/Notifications';

// Events pages (protected)
import Events from './pages/planner/Events';
import EventEditor from './pages/planner/EventEditor';
import EventTypes from './pages/planner/EventTypes';

// Contracts pages (protected)
import ContractTemplates from './pages/planner/ContractTemplates';
import ContractTemplateEditor from './pages/planner/ContractTemplateEditor';
import ContractSubmissions from './pages/planner/ContractSubmissions';
import ContractSigners from './pages/planner/ContractSigners';

// Public pages (no authentication)
import SignContract from './pages/public/SignContract';
import EventRegistration from './pages/public/EventRegistration';
import RegistrationStatus from './pages/public/RegistrationStatus';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
      <Routes>
        {/* Login page - public */}
        <Route path="/planner/login" element={<PlannerLogin />} />

        {/* Public contract signing - NO authentication */}
        <Route path="/planner/sign/:token" element={<SignContract />} />

        {/* Public event registration - NO authentication */}
        <Route path="/planner/register/:eventId" element={<EventRegistration />} />
        <Route path="/planner/register/:eventId/status/:token" element={<RegistrationStatus />} />

        {/* Protected routes - require authentication */}
        <Route path="/" element={<Navigate to="/planner/dashboard" replace />} />

        <Route path="/planner/dashboard" element={
          <ProtectedRoute><PlannerDashboard /></ProtectedRoute>
        } />
        <Route path="/planner/notifications" element={
          <ProtectedRoute><Notifications /></ProtectedRoute>
        } />

        {/* Events pages - protected */}
        <Route path="/planner/events" element={
          <ProtectedRoute><Events /></ProtectedRoute>
        } />
        <Route path="/planner/events/new" element={
          <ProtectedRoute><EventEditor /></ProtectedRoute>
        } />
        <Route path="/planner/events/types" element={
          <ProtectedRoute><EventTypes /></ProtectedRoute>
        } />
        <Route path="/planner/events/:id" element={
          <ProtectedRoute><EventEditor /></ProtectedRoute>
        } />

        {/* Admin pages - protected */}
        <Route path="/planner/admin/users" element={
          <ProtectedRoute><AdminUsers /></ProtectedRoute>
        } />
        <Route path="/planner/admin/contracts" element={
          <ProtectedRoute><AdminContractSubmissions /></ProtectedRoute>
        } />
        <Route path="/planner/admin/registrations" element={
          <ProtectedRoute><AdminEventRegistrations /></ProtectedRoute>
        } />

        {/* Contracts pages - protected */}
        <Route path="/planner/contracts" element={
          <ProtectedRoute><ContractTemplates /></ProtectedRoute>
        } />
        <Route path="/planner/contracts/new" element={
          <ProtectedRoute><ContractTemplateEditor /></ProtectedRoute>
        } />
        <Route path="/planner/contracts/submissions" element={
          <ProtectedRoute><ContractSubmissions /></ProtectedRoute>
        } />
        <Route path="/planner/contracts/signers" element={
          <ProtectedRoute><ContractSigners /></ProtectedRoute>
        } />
        <Route path="/planner/contracts/:id" element={
          <ProtectedRoute><ContractTemplateEditor /></ProtectedRoute>
        } />

        {/* Catch-all: redirect to login */}
        <Route path="*" element={<Navigate to="/planner/login" replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
