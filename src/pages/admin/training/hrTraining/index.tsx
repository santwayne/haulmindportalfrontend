// This file is kept for backward compatibility
// Routes now directly use AdminHRTrainingView and HRRoleBasedTraining components
import React from 'react';
import { getUserRole } from '../../../../utils/auth';
import AdminHRTrainingView from './AdminHRTrainingView';
import HRRoleBasedTraining from './HRRoleBasedTraining';

const HRTrainingContent: React.FC = () => {
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';

  // Route to appropriate page based on user role
  if (isAdmin) {
    return <AdminHRTrainingView />;
  }

  return <HRRoleBasedTraining />;
};

export default HRTrainingContent;
