import React, { useState } from 'react';
import { Button } from 'antd';
import ExpiringDocumentsPopup from './ExpiringDocumentsPopup';

/**
 * Test component to demonstrate the ExpiringDocumentsPopup functionality
 * This can be used to test different scenarios without needing real data
 */
const ExpiringDocumentsPopupTest: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="p-6 bg-card min-h-screen">
      <div className="max-w-2xl mx-auto bg-card rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-primary mb-4">
          Expiring Documents Popup Test
        </h1>

        <div className="space-y-4">
          <p className="text-secondary">
            This component demonstrates the expiring documents popup functionality.
            Click the button below to test the popup with different scenarios.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button
              type="primary"
              onClick={() => setShowPopup(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Show Popup (30 days)
            </Button>

            <Button
              onClick={() => {
                // Test with different threshold
                setShowPopup(true);
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Show Popup (7 days)
            </Button>
          </div>

          <div className="mt-6 p-4 bg-card rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Test Scenarios:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Popup shows when there are expiring documents</li>
              <li>• Different urgency levels (red, orange, yellow)</li>
              <li>• Shows employee name and document details</li>
              <li>• "View All Documents" button navigates to documents page</li>
              <li>• "Show Only Once" prevents popup from showing again today</li>
              <li>• Auto-close after delay (if configured)</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Integration Points:</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Employee Document Dashboard</li>
              <li>• Main Employee Dashboard</li>
              <li>• Admin Dashboard Quick Stats</li>
              <li>• Any page that needs document expiry alerts</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Test Popup */}
      <ExpiringDocumentsPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        onViewDocuments={() => {
          alert('Navigate to documents page!');
          setShowPopup(false);
        }}
        daysThreshold={30}
        showOnlyOnce={false} // Allow multiple tests
      />
    </div>
  );
};

export default ExpiringDocumentsPopupTest;
