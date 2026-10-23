import React, { useState, useEffect } from 'react';
import { Upload, FileText, Image, Video, Plus, Trash2, X, MessageSquare, Loader2, Eye } from 'lucide-react';
import {
  getTrainingContent,
  createTrainingContent,
  deleteTrainingContent,
  getTrainingContentSignedUrl,
  getQuestionBanks,
  createQuestionBank,
  deleteQuestionBank,
} from '../../../../axios/api/driver';

interface TrainingContent {
  _id: string;
  name: string;
  type: 'PDF' | 'VIDEO' | 'IMAGE';
  testType: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  assignedRoles?: string[];
  createdAt?: string;
}

interface QAItem {
  _id: string;
  testName: string;
  testType: string;
  passingPercentage: number;
  mandatory: boolean;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
  }>;
  assignedRoles?: string[];
  createdAt?: string;
}

const roles = [
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'Fleet Maintenance Manager', label: 'Fleet Maintenance Manager' },
  { value: 'Compliance Manager', label: 'Compliance Manager' },
  { value: 'safety officer', label: 'Safety Officer' },
  { value: 'accountant', label: 'Accountant' },
];


const HRRoleBasedTraining: React.FC = () => {
  const [activeRole, setActiveRole] = useState<string>('dispatcher');
  const [trainingContent, setTrainingContent] = useState<Record<string, TrainingContent[]>>({
    dispatcher: [],
    'Fleet Maintenance Manager': [],
    'Compliance Manager': [],
    'safety officer': [],
    accountant: [],
  });
  const [qaContent, setQAContent] = useState<Record<string, QAItem[]>>({
    dispatcher: [],
    'Fleet Maintenance Manager': [],
    'Compliance Manager': [],
    'safety officer': [],
    accountant: [],
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQAModal, setShowQAModal] = useState(false);
  const [uploadType, setUploadType] = useState<'VIDEO' | 'PDF' | 'IMAGE'>('VIDEO');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Q&A Modal states
  const [qaTitle, setQATitle] = useState('');
  const [qaDescription, setQADescription] = useState('');
  const [qaQuestions, setQAQuestions] = useState<Array<{
    question: string;
    options: string[];
    correctAnswer: number;
  }>>([]);
  const [currentQQuestion, setCurrentQQuestion] = useState('');
  const [currentQOptions, setCurrentQOptions] = useState<string[]>(['', '', '', '']);
  const [currentQCorrectAnswer, setCurrentQCorrectAnswer] = useState<number>(0);
  const [creatingQA, setCreatingQA] = useState(false);

  // Fetch data on mount and when role changes
  useEffect(() => {
    fetchDataForRole(activeRole);
  }, [activeRole]);

  const fetchDataForRole = async (role: string) => {
    setLoading(true);
    try {
      // Fetch training content for this role
      const contentResponse = await getTrainingContent({ role });
      if (contentResponse?.success && Array.isArray(contentResponse.data)) {
        setTrainingContent((prev) => ({
          ...prev,
          [role]: contentResponse.data.filter((item: TrainingContent) =>
            !item.assignedRoles || item.assignedRoles.length === 0 || item.assignedRoles.includes(role)
          )
        }));
      }

      // Fetch question banks for this role
      const qaResponse = await getQuestionBanks({ role });
      if (qaResponse?.success && Array.isArray(qaResponse.data)) {
        setQAContent((prev) => ({
          ...prev,
          [role]: qaResponse.data.filter((item: QAItem) =>
            !item.assignedRoles || item.assignedRoles.length === 0 || item.assignedRoles.includes(role)
          )
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadTitle.trim() || !uploadFile) {
      alert('Please provide a title and select a file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', uploadTitle);
      formData.append('type', uploadType);
      formData.append('testType', 'TDG'); // Default, can be made configurable
      formData.append('description', uploadDescription);
      formData.append('assignedRoles', JSON.stringify([activeRole]));
      formData.append('file', uploadFile);

      const response = await createTrainingContent(formData);
      if (response?.success) {
        await fetchDataForRole(activeRole);
        setUploadTitle('');
        setUploadDescription('');
        setUploadFile(null);
        setShowUploadModal(false);
      } else {
        alert(response?.message || 'Failed to upload content');
      }
    } catch (error) {
      console.error('Error uploading content:', error);
      alert('Failed to upload content');
    } finally {
      setUploading(false);
    }
  };

  const handleViewContent = async (content: TrainingContent) => {
    try {
      const response = await getTrainingContentSignedUrl(content._id, 'inline');
      if (response?.success && response?.url) {
        window.open(response.url, '_blank');
      } else {
        alert('Failed to open content');
      }
    } catch (error) {
      console.error('Error viewing content:', error);
      alert('Failed to open content');
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      const response = await deleteTrainingContent(id);
      if (response?.success) {
        await fetchDataForRole(activeRole);
      } else {
        alert(response?.message || 'Failed to delete content');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Failed to delete content');
    }
  };

  const handleAddQuestionToQA = () => {
    if (!currentQQuestion.trim() || currentQOptions.some(opt => !opt.trim())) {
      alert('Please fill in the question and all options');
      return;
    }

    setQAQuestions((prev) => [
      ...prev,
      {
        question: currentQQuestion,
        options: currentQOptions.filter(opt => opt.trim()),
        correctAnswer: currentQCorrectAnswer,
      }
    ]);

    setCurrentQQuestion('');
    setCurrentQOptions(['', '', '', '']);
    setCurrentQCorrectAnswer(0);
  };

  const handleRemoveQuestionFromQA = (index: number) => {
    setQAQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddQA = async () => {
    if (!qaTitle.trim() || qaQuestions.length === 0) {
      alert('Please provide a title and add at least one question');
      return;
    }

    setCreatingQA(true);
    try {
      const payload = {
        testName: qaTitle,
        testType: 'TDG' as 'TDG' | 'VEHICLE' | 'HOS' | 'WINTER', // Default, can be made configurable
        passingPercentage: 80,
        mandatory: false,
        questions: qaQuestions,
        assignedRoles: [activeRole]
      };

      const response = await createQuestionBank(payload);
      if (response?.success) {
        await fetchDataForRole(activeRole);
        setQATitle('');
        setQADescription('');
        setQAQuestions([]);
        setCurrentQQuestion('');
        setCurrentQOptions(['', '', '', '']);
        setCurrentQCorrectAnswer(0);
        setShowQAModal(false);
      } else {
        alert(response?.message || 'Failed to create Q&A');
      }
    } catch (error) {
      console.error('Error creating Q&A:', error);
      alert('Failed to create Q&A');
    } finally {
      setCreatingQA(false);
    }
  };

  const handleDeleteQA = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Q&A?')) return;

    try {
      const response = await deleteQuestionBank(id);
      if (response?.success) {
        await fetchDataForRole(activeRole);
      } else {
        alert(response?.message || 'Failed to delete Q&A');
      }
    } catch (error) {
      console.error('Error deleting Q&A:', error);
      alert('Failed to delete Q&A');
    }
  };

  const getIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'VIDEO':
        return <Video className="w-5 h-5" />;
      case 'PDF':
        return <FileText className="w-5 h-5" />;
      case 'IMAGE':
        return <Image className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'VIDEO':
        return 'Video';
      case 'PDF':
        return 'PDF';
      case 'IMAGE':
        return 'Image';
      default:
        return type;
    }
  };

  return (
    <div className="p-6 bg-main min-h-screen">
      <div className="w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--accent-navyblue)] mb-2">Role-Based Training</h1>
          <p className="text-secondary">Upload and manage training materials for different roles</p>
        </div>

        <div className="flex gap-6">
          {/* Vertical Role Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-card rounded-lg shadow-sm">
              <div className="p-4 border-b border-theme">
                <h2 className="font-semibold text-[var(--accent-navyblue)]">Roles</h2>
              </div>
              <div className="p-2">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => setActiveRole(role.value)}
                    className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${activeRole === role.value
                      ? "bg-[rgba(0,209,255,0.15)] !text-white"
                      : "text-primary hover:bg-[rgba(255,255,255,0.03)]"
                      }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 space-y-6">
            {roles.map((role) => (
              <div
                key={role.value}
                className={activeRole === role.value ? 'block' : 'hidden'}
              >
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[rgba(0,209,255,0.15)] mx-auto mb-4" />
                    <p className="text-secondary">Loading...</p>
                  </div>
                ) : (
                  <>
                    {/* Training Materials Section */}
                    <div className="bg-card rounded-lg shadow-sm mb-6">
                      <div className="p-6 border-b border-theme">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-semibold text-[var(--accent-navyblue)]">Training Materials</h2>
                            <p className="text-sm text-secondary mt-1">
                              Upload videos, PDFs, and images for {role.label} training
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setShowUploadModal(true);
                              setUploadType('VIDEO');
                              setUploadTitle('');
                              setUploadDescription('');
                              setUploadFile(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-[rgba(0,209,255,0.15)] !text-white rounded-lg hover:bg-[#0d8fc4] transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Upload Content
                          </button>
                        </div>
                      </div>
                      <div className="p-6">
                        {trainingContent[role.value]?.length === 0 ? (
                          <div className="text-center py-12 text-secondary">
                            <Upload className="w-12 h-12 mx-auto mb-4 text-secondary" />
                            <p>No training materials uploaded yet</p>
                            <p className="text-sm">Click "Upload Content" to add materials</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {trainingContent[role.value].map((item) => (
                              <div key={item._id} className="bg-card rounded-lg p-4 border border-theme relative">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="text-[rgba(0,209,255,0.15)]">{getIcon(item.type)}</div>
                                    <h3 className="font-semibold text-primary">{item.name}</h3>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleViewContent(item)}
                                      className="text-[#00D1FF] hover:text-blue-700 p-1"
                                      title="View"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteContent(item._id)}
                                      className="text-[#A855F7] hover:text-red-700 p-1"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                {item.description && (
                                  <p className="text-sm text-secondary mt-2 mb-3">{item.description}</p>
                                )}
                                <div className="flex items-center justify-between text-sm text-secondary mt-3">
                                  <span className="capitalize bg-gray-200 px-2 py-1 rounded">{getTypeLabel(item.type)}</span>
                                  <span>
                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Q&A Section */}
                    <div className="bg-card rounded-lg shadow-sm mt-6">
                      <div className="p-6 border-b border-theme">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-semibold text-[var(--accent-navyblue)]">Q&A Content</h2>
                            <p className="text-sm text-secondary mt-1">
                              Manage questions and answers for {role.label} training
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setShowQAModal(true);
                              setQATitle('');
                              setQADescription('');
                              setQAQuestions([]);
                              setCurrentQQuestion('');
                              setCurrentQOptions(['', '', '', '']);
                              setCurrentQCorrectAnswer(0);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-[rgba(0,209,255,0.15)] !text-white rounded-lg hover:bg-[#0d8fc4] transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Add Q&A
                          </button>
                        </div>
                      </div>
                      <div className="p-6">
                        {qaContent[role.value]?.length === 0 ? (
                          <div className="text-center py-12 text-secondary">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-secondary" />
                            <p>No Q&A content added yet</p>
                            <p className="text-sm">Click "Add Q&A" to create questions and answers</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {qaContent[role.value].map((item) => (
                              <div key={item._id} className="bg-card rounded-lg p-4 border border-theme relative">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-primary mb-1">{item.testName}</h3>
                                    <div className="flex items-center gap-4 text-sm text-secondary mb-3">
                                      <span>Passing: {item.passingPercentage}%</span>
                                      <span>Questions: {item.questions.length}</span>
                                      {item.mandatory && <span className="text-[#A855F7]">Mandatory</span>}
                                    </div>
                                    <div className="space-y-3 mt-3">
                                      {item.questions.map((q, idx) => (
                                        <div key={idx} className="bg-card rounded p-3 border border-theme">
                                          <p className="font-medium text-primary mb-2">Q{idx + 1}: {q.question}</p>
                                          <div className="space-y-1">
                                            {q.options.map((option, optIdx) => (
                                              <div key={optIdx} className="flex items-center gap-2">
                                                <input
                                                  type="radio"
                                                  checked={q.correctAnswer === optIdx}
                                                  readOnly
                                                  className="w-4 h-4"
                                                />
                                                <span className={`text-sm ${q.correctAnswer === optIdx ? 'text-green-600 font-medium' : 'text-secondary'}`}>
                                                  {String.fromCharCode(65 + optIdx)}. {option}
                                                  {q.correctAnswer === optIdx && ' ✓'}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteQA(item._id)}
                                    className="text-[#A855F7] hover:text-red-700 p-1 ml-4"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="bg-card rounded-lg shadow-lg w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-theme">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--accent-navyblue)]">Upload Training Content</h3>
                <button
                  onClick={() => !uploading && setShowUploadModal(false)}
                  className="text-secondary hover:text-secondary"
                  disabled={uploading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-secondary mt-1">Add a new training material</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-2">Content Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadType('VIDEO')}
                    disabled={uploading}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${uploadType === 'VIDEO'
                      ? 'bg-[rgba(0,209,255,0.15)] !text-white border-[rgba(0,209,255,0.15)]'
                      : 'bg-card text-primary border-theme hover:bg-[rgba(255,255,255,0.03)]'
                      } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Video className="w-4 h-4 inline mr-2" />
                    Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadType('PDF')}
                    disabled={uploading}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${uploadType === 'PDF'
                      ? 'bg-[rgba(0,209,255,0.15)] !text-white border-[rgba(0,209,255,0.15)]'
                      : 'bg-card text-primary border-theme hover:bg-[rgba(255,255,255,0.03)]'
                      } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadType('IMAGE')}
                    disabled={uploading}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${uploadType === 'IMAGE'
                      ? 'bg-[rgba(0,209,255,0.15)] !text-white border-[rgba(0,209,255,0.15)]'
                      : 'bg-card text-primary border-theme hover:bg-[rgba(255,255,255,0.03)]'
                      } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Image className="w-4 h-4 inline mr-2" />
                    Image
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-[var(--accent-navyblue)] mb-2">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Enter content title"
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)] disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[var(--accent-navyblue)] mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Enter content description (optional)"
                  rows={3}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)] disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-[var(--accent-navyblue)] mb-2">
                  File *
                </label>
                <input
                  id="file"
                  type="file"
                  accept={uploadType === 'VIDEO' ? 'video/*' : uploadType === 'PDF' ? 'application/pdf' : 'image/*'}
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)] disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button
                  onClick={() => !uploading && setShowUploadModal(false)}
                  disabled={uploading}
                  className="px-4 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadTitle.trim() || !uploadFile}
                  className="px-4 py-2 bg-[rgba(0,209,255,0.15)] !text-white rounded-lg hover:bg-[#0d8fc4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Q&A Modal */}
      {showQAModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !creatingQA && setShowQAModal(false)}>
          <div className="bg-card rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-theme sticky top-0 bg-card">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">Add Q&A</h3>
                <button
                  onClick={() => !creatingQA && setShowQAModal(false)}
                  className="text-secondary hover:text-secondary"
                  disabled={creatingQA}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-secondary mt-1">Create questions with multiple choice answers</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="qa-title" className="block text-sm font-medium text-primary mb-2">
                  Title *
                </label>
                <input
                  id="qa-title"
                  type="text"
                  value={qaTitle}
                  onChange={(e) => setQATitle(e.target.value)}
                  placeholder="Enter Q&A title"
                  disabled={creatingQA}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)] disabled:opacity-50"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="qa-description" className="block text-sm font-medium text-primary mb-2">
                  Description
                </label>
                <textarea
                  id="qa-description"
                  value={qaDescription}
                  onChange={(e) => setQADescription(e.target.value)}
                  placeholder="Enter description (optional)"
                  rows={3}
                  disabled={creatingQA}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)] disabled:opacity-50"
                />
              </div>

              {/* Existing Questions */}
              {qaQuestions.length > 0 && (
                <div className="border-t border-theme pt-4">
                  <label className="block text-sm font-medium text-primary mb-3">
                    Added Questions ({qaQuestions.length})
                  </label>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {qaQuestions.map((q, index) => (
                      <div key={index} className="bg-card rounded-lg p-4 border border-theme">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-primary flex-1">Q{index + 1}: {q.question}</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionFromQA(index)}
                            disabled={creatingQA}
                            className="text-[#A855F7] hover:text-red-700 ml-2 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-1 mt-2">
                          {q.options.map((option, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={q.correctAnswer === optIdx}
                                readOnly
                                className="w-4 h-4"
                              />
                              <span className={`text-sm ${q.correctAnswer === optIdx ? 'text-green-600 font-medium' : 'text-secondary'}`}>
                                {String.fromCharCode(65 + optIdx)}. {option}
                                {q.correctAnswer === optIdx && ' ✓ (Correct)'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Question */}
              <div className="border-t border-theme pt-4">
                <label className="block text-sm font-medium text-primary mb-3">
                  Add New Question
                </label>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="new-question" className="block text-sm font-medium text-primary mb-2">
                      Question *
                    </label>
                    <textarea
                      id="new-question"
                      value={currentQQuestion}
                      onChange={(e) => setCurrentQQuestion(e.target.value)}
                      placeholder="Enter question"
                      rows={2}
                      disabled={creatingQA}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)] disabled:opacity-50"
                    />
                  </div>

                  {/* Options */}
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Options (at least 2 required) *
                    </label>
                    <div className="space-y-2">
                      {currentQOptions.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="correct-answer"
                            checked={currentQCorrectAnswer === idx}
                            onChange={() => setCurrentQCorrectAnswer(idx)}
                            disabled={creatingQA}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium text-primary w-6">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...currentQOptions];
                              newOptions[idx] = e.target.value;
                              setCurrentQOptions(newOptions);
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                            disabled={creatingQA}
                            className="flex-1 px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)] disabled:opacity-50"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-secondary mt-2">
                      Select the radio button next to the correct answer
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddQuestionToQA}
                    disabled={creatingQA || !currentQQuestion.trim() || currentQOptions.filter(opt => opt.trim()).length < 2}
                    className="w-full px-4 py-2 bg-card text-primary rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Question
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-theme">
                <button
                  onClick={() => !creatingQA && setShowQAModal(false)}
                  disabled={creatingQA}
                  className="px-4 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddQA}
                  disabled={creatingQA || !qaTitle.trim() || qaQuestions.length === 0}
                  className="px-4 py-2 bg-[rgba(0,209,255,0.15)] !text-white rounded-lg hover:bg-[#0d8fc4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creatingQA ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Add Q&A'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HRRoleBasedTraining;
