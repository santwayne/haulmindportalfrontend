import React, { useState, useEffect, useRef } from 'react';
import {
  deleteIssue,
  listIssues,
  searchIssues
} from '../../../../../axios/api/distapcher';
import NewIssueSidebar from './NewIssueSidebar';
import ViewIssueModal from './ViewIssueModal';
import ConfirmationModal from '../../../../../components/common/ConfirmationModal';
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdWarning,
  MdError,
  MdInfo,
  MdClose
} from 'react-icons/md';
import { FaFilter } from 'react-icons/fa';

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

const Issues: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewIssueSidebar, setShowNewIssueSidebar] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [] = useState(false);
  const [showIssueDetails, setShowIssueDetails] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10
  });

  // Refs for scrollbar synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  // Fetch issues
  const fetchIssues = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await listIssues(page, 10);
      console.log('Issues API Response:', response);

      if (response.success) {
        const data = response.issues || [];
        setIssues(data);
        setPagination({
          current: response.page || 1,
          pages: response.pages || 1,
          total: response.total || 0,
          limit: 10
        });
      } else {
        console.error('API returned success: false', response);
        setIssues([]);
        setPagination({ current: 1, pages: 0, total: 0, limit: 10 });
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      setIssues([]);
      setPagination({ current: 1, pages: 0, total: 0, limit: 10 });
    } finally {
      setLoading(false);
    }
  };

  // Search issues
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchIssues();
      return;
    }

    setLoading(true);
    try {
      const response = await searchIssues(searchQuery);
      console.log('Search API Response:', response);

      if (response.success) {
        const data = response.issues || [];
        setIssues(data);
        setPagination({
          current: 1,
          pages: 1,
          total: response.total || 0,
          limit: 10
        });
      } else {
        console.error('Search API returned success: false', response);
        setIssues([]);
        setPagination({ current: 1, pages: 0, total: 0, limit: 10 });
      }
    } catch (error) {
      console.error('Error searching issues:', error);
      setIssues([]);
      setPagination({ current: 1, pages: 0, total: 0, limit: 10 });
    } finally {
      setLoading(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; issueId: string | null }>({ show: false, issueId: null });

  // Delete issue
  const handleDelete = async (id: string) => {
    setDeleteConfirm({ show: true, issueId: id });
  };

  const confirmDeleteIssue = async () => {
    if (!deleteConfirm.issueId) return;

    try {
      const response = await deleteIssue(deleteConfirm.issueId);
      if (response.success) {
        setIssues(issues.filter(issue => issue._id !== deleteConfirm.issueId));
      }
    } catch (error) {
      console.error('Error deleting issue:', error);
    } finally {
      setDeleteConfirm({ show: false, issueId: null });
    }
  };

  // View issue details

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

  useEffect(() => {
    fetchIssues();
  }, []);

  // Sync scroll between top and bottom scrollbars
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;

    if (!topScroll || !bottomScroll) return;

    let isScrolling = false;

    const handleTopScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      bottomScroll.scrollLeft = topScroll.scrollLeft;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    const handleBottomScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      topScroll.scrollLeft = bottomScroll.scrollLeft;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    // Sync scroll widths
    const syncScrollWidths = () => {
      const bottomScrollWidth = bottomScroll.scrollWidth;
      const topInner = topScroll.querySelector('.top-scroll-content') as HTMLElement;
      if (topInner && bottomScrollWidth > 0) {
        topInner.style.width = `${bottomScrollWidth}px`;
        topScroll.scrollLeft = bottomScroll.scrollLeft;
      }
    };

    // Initial sync - wait for table to render
    const timeoutId = setTimeout(syncScrollWidths, 100);
    const timeoutId2 = setTimeout(syncScrollWidths, 300);
    const timeoutId3 = setTimeout(syncScrollWidths, 500);

    // Observe table changes
    const tableObserver = new MutationObserver(() => {
      syncScrollWidths();
    });

    const bottomTable = bottomScroll.querySelector('table');
    if (bottomTable) {
      tableObserver.observe(bottomTable, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    topScroll.addEventListener('scroll', handleTopScroll, { passive: true });
    bottomScroll.addEventListener('scroll', handleBottomScroll, { passive: true });
    window.addEventListener('resize', syncScrollWidths);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      tableObserver.disconnect();
      topScroll.removeEventListener('scroll', handleTopScroll);
      bottomScroll.removeEventListener('scroll', handleBottomScroll);
      window.removeEventListener('resize', syncScrollWidths);
    };
  }, [issues, searchQuery]);

  return (
    <div className="flex h-screen bg-main overflow-hidden">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showNewIssueSidebar ? 'mr-96' : ''} overflow-hidden`}>
        <div className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-headings">Issues Management</h1>
              <p className="text-secondary">Manage and track fleet issues</p>
            </div>
            <button
              onClick={() => setShowNewIssueSidebar(true)}
              style={{ background: 'var(--accent-navyblue)' }}
              className="flex items-center gap-2 !text-white px-4 py-2 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              <MdAdd className="text-xl" />
              Add Issue
            </button>
          </div>

          {/* Search and Filters */}
          <div className="bg-card rounded-lg shadow-sm border border-theme p-4 mb-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  placeholder="Search issues by type, category, priority, status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSearch}
                className="flex items-center gap-2 bg-[var(--accent-navyblue)] !text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MdSearch />
                Search
              </button>
              <button
                onClick={() => {
                  setSearchQuery('');
                  fetchIssues();
                }}
                className="flex items-center gap-2 bg-gray-600 !text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaFilter />
                Clear
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary">Total Issues</p>
                  <p className="text-2xl font-bold text-headings">{pagination.total}</p>
                </div>
                <MdWarning className="text-2xl text-secondary" />
              </div>
            </div>
            <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary">Open Issues</p>
                  <p className="text-2xl font-bold text-[#A855F7]">
                    {issues.filter(i => i.status === 'open').length}
                  </p>
                </div>
                <MdError className="text-2xl text-red-400" />
              </div>
            </div>
            <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary">In Progress</p>
                  <p className="text-2xl font-bold text-[#00D1FF]">
                    {issues.filter(i => i.status === 'in-progress').length}
                  </p>
                </div>
                <MdInfo className="text-2xl text-blue-400" />
              </div>
            </div>
            <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary">Closed Issues</p>
                  <p className="text-2xl font-bold text-green-600">
                    {issues.filter(i => i.status === 'closed').length}
                  </p>
                </div>
                <MdInfo className="text-2xl text-green-400" />
              </div>
            </div>
          </div>

          {/* Issues Table */}
          <div className="w-full bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
            {/* Top Scrollbar - Only visible horizontal scrollbar */}

            <div
              ref={topScrollRef}
              className="overflow-x-auto overflow-y-hidden top-scrollbar-container"
              style={{
                maxHeight: '20px',
                marginBottom: '2px',

              }}
            >
              <div className="top-scroll-content" style={{ height: '1px' }}></div>
            </div>
            {/* Main Table - Scrollbar hidden, controlled by top scrollbar */}
            <div
              ref={bottomScrollRef}
              className="overflow-x-auto overflow-y-visible table-container-hidden-scrollbar"
            >
              <table className="w-full divide-theme">
                <thead className="bg-card">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                      Issue Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                      Type & Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-secondary">
                        Loading issues...
                      </td>
                    </tr>
                  ) : issues.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-secondary">
                        No issues found
                      </td>
                    </tr>
                  ) : (
                    issues.map((issue) => (
                      <tr
                        key={issue._id}
                        className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedIssue(issue);
                          setShowIssueDetails(true);
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getIssueTypeIcon(issue.issueType)}
                            <div>
                              <div className="text-sm font-medium text-headings">
                                {issue.issueType.charAt(0).toUpperCase() + issue.issueType.slice(1)}
                              </div>
                              <div className="text-sm text-secondary truncate max-w-xs">
                                {issue.issueReport}
                              </div>
                              <div className="text-xs text-secondary">
                                {new Date(issue.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-headings">
                            {issue.issueCategory.replace('-', ' ').charAt(0).toUpperCase() +
                              issue.issueCategory.replace('-', ' ').slice(1)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${issue.priority === 'high'
                              ? 'bg-[rgba(239,68,68,0.15)] text-[#F87171]'
                              : issue.priority === 'medium'
                                ? 'bg-[rgba(245,158,11,0.15)] text-[#FBBF24]'
                                : 'bg-[rgba(34,197,94,0.15)] text-[#4ADE80]'
                              }`}
                          >
                            {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${issue.status === 'open'
                              ? 'bg-[rgba(168,85,247,0.15)] text-[#C084FC]'
                              : issue.status === 'in-progress'
                                ? 'bg-[rgba(34,197,94,0.15)] text-[#4ADE80]'
                                : 'bg-[rgba(255,255,255,0.08)] text-secondary'
                              }`}
                          >
                            {issue.status.replace('-', ' ').charAt(0).toUpperCase() +
                              issue.status.replace('-', ' ').slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-headings">
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
                            ) : 'No vehicle'}
                          </div>
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">

                            {/* Edit */}
                            <button
                              onClick={() => {
                                setEditingIssue(issue);
                                setShowNewIssueSidebar(true);
                              }}
                              className="p-2 text-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] rounded-lg transition-all duration-200"
                              title="Edit Issue"
                            >
                              <MdEdit />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(issue._id)}
                              className="p-2 text-red-400 hover:bg-[rgba(239,68,68,0.1)] rounded-lg transition-all duration-200"
                              title="Delete Issue"
                            >
                              <MdDelete />
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-theme">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => fetchIssues(pagination.current - 1)}
                    disabled={pagination.current === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-theme text-sm font-medium rounded-md text-headings bg-card hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchIssues(pagination.current + 1)}
                    disabled={pagination.current === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-theme text-sm font-medium rounded-md text-headings bg-card hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-headings">
                      Showing{' '}
                      <span className="font-medium">{(pagination.current - 1) * pagination.limit + 1}</span>
                      {' '}to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.current * pagination.limit, pagination.total)}
                      </span>
                      {' '}of{' '}
                      <span className="font-medium">{pagination.total}</span>
                      {' '}results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => fetchIssues(pagination.current - 1)}
                        disabled={pagination.current === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-theme bg-card text-sm font-medium text-secondary hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => fetchIssues(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === pagination.current
                            ? 'z-10 bg-card border-blue-500 text-[#00D1FF]'
                            : 'bg-card border-theme text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                            }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => fetchIssues(pagination.current + 1)}
                        disabled={pagination.current === pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-theme bg-card text-sm font-medium text-secondary hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* New/Edit Issue Sidebar */}
      {showNewIssueSidebar && (
        <NewIssueSidebar
          issue={editingIssue}
          onClose={() => {
            setShowNewIssueSidebar(false);
            setEditingIssue(null);
          }}
          onSave={() => {
            setShowNewIssueSidebar(false);
            setEditingIssue(null);
            fetchIssues();
          }}
        />
      )}

      {/* View Issue Modal */}
      {showViewModal && selectedIssue && (
        <ViewIssueModal
          issue={selectedIssue}
          onClose={() => {
            setShowViewModal(false);
            setSelectedIssue(null);
          }}
        />
      )}

      {/* Issue Details Sidebar */}
      {showIssueDetails && selectedIssue && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => {
              setShowIssueDetails(false);
              setTimeout(() => setSelectedIssue(null), 300);
            }}
          ></div>

          {/* Sidebar Panel */}
          <div
            className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-card shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 translate-x-0"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-theme">
                <h2 className="text-2xl font-bold text-headings">Issue Details</h2>
                <button
                  onClick={() => {
                    setShowIssueDetails(false);
                    setTimeout(() => setSelectedIssue(null), 300);
                  }}
                  className="p-2 rounded-lg text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] transition-all"
                >
                  <MdClose size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Issue Header */}
                <div className="text-white p-6 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getIssueTypeIcon(selectedIssue.issueType)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-1">
                        {selectedIssue.issueType.charAt(0).toUpperCase() + selectedIssue.issueType.slice(1)}
                      </h3>
                      <p className="text-blue-100 text-sm mb-2">
                        {selectedIssue.issueCategory.replace('-', ' ').charAt(0).toUpperCase() + selectedIssue.issueCategory.replace('-', ' ').slice(1)}
                      </p>
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(selectedIssue.status)}`}>
                        {selectedIssue.status.replace('-', ' ').charAt(0).toUpperCase() + selectedIssue.status.replace('-', ' ').slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Issue Information */}
                <div className="bg-card p-6 rounded-lg border border-theme">
                  <h4 className="font-semibold text-headings mb-4 text-lg">Issue Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-secondary mb-1">Issue Type</p>
                      <p className="font-medium text-headings">
                        {selectedIssue.issueType.charAt(0).toUpperCase() + selectedIssue.issueType.slice(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary mb-1">Category</p>
                      <p className="font-medium text-headings">
                        {selectedIssue.issueCategory.replace('-', ' ').charAt(0).toUpperCase() + selectedIssue.issueCategory.replace('-', ' ').slice(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary mb-1">Priority</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedIssue.priority)}`}>
                        {selectedIssue.priority.charAt(0).toUpperCase() + selectedIssue.priority.slice(1)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-secondary mb-1">Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedIssue.status)}`}>
                        {selectedIssue.status.replace('-', ' ').charAt(0).toUpperCase() + selectedIssue.status.replace('-', ' ').slice(1)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-secondary mb-1">Reported By</p>
                      <p className="font-medium text-headings">{selectedIssue.reportedBy || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary mb-1">Assigned To</p>
                      <p className="font-medium text-headings">{selectedIssue.assignedTo || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary mb-1">Created Date</p>
                      <p className="font-medium text-headings">
                        {new Date(selectedIssue.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    {selectedIssue.address && (
                      <div>
                        <p className="text-sm text-secondary mb-1">Address</p>
                        <p className="font-medium text-headings">{selectedIssue.address}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-secondary mb-1">Issue Report</p>
                    <p className="font-medium text-headings">{selectedIssue.issueReport || "—"}</p>
                  </div>
                  {selectedIssue.issueTags && selectedIssue.issueTags.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-secondary mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedIssue.issueTags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Vehicle Information */}
                {selectedIssue.vehicle && (
                  <div className="bg-card p-6 rounded-lg border border-theme">
                    <h4 className="font-semibold text-headings mb-4 text-lg">Vehicle Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedIssue.vehicle && typeof selectedIssue.vehicle === 'object' ? (
                        <>
                          {selectedIssue.vehicle.make && (
                            <div>
                              <p className="text-sm text-secondary mb-1">Make</p>
                              <p className="font-medium text-headings">{selectedIssue.vehicle.make}</p>
                            </div>
                          )}
                          {selectedIssue.vehicle.model && (
                            <div>
                              <p className="text-sm text-secondary mb-1">Model</p>
                              <p className="font-medium text-headings">{selectedIssue.vehicle.model}</p>
                            </div>
                          )}
                          {(selectedIssue.vehicle.plateNumber || selectedIssue.vehicle.internalId) && (
                            <div>
                              <p className="text-sm text-secondary mb-1">Plate / ID</p>
                              <p className="font-medium text-headings">
                                {selectedIssue.vehicle.plateNumber || selectedIssue.vehicle.internalId}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div>
                          <p className="text-sm text-secondary mb-1">Vehicle ID</p>
                          <p className="font-medium text-headings">{selectedIssue.vehicle}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                  <button
                    onClick={() => {
                      setShowIssueDetails(false);
                      setTimeout(() => setSelectedIssue(null), 300);
                    }}
                    className="px-6 py-2.5 bg-gray-200 text-headings font-medium rounded-lg hover:bg-gray-300 transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowIssueDetails(false);
                      setEditingIssue(selectedIssue);
                      setShowNewIssueSidebar(true);
                    }}
                    className="px-6 py-2.5 bg-blue-600 !text-white font-medium rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Edit Issue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, issueId: null })}
        onConfirm={confirmDeleteIssue}
        title="Delete Issue"
        message="Are you sure you want to delete this issue? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default Issues;