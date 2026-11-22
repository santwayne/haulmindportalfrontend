import { Link } from 'react-router-dom';
import { getDashboardRoute, isAuthenticated } from '../utils/auth';

// Shown for any address that matches no route, instead of a blank page.
const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-main p-6">
    <div className="text-center max-w-md">
      <p className="text-5xl font-bold text-primary mb-3">404</p>
      <h1 className="text-lg font-semibold text-primary mb-2">Page not found</h1>
      <p className="text-sm text-secondary mb-6">
        This page does not exist, or your account does not have access to it.
      </p>
      <Link
        to={isAuthenticated() ? getDashboardRoute() : '/'}
        className="inline-block px-4 py-2 rounded-lg text-sm font-medium !text-white bg-[var(--accent-navyblue)]"
      >
        {isAuthenticated() ? 'Back to dashboard' : 'Go to login'}
      </Link>
    </div>
  </div>
);

export default NotFound;
