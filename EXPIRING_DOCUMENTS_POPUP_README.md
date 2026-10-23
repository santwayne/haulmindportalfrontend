# Expiring Documents Popup System

## Overview
A comprehensive popup notification system that alerts users when employee documents are expiring within 30 days (configurable). The system is integrated across multiple pages in the application.

## Features

### 🚨 **Smart Popup Notifications**
- **Automatic Detection**: Automatically detects documents expiring within 30 days
- **Urgency Levels**: Color-coded alerts based on days until expiry
  - 🔴 **Red**: 7 days or less (Critical)
  - 🟠 **Orange**: 8-14 days (Warning)
  - 🟡 **Yellow**: 15-30 days (Notice)
- **Show Once Per Day**: Prevents popup spam with localStorage tracking
- **Auto-close**: Optional auto-close after delay

### 📋 **Document Information Display**
- Employee name and internal ID
- Document type and number
- Expiry date with countdown
- Document status and description
- File download links (if available)

### 🎯 **Integration Points**
1. **Employee Document Dashboard** (`/admin/employee/documents`)
2. **Main Employee Dashboard** (`/admin/employee`)
3. **Admin Dashboard Quick Stats** (`/admin/dashboard`)
4. **Any custom page** (reusable component)

## Components

### `ExpiringDocumentsPopup.tsx`
Main popup component with the following props:

```typescript
interface ExpiringDocumentsPopupProps {
  isOpen: boolean;                    // Controls popup visibility
  onClose: () => void;               // Close handler
  onViewDocuments?: () => void;      // Optional: Navigate to documents
  daysThreshold?: number;            // Days threshold (default: 30)
  showOnlyOnce?: boolean;            // Show once per day (default: false)
  autoCloseDelay?: number;           // Auto-close delay in ms (default: 0)
}
```

### `ExpiringDocumentsPopupTest.tsx`
Test component for development and demonstration purposes.

## API Integration

### Backend Endpoints Used
- `GET /employee-documents/expiring?days=30` - Fetch expiring documents
- `GET /employee-documents/stats` - Get document statistics

### Data Structure
```typescript
interface EmployeeDocument {
  _id: string;
  employee: {
    _id: string;
    name: string;
    email: string;
    internalId: string;
  };
  documentType: string;
  documentNumber?: string;
  expiryDate: string;
  status: 'valid' | 'expired' | 'pending' | 'rejected';
  // ... other fields
}
```

## Implementation Details

### 1. Employee Document Dashboard
- **Trigger**: When `documentStats.expiringSoon > 0`
- **Delay**: 2 seconds after page load
- **Action**: Scroll to top of documents section

### 2. Main Employee Dashboard
- **Trigger**: When `documentStats.expiringSoon > 0`
- **Delay**: 3 seconds after page load
- **Action**: Navigate to documents page

### 3. Admin Dashboard Quick Stats
- **Trigger**: When `alerts.expiringDocs.length > 0`
- **Delay**: 4 seconds after page load
- **Action**: Navigate to documents page

## Usage Examples

### Basic Usage
```tsx
import ExpiringDocumentsPopup from './components/common/ExpiringDocumentsPopup';

const MyComponent = () => {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div>
      {/* Your component content */}
      
      <ExpiringDocumentsPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        daysThreshold={30}
        showOnlyOnce={true}
      />
    </div>
  );
};
```

### With Custom Navigation
```tsx
<ExpiringDocumentsPopup
  isOpen={showPopup}
  onClose={() => setShowPopup(false)}
  onViewDocuments={() => {
    // Custom navigation logic
    navigate('/admin/employee/documents');
  }}
  daysThreshold={7} // Show only critical (7 days)
  showOnlyOnce={false} // Allow multiple shows
/>
```

## Styling

The popup uses Tailwind CSS classes and includes:
- **Responsive Design**: Works on desktop and mobile
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Modern UI**: Clean, professional appearance
- **Color Coding**: Intuitive urgency indicators

## Configuration

### Environment Variables
No additional environment variables required. Uses existing API endpoints.

### Customization Options
- **Days Threshold**: Configure how many days in advance to show alerts
- **Show Frequency**: Control whether popup shows once per day or every time
- **Auto-close**: Set automatic close delay
- **Navigation**: Customize where "View Documents" button leads

## Testing

### Test Component
Use `ExpiringDocumentsPopupTest.tsx` to test different scenarios:
- Different urgency levels
- Various document types
- Navigation functionality
- Show/hide behavior

### Manual Testing
1. Create test documents with expiry dates in the future
2. Visit any integrated page
3. Verify popup appears after delay
4. Test navigation and close functionality

## Future Enhancements

### Potential Improvements
- **Email Notifications**: Send email alerts for critical expirations
- **SMS Alerts**: Text notifications for urgent documents
- **Bulk Actions**: Renew multiple documents at once
- **Calendar Integration**: Add to calendar for renewal reminders
- **Custom Thresholds**: Per-document-type expiry thresholds
- **Approval Workflow**: Document renewal approval process

### Analytics
- Track popup interactions
- Monitor document renewal rates
- Identify frequently expiring document types

## Troubleshooting

### Common Issues
1. **Popup not showing**: Check if documents exist with expiry dates
2. **Wrong urgency colors**: Verify date calculations
3. **Navigation not working**: Check route paths and permissions
4. **Multiple popups**: Ensure `showOnlyOnce` is properly configured

### Debug Information
The popup includes console logging for debugging:
- Document fetching status
- Expiry calculations
- Popup show/hide events

## Support

For issues or questions regarding the expiring documents popup system:
1. Check console logs for error messages
2. Verify API endpoints are working
3. Test with the provided test component
4. Review integration points and timing delays
