import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Edit,
  Trash2,
  X,
  Image as ImageIcon,
  Video,
  CheckCircle,
  Eye,
  Play
} from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import {
  getTrainingContent,
  createTrainingContent,
  deleteTrainingContent,
  getTrainingContentSignedUrl,
  getQuestionBanks,
  createQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  type TrainingContent as APITrainingContent,
  type QuestionBank as APIQuestionBank
} from '../../../../axios/api/driver';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

const Notification = ({ notification, onClose }: { notification: Notification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationCircle className="text-red-500" size={24} />,
    info: <FaCheckCircle className="text-blue-500" size={24} />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    info: 'bg-card border-blue-200'
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]} animate-slide-in min-w-[300px] max-w-[500px]`}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[notification.type]}
      </div>
      <p className="flex-1 text-sm font-medium text-primary">{notification.message}</p>
      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 text-secondary hover:text-secondary transition-colors"
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
};

type TestType = 'TDG' | 'VEHICLE' | 'HOS' | 'WINTER';
type ContentType = 'PDF' | 'IMAGE' | 'VIDEO';

interface TrainingContent {
  id: string;
  name: string;
  type: ContentType;
  testType: TestType;
  file: File | null;
  fileUrl?: string;
  uploadedAt?: string;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct answer
}

interface QuestionBank {
  id: string;
  testName: string;
  testType: TestType;
  passingPercentage: number;
  mandatory: boolean;
  questions: Question[];
  createdAt?: string;
  updatedAt?: string;
}

const TrainingTestManagement = ({ showOnly }: { showOnly?: "training" | "questions" }) => {
  const [activeTab, setActiveTab] = useState<'training' | 'questionBanks'>(
    showOnly === "questions" ? "questionBanks" : "training"
  );
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Training Content State
  const [trainingContent, setTrainingContent] = useState<TrainingContent[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState<{
    name: string;
    type: ContentType;
    testType: TestType;
    file: File | null;
  }>({
    name: '',
    type: 'PDF',
    testType: 'TDG',
    file: null
  });

  // Question Bank State
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
  const [editingQuestionBank, setEditingQuestionBank] = useState<QuestionBank | null>(null);
  const [questionBankForm, setQuestionBankForm] = useState<{
    testName: string;
    testType: TestType;
    passingPercentage: number;
    mandatory: boolean;
    questions: Question[];
  }>({
    testName: '',
    testType: 'TDG',
    passingPercentage: 80,
    mandatory: false,
    questions: []
  });
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [questionForm, setQuestionForm] = useState<{
    question: string;
    options: string[];
    correctAnswer: number;
  }>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  });

  // Fetch data on mount
  useEffect(() => {
    fetchTrainingContent();
    fetchQuestionBanks();
  }, []);

  const fetchTrainingContent = async () => {
    try {
      setLoading(true);
      const response = await getTrainingContent();
      if (response?.success && Array.isArray(response.data)) {
        const mapped = response.data.map((item: APITrainingContent) => ({
          id: item._id || '',
          name: item.name,
          type: item.type as ContentType,
          testType: item.testType as TestType,
          file: null,
          fileUrl: item.fileUrl,
          uploadedAt: item.createdAt || new Date().toISOString()
        }));
        setTrainingContent(mapped);
      }
    } catch (error) {
      console.error('Error fetching training content:', error);
      showNotification('error', 'Failed to load training content');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionBanks = async () => {
    try {
      setLoading(true);
      const response = await getQuestionBanks();
      if (response?.success && Array.isArray(response.data)) {
        const mapped = response.data.map((item: APIQuestionBank) => ({
          id: item._id || '',
          testName: item.testName,
          testType: item.testType as TestType,
          passingPercentage: item.passingPercentage,
          mandatory: item.mandatory !== false,
          questions: item.questions.map((q, idx) => ({
            id: q.id || `q-${item._id}-${idx}-${Date.now()}`,
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer
          })),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }));
        setQuestionBanks(mapped);
      } else if (response?.message) {
        showNotification('info', response.message);
      }
    } catch (error) {
      console.error('Error fetching question banks:', error);
      showNotification('error', 'Failed to load question banks');
    } finally {
      setLoading(false);
    }
  };

  const testTypes: { value: TestType; label: string }[] = [
    { value: 'TDG', label: 'TDG' },
    { value: 'VEHICLE', label: 'Vehicle' },
    { value: 'HOS', label: 'HOS' },
    { value: 'WINTER', label: 'Winter' }
  ];

  const contentTypeOptions: { value: ContentType; label: string; icon: React.ReactNode }[] = [
    { value: 'PDF', label: 'PDF', icon: <FileText className="w-4 h-4" /> },
    { value: 'IMAGE', label: 'Image', icon: <ImageIcon className="w-4 h-4" /> },
    { value: 'VIDEO', label: 'Video', icon: <Video className="w-4 h-4" /> }
  ];

  const showNotification = (type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Training Content Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file, name: file.name }));
    }
  };

  const handleUploadContent = async () => {
    if (!uploadForm.name || !uploadForm.file) {
      showNotification('error', 'Please provide a name and select a file');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', uploadForm.name);
      formData.append('type', uploadForm.type);
      formData.append('testType', uploadForm.testType);
      formData.append('file', uploadForm.file);

      const response = await createTrainingContent(formData);
      if (response?.success) {
        showNotification('success', 'Training content uploaded successfully');
        setUploadForm({ name: '', type: 'PDF', testType: 'TDG', file: null });
        setShowUploadModal(false);
        await fetchTrainingContent();
      } else {
        showNotification('error', response?.message || 'Failed to upload training content');
      }
    } catch (error) {
      console.error('Error uploading content:', error);
      showNotification('error', 'Failed to upload training content');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this training content?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await deleteTrainingContent(id);
      if (response?.success) {
        showNotification('success', 'Training content deleted successfully');
        await fetchTrainingContent();
      } else {
        showNotification('error', response?.message || 'Failed to delete training content');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      showNotification('error', 'Failed to delete training content');
    } finally {
      setLoading(false);
    }
  };

  const handleViewContent = async (content: TrainingContent) => {
    try {
      const response = await getTrainingContentSignedUrl(content.id, 'inline');
      if (response?.success && response.url) {
        // Open in new tab for all types
        window.open(response.url, '_blank');
      } else {
        // Fallback to direct URL if signed URL fails
        if (content.fileUrl) {
          window.open(content.fileUrl, '_blank');
        } else {
          showNotification('error', 'Unable to open content file');
        }
      }
    } catch (error) {
      console.error('Error opening content:', error);
      // Fallback to direct URL
      if (content.fileUrl) {
        window.open(content.fileUrl, '_blank');
      } else {
        showNotification('error', 'Unable to open content file');
      }
    }
  };

  // Question Bank Handlers
  const handleCreateQuestionBank = () => {
    setEditingQuestionBank(null);
    setQuestionBankForm({
      testName: '',
      testType: 'TDG',
      passingPercentage: 80,
      mandatory: false,
      questions: []
    });
    setQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    });
    setEditingQuestionIndex(null);
    setShowQuestionBankModal(true);
  };

  const handleEditQuestionBank = (bank: QuestionBank) => {
    setEditingQuestionBank(bank);
    setQuestionBankForm({
      testName: bank.testName,
      testType: bank.testType,
      passingPercentage: bank.passingPercentage,
      mandatory: bank.mandatory,
      questions: bank.questions.map(q => ({
        ...q,
        id: q.id || `q-${bank.id}-${Date.now()}`
      }))
    });
    setQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    });
    setEditingQuestionIndex(null);
    setShowQuestionBankModal(true);
  };

  const handleSaveQuestionBank = async () => {
    console.log('🔵 handleSaveQuestionBank called');
    console.log('🔵 questionBankForm:', questionBankForm);

    if (!questionBankForm.testName.trim()) {
      showNotification('error', 'Please provide a test name');
      return;
    }

    if (questionBankForm.questions.length === 0) {
      showNotification('error', 'Please add at least one question');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        testName: questionBankForm.testName,
        testType: questionBankForm.testType,
        passingPercentage: questionBankForm.passingPercentage,
        mandatory: questionBankForm.mandatory,
        questions: questionBankForm.questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer
        }))
      };

      console.log('🔵 Payload to send:', JSON.stringify(payload, null, 2));

      let response;
      if (editingQuestionBank) {
        console.log('🔵 Updating question bank:', editingQuestionBank.id);
        response = await updateQuestionBank(editingQuestionBank.id, payload);
      } else {
        console.log('🔵 Creating new question bank');
        response = await createQuestionBank(payload);
      }

      console.log('🔵 API Response:', response);

      if (response?.success) {
        showNotification('success', editingQuestionBank ? 'Question bank updated successfully' : 'Question bank created successfully');
        setShowQuestionBankModal(false);
        setEditingQuestionBank(null);
        setQuestionBankForm({
          testName: '',
          testType: 'TDG',
          passingPercentage: 80,
          mandatory: false,
          questions: []
        });
        setQuestionForm({
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        });
        setEditingQuestionIndex(null);
        await fetchQuestionBanks();
      } else {
        console.error('🔴 API Error:', response);
        showNotification('error', response?.message || 'Failed to save question bank');
      }
    } catch (error) {
      console.error('🔴 Error saving question bank:', error);
      showNotification('error', 'Failed to save question bank');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestionBank = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question bank?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await deleteQuestionBank(id);
      if (response?.success) {
        showNotification('success', 'Question bank deleted successfully');
        await fetchQuestionBanks();
      } else {
        showNotification('error', response?.message || 'Failed to delete question bank');
      }
    } catch (error) {
      console.error('Error deleting question bank:', error);
      showNotification('error', 'Failed to delete question bank');
    } finally {
      setLoading(false);
    }
  };

  // Question Handlers
  const handleAddQuestion = () => {
    if (!questionForm.question.trim()) {
      showNotification('error', 'Please enter a question');
      return;
    }

    if (questionForm.options.filter(opt => opt.trim()).length < 2) {
      showNotification('error', 'Please provide at least 2 options');
      return;
    }

    if (questionForm.options[questionForm.correctAnswer]?.trim() === '') {
      showNotification('error', 'Please select a valid correct answer');
      return;
    }

    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      question: questionForm.question,
      options: questionForm.options.filter(opt => opt.trim()),
      correctAnswer: questionForm.correctAnswer
    };

    setQuestionBankForm(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));

    setQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    });
    setEditingQuestionIndex(null);
    showNotification('success', 'Question added successfully');
  };

  const handleEditQuestion = (index: number) => {
    const question = questionBankForm.questions[index];
    // Ensure we have at least 4 option slots, pad with empty strings if needed
    const paddedOptions = [...question.options];
    while (paddedOptions.length < 4) {
      paddedOptions.push('');
    }
    setQuestionForm({
      question: question.question,
      options: paddedOptions.slice(0, 4),
      correctAnswer: question.correctAnswer
    });
    setEditingQuestionIndex(index);
  };

  const handleUpdateQuestion = () => {
    if (editingQuestionIndex === null) return;

    if (!questionForm.question.trim()) {
      showNotification('error', 'Please enter a question');
      return;
    }

    if (questionForm.options.filter(opt => opt.trim()).length < 2) {
      showNotification('error', 'Please provide at least 2 options');
      return;
    }

    const updatedQuestions = [...questionBankForm.questions];
    updatedQuestions[editingQuestionIndex] = {
      ...updatedQuestions[editingQuestionIndex],
      question: questionForm.question,
      options: questionForm.options.filter(opt => opt.trim()),
      correctAnswer: questionForm.correctAnswer
    };

    setQuestionBankForm(prev => ({
      ...prev,
      questions: updatedQuestions
    }));

    setQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    });
    setEditingQuestionIndex(null);
    showNotification('success', 'Question updated successfully');
  };

  const handleDeleteQuestion = (index: number) => {
    const updatedQuestions = questionBankForm.questions.filter((_, i) => i !== index);
    setQuestionBankForm(prev => ({
      ...prev,
      questions: updatedQuestions
    }));
    showNotification('success', 'Question deleted successfully');
  };

  const getFileIcon = (type: ContentType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'IMAGE':
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case 'VIDEO':
        return <Video className="w-5 h-5 text-purple-500" />;
    }
  };

  const getTestTypeColor = (type: TestType) => {
    switch (type) {
      case 'TDG':
        return 'bg-red-100 text-red-800';
      case 'VEHICLE':
        return 'bg-blue-100 text-blue-800';
      case 'HOS':
        return 'bg-green-100 text-green-800';
      case 'WINTER':
        return 'bg-purple-100 text-purple-800';
    }
  };

  return (
    <div className={showOnly ? "" : "p-6 bg-main min-h-screen"}>
      <div className={showOnly ? "" : "max-w-7xl mx-auto"}>
        {/* Header - Only show if not used as child component */}
        {!showOnly && (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-primary mb-2">Training & Test Management</h1>
              <p className="text-secondary">Manage training content and create question banks for driver tests</p>
            </div>

            {/* Tabs - Only show if not used as child component */}
            <div className="bg-card rounded-lg shadow-sm mb-6">
              <div className="flex border-b border-theme">
                <button
                  onClick={() => setActiveTab('training')}
                  className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'training'
                      ? 'text-[rgba(0,209,255,0.15)] border-b-2 border-[rgba(0,209,255,0.15)]'
                      : 'text-secondary hover:text-primary'
                    }`}
                >
                  Training Content
                </button>
                <button
                  onClick={() => setActiveTab('questionBanks')}
                  className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'questionBanks'
                      ? 'text-[rgba(0,209,255,0.15)] border-b-2 border-[rgba(0,209,255,0.15)]'
                      : 'text-secondary hover:text-primary'
                    }`}
                >
                  Question Banks
                </button>
              </div>
            </div>
          </>
        )}

        {/* Training Content Tab */}
        {activeTab === 'training' && (
          <div className="bg-card rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-primary">Training Content</h2>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[rgba(0,209,255,0.15)] !text-white rounded-lg hover:bg-[#0d8fc7] transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Content
              </button>
            </div>

            {/* Training Content List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[rgba(0,209,255,0.15)]"></div>
                <p className="mt-4 text-secondary">Loading training content...</p>
              </div>
            ) : trainingContent.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-secondary mx-auto mb-4" />
                <p className="text-secondary text-lg">No training content uploaded yet</p>
                <p className="text-secondary text-sm mt-2">Click "Upload Content" to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trainingContent.map((content) => (
                  <div
                    key={content.id}
                    className="bg-[#0f1b2d] border border-[rgba(0,209,255,0.15)] rounded-xl p-5 hover:shadow-lg hover:border-[rgba(0,209,255,0.35)] transition-all duration-300"
                  >
                    {/* Top Section */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex gap-3">
                        <div className="text-red-400">
                          {getFileIcon(content.type)}
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-primary font-semibold line-clamp-2 break-words">
                            {content.name}
                          </h3>
                          <p className="text-xs text-secondary mt-1">
                            {content.type}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewContent(content)}
                          className="text-blue-400 hover:text-blue-600 transition"
                        >
                          {content.type === "VIDEO" ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteContent(content.id)}
                          className="text-red-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Tag */}
                    <div className="mb-3">
                      <span className="px-3 py-1 rounded-md text-xs font-medium bg-[rgba(255,255,255,0.08)] text-primary">
                        {content.testType}
                      </span>
                    </div>

                    {/* Footer */}
                    {content.uploadedAt && (
                      <p className="text-xs text-secondary">
                        Uploaded:{" "}
                        {new Date(content.uploadedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Question Banks Tab */}
        {activeTab === 'questionBanks' && (
          <div className="bg-card rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-primary">Question Banks</h2>
              <button
                onClick={handleCreateQuestionBank}
                className="flex items-center gap-2 px-4 py-2 bg-[rgba(0,209,255,0.15)] !text-white rounded-lg hover:bg-[#0d8fc7] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Question Bank
              </button>
            </div>

            {/* Question Banks List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[rgba(0,209,255,0.15)]"></div>
                <p className="mt-4 text-secondary">Loading question banks...</p>
              </div>
            ) : questionBanks.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-secondary mx-auto mb-4" />
                <p className="text-secondary text-lg">No question banks created yet</p>
                <p className="text-secondary text-sm mt-2">Click "Create Question Bank" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questionBanks.map((bank) => (
                  <div key={bank.id} className="border border-theme rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-primary">{bank.testName}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getTestTypeColor(bank.testType)}`}>
                            {bank.testType}
                          </span>
                          {bank.mandatory && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-secondary">
                          <span>Passing: {bank.passingPercentage}%</span>
                          <span>Questions: {bank.questions.length}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditQuestionBank(bank)}
                          className="p-2 text-[rgba(0,209,255,0.15)] hover:bg-[rgba(0,209,255,0.15)]/10 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestionBank(bank.id)}
                          className="p-2 !text-red-500 !hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Content Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-primary">Upload Training Content</h2>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadForm({ name: '', type: 'PDF', testType: 'TDG', file: null });
                    }}
                    className="text-secondary hover:text-secondary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Content Name</label>
                    <input
                      type="text"
                      value={uploadForm.name}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter content name"
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Content Type</label>
                    <div className="grid grid-cols-3 gap-3">
                      {contentTypeOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setUploadForm(prev => ({ ...prev, type: option.value }))}
                          className={`flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition-colors ${uploadForm.type === option.value
                              ? 'border-[rgba(0,209,255,0.15)] bg-[rgba(0,209,255,0.15)]/10 text-[rgba(0,209,255,0.15)]'
                              : 'border-theme hover:border-gray-400'
                            }`}
                        >
                          {option.icon}
                          <span className="text-sm font-medium">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Test Type</label>
                    <select
                      value={uploadForm.testType}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, testType: e.target.value as TestType }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)]"
                    >
                      {testTypes.map((type) => (
                        <option className="form-option" key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">File</label>
                    <div className="border-2 border-dashed border-theme rounded-lg p-6 text-center">
                      <input
                        type="file"
                        onChange={handleFileSelect}
                        accept={uploadForm.type === 'PDF' ? '.pdf' : uploadForm.type === 'IMAGE' ? 'image/*' : 'video/*'}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="w-8 h-8 text-secondary" />
                        <span className="text-sm text-secondary">
                          {uploadForm.file ? uploadForm.file.name : 'Click to upload or drag and drop'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadForm({ name: '', type: 'PDF', testType: 'TDG', file: null });
                    }}
                    className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadContent}
                    className="px-4 py-2 bg-[rgba(0,209,255,0.15)] !text-white rounded-lg hover:bg-[#0d8fc7] transition-colors"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question Bank Modal */}
        {showQuestionBankModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-primary">
                    {editingQuestionBank ? 'Edit Question Bank' : 'Create Question Bank'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowQuestionBankModal(false);
                      setEditingQuestionBank(null);
                      setEditingQuestionIndex(null);
                    }}
                    className="text-secondary hover:text-secondary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Test Configuration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Test Name</label>
                      <input
                        type="text"
                        value={questionBankForm.testName}
                        onChange={(e) => setQuestionBankForm(prev => ({ ...prev, testName: e.target.value }))}
                        placeholder="Enter test name"
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Test Type</label>
                      <select
                        value={questionBankForm.testType}
                        onChange={(e) => setQuestionBankForm(prev => ({ ...prev, testType: e.target.value as TestType }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)]"
                      >
                        {testTypes.map((type) => (
                          <option className="form-option" key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Passing Percentage</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={questionBankForm.passingPercentage}
                        onChange={(e) => setQuestionBankForm(prev => ({ ...prev, passingPercentage: parseInt(e.target.value) || 80 }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)]"
                      />
                    </div>
                    <div className="flex items-center pt-8">
                      <input
                        type="checkbox"
                        id="mandatory"
                        checked={questionBankForm.mandatory}
                        onChange={(e) => setQuestionBankForm(prev => ({ ...prev, mandatory: e.target.checked }))}
                        className="w-4 h-4 text-[rgba(0,209,255,0.15)] border-theme rounded focus:ring-[rgba(0,209,255,0.15)]"
                      />
                      <label htmlFor="mandatory" className="ml-2 text-sm font-medium text-primary">
                        Mandatory Test
                      </label>
                    </div>
                  </div>

                  {/* Add Question Form */}
                  <div className="border-t border-theme pt-6">
                    <h3 className="text-lg font-bold text-primary mb-4">
                      {editingQuestionIndex !== null ? 'Edit Question' : 'Add Question'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">Question</label>
                        <textarea
                          value={questionForm.question}
                          onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                          placeholder="Enter question text"
                          rows={3}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">Options</label>
                        {questionForm.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2 mb-2">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={questionForm.correctAnswer === index}
                              onChange={() => setQuestionForm(prev => ({ ...prev, correctAnswer: index }))}
                              className="w-4 h-4 text-[rgba(0,209,255,0.15)] border-theme"
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...questionForm.options];
                                newOptions[index] = e.target.value;
                                setQuestionForm(prev => ({ ...prev, options: newOptions }));
                              }}
                              placeholder={`Option ${index + 1}`}
                              className="flex-1 px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)]"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        {editingQuestionIndex !== null ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingQuestionIndex(null);
                                setQuestionForm({ question: '', options: ['', '', '', ''], correctAnswer: 0 });
                              }}
                              className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleUpdateQuestion}
                              className="px-4 py-2 bg-[rgba(0,209,255,0.15)] text-white rounded-lg hover:bg-[#0d8fc7] transition-colors"
                            >
                              Update Question
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleAddQuestion}
                            className="px-4 py-2 bg-[rgba(0,209,255,0.15)] !text-white rounded-lg hover:bg-[#0d8fc7] transition-colors"
                          >
                            Add Question
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="border-t border-theme pt-6">
                    <h3 className="text-lg font-bold text-primary mb-4">
                      Questions ({questionBankForm.questions.length})
                    </h3>
                    {questionBankForm.questions.length === 0 ? (
                      <p className="text-secondary text-center py-8">No questions added yet</p>
                    ) : (
                      <div className="space-y-4">
                        {questionBankForm.questions.map((question, index) => (
                          <div key={question.id} className="border border-theme rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <p className="font-medium text-primary mb-2">
                                  {index + 1}. {question.question}
                                </p>
                                <div className="space-y-1">
                                  {question.options.map((option, optIndex) => (
                                    <div
                                      key={optIndex}
                                      className={`flex items-center gap-2 text-sm ${optIndex === question.correctAnswer
                                          ? 'text-green-600 font-medium'
                                          : 'text-secondary'
                                        }`}
                                    >
                                      {optIndex === question.correctAnswer ? (
                                        <CheckCircle className="w-4 h-4" />
                                      ) : (
                                        <div className="w-4 h-4" />
                                      )}
                                      <span>{String.fromCharCode(65 + optIndex)}. {option}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <button
                                  onClick={() => handleEditQuestion(index)}
                                  className="p-2 text-[rgba(0,209,255,0.15)] hover:bg-[rgba(0,209,255,0.15)]/10 rounded transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(index)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 border-t border-theme pt-6">
                  <button
                    onClick={() => {
                      setShowQuestionBankModal(false);
                      setEditingQuestionBank(null);
                      setEditingQuestionIndex(null);
                      setQuestionBankForm({
                        testName: '',
                        testType: 'TDG',
                        passingPercentage: 80,
                        mandatory: false,
                        questions: []
                      });
                      setQuestionForm({
                        question: '',
                        options: ['', '', '', ''],
                        correctAnswer: 0
                      });
                    }}
                    className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveQuestionBank}
                    disabled={loading}
                    className="px-4 py-2 bg-[rgba(0,209,255,0.15)] !text-white rounded-lg hover:bg-[#0d8fc7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : editingQuestionBank ? 'Update' : 'Create'} Question Bank
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-[10002] flex flex-col gap-2">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>
    </div>
  );
};

export default TrainingTestManagement;

