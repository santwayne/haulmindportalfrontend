import React from 'react';
import { MdClose, MdWarning, MdError, MdInfo, MdLocationOn } from 'react-icons/md';

interface Issue {
  _id: string;
  reportedBy: string;
  assignedTo: string;
  vehicle?: {
    _id: string;
    plateNumber?: string;
    make?: string;
    model?: string;
    internalId?: string;
  } | string | null;
  issueType: 'maintanance' | 'operational' | 'accident' | 'compilance';
  issueCategory: 'engine' | 'fuel' | 'paper-work' | 'minor-damage';
  issueReport: string;
  issueTags: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in-progress' | 'closed';
  address?: string;
  cordinates?: {
    longitude: string;
    latitude: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ViewIssueModalProps {
  issue: Issue;
  onClose: () => void;
}

const ViewIssueModal: React.FC<ViewIssueModalProps> = ({ issue, onClose }) => {
  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-[#A855F7] bg-red-100';
      case 'medium': return 'text-[#00FFA3] bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-secondary bg-card';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-[#A855F7] bg-red-100';
      case 'in-progress': return 'text-[#00D1FF] bg-blue-100';
      case 'closed': return 'text-green-600 bg-green-100';
      default: return 'text-secondary bg-card';
    }
  };

  // Get issue type icon
  const getIssueTypeIcon = (type: string) => {
    switch (type) {
      case 'maintanance': return <MdWarning className="text-orange-500" />;
      case 'operational': return <MdError className="text-red-500" />;
      case 'accident': return <MdError className="text-[#A855F7]" />;
      case 'compilance': return <MdInfo className="text-blue-500" />;
      default: return <MdWarning className="text-secondary" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-lg shadow-2xl border border-theme max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-[10000]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-theme">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              {getIssueTypeIcon(issue.issueType)}
              <div>
                <h2 className="text-xl font-semibold text-primary">
                  Issue Details
                </h2>
                <p className="text-sm text-secondary">
                  Created: {new Date(issue.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-secondary hover:text-secondary"
            >
              <MdClose className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Reported By</h3>
              <p className="text-sm text-primary">{issue.reportedBy || 'Not specified'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Assigned To</h3>
              <p className="text-sm text-primary">{issue.assignedTo || 'Not assigned'}</p>
            </div>
          </div>

          {/* Vehicle */}
          <div>
            <h3 className="text-sm font-medium text-secondary mb-2">Vehicle</h3>
            <p className="text-sm text-primary">
              {issue.vehicle && typeof issue.vehicle === 'object' ? (
                (() => {
                  const make = issue.vehicle.make || '';
                  const model = issue.vehicle.model || '';
                  const plateNumber = issue.vehicle.plateNumber || issue.vehicle.internalId || 'N/A';
                  const vehicleName = [make, model].filter(Boolean).join(' ').trim() || 'Unknown';
                  return `${vehicleName} (${plateNumber})`;
                })()
              ) : issue.vehicle && typeof issue.vehicle === 'string' ? (
                `Vehicle ID: ${issue.vehicle}`
              ) : 'No vehicle assigned'}
            </p>
          </div>

          {/* Issue Type and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Issue Type</h3>
              <p className="text-sm text-primary capitalize">
                {issue.issueType.replace('-', ' ')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Category</h3>
              <p className="text-sm text-primary capitalize">
                {issue.issueCategory.replace('-', ' ')}
              </p>
            </div>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Priority</h3>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(issue.priority)}`}>
                {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Status</h3>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                {issue.status.replace('-', ' ').charAt(0).toUpperCase() +
                  issue.status.replace('-', ' ').slice(1)}
              </span>
            </div>
          </div>

          {/* Issue Report */}
          <div>
            <h3 className="text-sm font-medium text-secondary mb-2">Issue Report</h3>
            <div className="bg-card rounded-lg p-4">
              <p className="text-sm text-primary whitespace-pre-wrap">
                {issue.issueReport}
              </p>
            </div>
          </div>

          {/* Issue Tags */}
          {issue.issueTags && issue.issueTags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {issue.issueTags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Location Address */}
          {issue.address && (
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Location</h3>
              <div className="flex items-center gap-2 text-sm text-primary">
                <MdLocationOn className="text-secondary" />
                <span>{issue.address}</span>
              </div>
            </div>
          )}

          {/* Location Coordinates (if available) */}
          {issue.cordinates && (issue.cordinates.longitude || issue.cordinates.latitude) && (
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Coordinates</h3>
              <div className="text-sm text-secondary">
                <span>
                  {issue.cordinates.latitude}, {issue.cordinates.longitude}
                </span>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-theme">
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Created At</h3>
              <p className="text-sm text-primary">
                {new Date(issue.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Last Updated</h3>
              <p className="text-sm text-primary">
                {new Date(issue.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-theme flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 !text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewIssueModal;
