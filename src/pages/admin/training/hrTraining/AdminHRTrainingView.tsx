import React, { useState, useEffect } from 'react';
import { Upload, FileText, Image, Video, MessageSquare, Plus, Trash2, X, XCircle, User, Clock, Award, TrendingUp, ChevronDown, CheckCircle, Loader2, Eye } from 'lucide-react';
import {
  getTrainingContent,
  createTrainingContent,
  deleteTrainingContent,
  getTrainingContentSignedUrl,
  getQuestionBanks,
  createQuestionBank,
  deleteQuestionBank,
  getTestResults,
  getTestTypes,
  createTestType
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

interface HRUser {
  _id: string;
  name: string;
  email: string;
}

interface TestResult {
  _id: string;
  driverId: {
    _id?: string;
    name?: string;
    email?: string;
  } | string;
  questionBankId?: {
    _id?: string;
    testName?: string;
  } | string;
  score: number;
  passed: boolean;
  createdAt: string;
}

interface TestType {
  _id?: string;
  name: string;
  displayName?: string;
}

const HR_ROLE = 'hr';

const AdminHRTrainingView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [trainingContent, setTrainingContent] = useState<TrainingContent[]>([]);
  const [qaContent, setQAContent] = useState<QAItem[]>([]);
  const [hrUsers, setHrUsers] = useState<HRUser[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [showAddTestTypeModal, setShowAddTestTypeModal] = useState(false);
  const [newTestTypeName, setNewTestTypeName] = useState('');
  const [newTestTypeDisplayName, setNewTestTypeDisplayName] = useState('');
  const [creatingTestType, setCreatingTestType] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch training content for HR role only
      const contentResponse = await getTrainingContent({ role: HR_ROLE });
      if (contentResponse?.success && Array.isArray(contentResponse.data)) {
        const hrContent = contentResponse.data.filter((item: TrainingContent) =>
          !item.assignedRoles || item.assignedRoles.length === 0 || item.assignedRoles.includes(HR_ROLE)
        );
        setTrainingContent(hrContent);
      }

      // Fetch question banks for HR role only
      const qaResponse = await getQuestionBanks({ role: HR_ROLE });
      let hrQA: QAItem[] = [];
      let hrQuestionBankIds: string[] = [];
      if (qaResponse?.success && Array.isArray(qaResponse.data)) {
        hrQA = qaResponse.data.filter((item: QAItem) =>
          !item.assignedRoles || item.assignedRoles.length === 0 || item.assignedRoles.includes(HR_ROLE)
        );
        hrQuestionBankIds = hrQA.map(qa => qa._id);
        setQAContent(hrQA);
      }

      // Fetch test results first - we'll extract HR users from results
      const resultsResponse = await getTestResults();
      console.log('Test results response:', resultsResponse);

      let hrUsersList: HRUser[] = [];
      let hrResults: TestResult[] = [];

      if (resultsResponse?.success && Array.isArray(resultsResponse.data)) {
        // First, filter results for HR-assigned question banks
        const hrResultsFiltered = resultsResponse.data.filter((result: TestResult) => {
          // Handle both populated and non-populated questionBankId
          let questionBankId: string | undefined;
          if (typeof result.questionBankId === 'string') {
            questionBankId = result.questionBankId;
          } else if (result.questionBankId && typeof result.questionBankId === 'object') {
            questionBankId = (result.questionBankId as any)._id || (result.questionBankId as any).toString();
          }

          // Check if question bank is assigned to HR
          const isHRQuestionBank = questionBankId && hrQuestionBankIds.includes(questionBankId);
          return isHRQuestionBank;
        });

        console.log('HR Question Bank IDs:', hrQuestionBankIds);
        console.log('All Test Results:', resultsResponse.data.length);
        console.log('HR Test Results (filtered by question bank):', hrResultsFiltered.length);

        // Extract unique user IDs from HR test results
        const uniqueUserIds = new Set<string>();
        hrResultsFiltered.forEach((result: TestResult) => {
          let driverId: string | undefined;
          if (typeof result.driverId === 'string') {
            driverId = result.driverId;
          } else if (result.driverId && typeof result.driverId === 'object') {
            driverId = result.driverId._id || (result.driverId as any).toString();
          }
          if (driverId) {
            uniqueUserIds.add(driverId);
          }
        });

        console.log('Unique User IDs from test results:', Array.from(uniqueUserIds));

        // Build HR users list from test results (with populated user data if available)
        const hrUsersMap = new Map<string, HRUser>();

        hrResultsFiltered.forEach((result: TestResult) => {
          let driverId: string | undefined;
          let userName: string | undefined;
          let userEmail: string | undefined;

          if (typeof result.driverId === 'string') {
            driverId = result.driverId;
          } else if (result.driverId && typeof result.driverId === 'object') {
            driverId = result.driverId._id || (result.driverId as any).toString();
            userName = result.driverId.name;
            userEmail = result.driverId.email;
          }

          if (driverId && !hrUsersMap.has(driverId)) {
            hrUsersMap.set(driverId, {
              _id: driverId,
              name: userName || 'Unknown User',
              email: userEmail || ''
            });
          }
        });

        hrUsersList = Array.from(hrUsersMap.values());
        hrResults = hrResultsFiltered;

        console.log('HR Users extracted from test results:', hrUsersList.length);
        console.log('HR Test Results:', hrResults.length);

        setHrUsers(hrUsersList);
        setTestResults(hrResults);
      } else {
        console.warn('Test results response not successful:', resultsResponse);
        setHrUsers([]);
        setTestResults([]);
      }

      // Fetch test types
      const testTypesResponse = await getTestTypes();
      if (testTypesResponse?.success && Array.isArray(testTypesResponse.data)) {
        setTestTypes(testTypesResponse.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get aggregate statistics for a quiz
  const getQuizStats = (qaId: string) => {
    const quizResults = testResults.filter(r => {
      const qbId = typeof r.questionBankId === 'object' && r.questionBankId && '_id' in r.questionBankId ? r.questionBankId._id : (typeof r.questionBankId === 'string' ? r.questionBankId : undefined);
      return qbId === qaId;
    });
    if (quizResults.length === 0) return null;

    const totalUsers = quizResults.length;
    const avgScore = quizResults.reduce((sum, r) => sum + (r.score / 100), 0) / totalUsers;

    return {
      totalUsers,
      avgScore,
      completedCount: totalUsers
    };
  };

  // Get HR users with their test status from actual test results
  const getHRUsersWithStatus = () => {
    return hrUsers.map(user => {
      // Find all test results for this HR user
      const userResults = testResults.filter(r => {
        // Handle both populated and non-populated driverId
        let driverId: string | undefined;
        if (typeof r.driverId === 'string') {
          driverId = r.driverId;
        } else if (r.driverId && typeof r.driverId === 'object') {
          driverId = r.driverId._id || (r.driverId as any).toString();
        }
        return driverId === user._id;
      });

      let status: 'passed' | 'failed' | 'not-attempted' = 'not-attempted';
      let score: number | undefined;
      let total: number | undefined;

      if (userResults.length > 0) {
        // Get the most recent result across all question banks
        const sortedResults = [...userResults].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const latestResult = sortedResults[0];

        // Determine status based on latest result
        if (latestResult.passed) {
          status = 'passed';
        } else {
          status = 'failed';
        }

        score = latestResult.score;
        total = 100; // Score is already a percentage
      }

      return {
        id: user._id,
        name: user.name,
        status,
        score,
        total
      };
    });
  };

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQAModal, setShowQAModal] = useState(false);
  const [uploadType, setUploadType] = useState<'VIDEO' | 'PDF' | 'IMAGE'>('VIDEO');
  const [uploadTestType, setUploadTestType] = useState<string>('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Q&A Modal states
  const [qaTitle, setQATitle] = useState('');
  const [qaTestType, setQATestType] = useState<string>('');
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

  const handleUpload = async () => {
    if (!uploadTitle.trim() || !uploadFile) {
      alert('Please provide a title and select a file');
      return;
    }

    if (!uploadTestType) {
      alert('Please select a test type');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', uploadTitle);
      formData.append('type', uploadType);
      formData.append('testType', uploadTestType);
      formData.append('description', uploadDescription);
      formData.append('assignedRoles', JSON.stringify([HR_ROLE]));
      formData.append('file', uploadFile);

      const response = await createTrainingContent(formData);
      if (response?.success) {
        await fetchAllData();
        setUploadTitle('');
        setUploadDescription('');
        setUploadFile(null);
        setShowUploadModal(false);
        alert('Training content uploaded successfully');
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

  const handleAddQuestionToQA = () => {
    if (!currentQQuestion.trim() || currentQOptions.filter(opt => opt.trim()).length < 2) {
      alert('Please fill in the question and at least 2 options');
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

  const handleAddTestType = async () => {
    if (!newTestTypeName.trim() || !newTestTypeDisplayName.trim()) {
      alert('Please provide both name and display name');
      return;
    }

    setCreatingTestType(true);
    try {
      const response = await createTestType({
        name: newTestTypeName.trim(),
        displayName: newTestTypeDisplayName.trim()
      });

      if (response?.success) {
        await fetchAllData();
        setNewTestTypeName('');
        setNewTestTypeDisplayName('');
        setShowAddTestTypeModal(false);
        alert('Test type created successfully');
      } else {
        alert(response?.message || 'Failed to create test type');
      }
    } catch (error) {
      console.error('Error creating test type:', error);
      alert('Failed to create test type');
    } finally {
      setCreatingTestType(false);
    }
  };

  const handleAddQA = async () => {
    if (!qaTitle.trim() || qaQuestions.length === 0) {
      alert('Please provide a title and add at least one question');
      return;
    }

    if (!qaTestType) {
      alert('Please select a test type');
      return;
    }

    setCreatingQA(true);
    try {
      const payload = {
        testName: qaTitle,
        testType: qaTestType,
        passingPercentage: 80,
        mandatory: false,
        questions: qaQuestions,
        assignedRoles: [HR_ROLE]
      };

      const response = await createQuestionBank({
        ...payload,
        testType: payload.testType as 'TDG' | 'VEHICLE' | 'HOS' | 'WINTER'
      });
      if (response?.success) {
        await fetchAllData();
        setQATitle('');
        setQADescription('');
        setQAQuestions([]);
        setCurrentQQuestion('');
        setCurrentQOptions(['', '', '', '']);
        setCurrentQCorrectAnswer(0);
        setShowQAModal(false);
        alert('Q&A created successfully');
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

  const handleDeleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      const response = await deleteTrainingContent(id);
      if (response?.success) {
        await fetchAllData();
        alert('Content deleted successfully');
      } else {
        alert(response?.message || 'Failed to delete content');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Failed to delete content');
    }
  };

  const handleDeleteQA = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Q&A?')) return;

    try {
      const response = await deleteQuestionBank(id);
      if (response?.success) {
        await fetchAllData();
        alert('Q&A deleted successfully');
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

  const getTestTypeDisplayName = (testTypeName: string) => {
    const testType = testTypes.find(t => t.name === testTypeName);
    return testType ? testType.displayName : testTypeName;
  };

  const handleViewContent = async (contentId: string, _contentType: string) => {
    try {
      const response = await getTrainingContentSignedUrl(contentId, 'inline');
      console.log('Signed URL response:', response);

      // Backend returns: { success: true, url: signedUrl } or { success: true, data: { url: signedUrl } }
      const signedUrl = response?.url || response?.data?.url;

      if (response?.success && signedUrl) {
        window.open(signedUrl, '_blank');
      } else {
        console.error('Invalid response structure:', response);
        alert(response?.message || 'Failed to get content URL. Please try again.');
      }
    } catch (error: any) {
      console.error('Error getting signed URL:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to open content';
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-main min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[rgba(0,209,255,0.15)] mx-auto mb-4" />
          <p className="text-secondary">Loading training content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-main min-h-screen">
      <div className="w-full mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shadow-lg bg-[rgba(17,131,224,0.1)]">
              <FileText className="w-8 h-8 text-[var(--accent-navyblue)]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">HR Training Content</h1>
              <p className="text-secondary mt-1">
                View all training materials and Q&A content managed by HR
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Quiz Results Sidebar - HR Users Only */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-card rounded-lg shadow-sm">
              <div className="p-4 border-b border-theme">
                <h2 className="font-semibold text-primary">Quiz Results</h2>
                <p className="text-xs text-secondary mt-1">HR Users Only</p>
              </div>
              <div className="p-4 space-y-3">
                {(() => {
                  // Calculate aggregate stats from actual test results
                  const roleUsers = getHRUsersWithStatus();
                  const isDropdownOpen = openDropdown === 'hr';

                  // Count users by status from actual test results
                  const passedCount = roleUsers.filter(u => u.status === 'passed').length;
                  const failedCount = roleUsers.filter(u => u.status === 'failed').length;
                  const notAttemptedCount = roleUsers.filter(u => u.status === 'not-attempted').length;

                  // Calculate total completions (total number of test results submitted)
                  const totalCompletions = testResults.length;

                  // Calculate average score from all test results
                  let avgScore = 0;
                  if (testResults.length > 0) {
                    const totalScore = testResults.reduce((sum, r) => sum + r.score, 0);
                    avgScore = totalScore / testResults.length / 100; // Convert percentage to decimal
                  }

                  // Count unique users who have completed at least one test
                  const uniqueUsersCompleted = new Set(
                    testResults.map(r => {
                      if (typeof r.driverId === 'string') {
                        return r.driverId;
                      } else if (r.driverId && typeof r.driverId === 'object') {
                        return r.driverId._id || (r.driverId as any).toString();
                      }
                      return null;
                    }).filter(Boolean)
                  ).size;

                  return (
                    <div className="rounded-lg border-2 transition-all border-theme bg-card hover:border-theme">
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-primary">HR</span>
                          {avgScore > 0 && (
                            <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${avgScore >= 0.9 ? 'bg-[#00FFA3]/10 text-[#00FFA3]' :
                                avgScore >= 0.7 ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                                  'bg-rose-500/10 text-rose-400'
                              }`}>
                              {Math.round(avgScore * 100)}%
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-secondary">
                            <User className="w-3.5 h-3.5" />
                            <span>{roleUsers.length} user{roleUsers.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-secondary">
                            <Award className="w-3.5 h-3.5" />
                            <span>{totalCompletions} total completion{totalCompletions !== 1 ? 's' : ''}</span>
                          </div>
                          {uniqueUsersCompleted > 0 && (
                            <div className="flex items-center gap-2 text-xs text-secondary">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{uniqueUsersCompleted} user{uniqueUsersCompleted !== 1 ? 's' : ''} completed</span>
                            </div>
                          )}
                          {avgScore > 0 && (
                            <div className="w-full bg-[rgba(255,255,255,0.08)] rounded-full h-1.5 mt-2">
                              <div
                                className={`h-1.5 rounded-full transition-all ${avgScore >= 0.9 ? 'bg-[#00FFA3]' : avgScore >= 0.7 ? 'bg-[#F59E0B]' : 'bg-rose-400'
                                  }`}
                                style={{ width: `${avgScore * 100}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Dropdown Toggle Button */}
                        <button
                          onClick={() => setOpenDropdown(isDropdownOpen ? null : 'hr')}
                          className="w-full !mt-3 flex items-center justify-between px-2 py-1.5 text-xs font-medium text-[#8B9BB4] bg-[rgba(17,131,224,0.08)] rounded-lg border border-[rgba(17,131,224,0.2)] hover:bg-[rgba(17,131,224,0.15)] hover:text-[var(--accent-navyblue)] transition-colors"
                        >
                          <span>View Users ({roleUsers.length})</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {/* Dropdown Content */}
                      {isDropdownOpen && (
                        <div className="border-t border-theme bg-card rounded-b-lg">
                          <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                            {roleUsers.map((user) => {
                              const getStatusBadge = () => {
                                if (user.status === 'passed') {
                                  return (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#00FFA3]/10 text-[#00FFA3] border border-[#00FFA3]/20 rounded-full text-xs font-medium">
                                      <CheckCircle className="w-3 h-3" />
                                      <span>Passed</span>
                                      {user.score !== undefined && (
                                        <span className="font-bold">({user.score}/{user.total})</span>
                                      )}
                                    </div>
                                  );
                                } else if (user.status === 'failed') {
                                  return (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-medium">
                                      <XCircle className="w-3 h-3" />
                                      <span>Failed</span>
                                      {user.score !== undefined && (
                                        <span className="font-bold">({user.score}/{user.total})</span>
                                      )}
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[rgba(255,255,255,0.06)] text-[#8B9BB4] border border-[rgba(255,255,255,0.08)] rounded-full text-xs font-medium">
                                      <Clock className="w-3 h-3" />
                                      <span>Not Attempted</span>
                                    </div>
                                  );
                                }
                              };

                              return (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-2 rounded hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                      style={{ background: 'linear-gradient(135deg, rgba(0,209,255,0.15) 0%, #0d8fc4 100%)' }}
                                    >
                                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <span className="text-sm text-primary font-medium">{user.name}</span>
                                  </div>
                                  {getStatusBadge()}
                                </div>
                              );
                            })}
                          </div>

                          {/* Summary Footer */}
                          <div className="border-t border-theme p-2 bg-card rounded-b-lg">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-center">
                                <div className="font-semibold text-[#00FFA3]">{passedCount}</div>
                                <div className="text-secondary">Passed</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-rose-400">{failedCount}</div>
                                <div className="text-secondary">Failed</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-secondary">{notAttemptedCount}</div>
                                <div className="text-secondary">Pending</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">

            {/* Training Materials Section */}
            <div className="bg-card rounded-lg shadow-sm mb-6">
              <div className="p-6 border-b border-theme">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-primary">Training Materials</h2>
                    <p className="text-sm text-secondary mt-1">
                      Training materials for HR role
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUploadModal(true);
                      setUploadType('VIDEO');
                      setUploadTestType(testTypes.length > 0 ? testTypes[0].name : '');
                      setUploadTitle('');
                      setUploadDescription('');
                      setUploadFile(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00D1FF]/10 border border-[#00D1FF]/30 text-[#00D1FF] rounded-lg hover:bg-[#00D1FF]/20 hover:border-[#00D1FF]/60 hover:shadow-[0_0_16px_rgba(0,209,255,0.2)] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Upload Content
                  </button>
                </div>
              </div>
              <div className="p-6">
                {trainingContent.length === 0 ? (
                  <div className="text-center py-12 text-secondary">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-secondary" />
                    <p>No training materials uploaded yet</p>
                    <p className="text-sm mt-2">Admin can upload training materials for HR role</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trainingContent.map((item) => (
                      <div key={item._id} className="bg-card rounded-lg p-4 border border-theme">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="text-[#00D1FF]">{getIcon(item.type)}</div>
                            <h3 className="font-semibold text-primary">{item.name}</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewContent(item._id, item.type)}
                              className="text-[#00D1FF] hover:text-[#00FFA3] p-1 transition-colors"
                              title="View content"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteContent(item._id)}
                              className="text-[#A855F7] hover:text-red-700 p-1"
                              title="Delete content"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-sm text-secondary mt-2 mb-3">{item.description}</p>
                        )}
                        <div className="flex items-center justify-between text-sm text-secondary mt-3">
                          <div className="flex items-center gap-2">
                            <span className="capitalize bg-[rgba(255,255,255,0.08)] text-[#8B9BB4] px-2 py-1 rounded-md text-xs">{getTypeLabel(item.type)}</span>
                            <span className="bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/20 px-2 py-1 rounded-md text-xs">{getTestTypeDisplayName(item.testType)}</span>
                          </div>
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
            <div className="bg-card rounded-lg shadow-sm">
              <div className="p-6 border-b border-theme">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-primary">Q&A Content</h2>
                    <p className="text-sm text-secondary mt-1">
                      Questions and answers for HR role
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowQAModal(true);
                      setQATitle('');
                      setQATestType(testTypes.length > 0 ? testTypes[0].name : '');
                      setQADescription('');
                      setQAQuestions([]);
                      setCurrentQQuestion('');
                      setCurrentQOptions(['', '', '', '']);
                      setCurrentQCorrectAnswer(0);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00D1FF]/10 border border-[#00D1FF]/30 text-[#00D1FF] rounded-lg hover:bg-[#00D1FF]/20 hover:border-[#00D1FF]/60 hover:shadow-[0_0_16px_rgba(0,209,255,0.2)] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Q&A
                  </button>
                </div>
              </div>
              <div className="p-6">
                {qaContent.length === 0 ? (
                  <div className="text-center py-12 text-secondary">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-secondary" />
                    <p>No Q&A content added yet</p>
                    <p className="text-sm mt-2">Admin can add Q&A content for HR role</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {qaContent.map((item) => {
                      const stats = getQuizStats(item._id);
                      const qbIdForItem = item._id;
                      const allUserResults = testResults
                        .filter(r => {
                          const qbId = typeof r.questionBankId === 'object' && r.questionBankId && '_id' in r.questionBankId ? r.questionBankId._id : (typeof r.questionBankId === 'string' ? r.questionBankId : undefined);
                          return qbId === qbIdForItem;
                        })
                        .map(result => {
                          const driverIdObj = typeof result.driverId === 'object' && result.driverId && '_id' in result.driverId ? result.driverId : null;
                          const userId = driverIdObj && '_id' in driverIdObj ? driverIdObj._id : (typeof result.driverId === 'string' ? result.driverId : '');
                          const userName = driverIdObj && 'name' in driverIdObj ? driverIdObj.name : 'Unknown User';
                          return {
                            userId: userId || '',
                            result: {
                              score: { correct: result.score, total: 100 },
                              completedAt: result.createdAt
                            },
                            userName: userName || 'Unknown User',
                            passed: result.passed
                          };
                        });

                      return (
                        <div key={item._id} className="bg-card rounded-lg p-4 border border-theme relative">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-semibold text-primary">{item.testName}</h3>
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{getTestTypeDisplayName(item.testType)}</span>
                                  <span className="text-sm text-secondary">Passing: {item.passingPercentage}%</span>
                                  <span className="text-sm text-secondary">Questions: {item.questions.length}</span>
                                  {item.mandatory && <span className="text-xs text-[#A855F7] font-medium">Mandatory</span>}
                                </div>
                                {stats && (
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-card rounded-lg border border-theme">
                                      <span className="text-xs font-medium text-secondary">Avg Score:</span>
                                      <span className={`text-sm font-bold ${stats.avgScore >= 0.9 ? 'text-green-600' : stats.avgScore >= 0.7 ? 'text-[#00FFA3]' : 'text-[#A855F7]'}`}>
                                        {Math.round(stats.avgScore * 100)}%
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-card rounded-lg border border-theme">
                                      <span className="text-xs font-medium text-secondary">Completed:</span>
                                      <span className="text-sm font-bold text-primary">{stats.totalUsers} user{stats.totalUsers !== 1 ? 's' : ''}</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* User Results Cards */}
                              {allUserResults.length > 0 && (
                                <div className="mt-4 mb-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="w-4 h-4 text-[#0ea3d8]" />
                                    <h4 className="text-sm font-semibold text-primary">User Results</h4>
                                    <span className="text-xs text-secondary">({allUserResults.length} {allUserResults.length === 1 ? 'user' : 'users'})</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {allUserResults.map(({ userId, result, userName, passed }) => {
                                      const percentage = result.score.correct; // Score is already a percentage
                                      const getScoreColor = () => {
                                        if (percentage >= 90 || passed) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' };
                                        if (percentage >= 70) return { bg: 'bg-card', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' };
                                        return { bg: 'bg-card', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' };
                                      };
                                      const colors = getScoreColor();
                                      const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

                                      return (
                                        <div key={userId} className={`bg-card rounded-lg border-2 ${colors.border} p-4 hover:shadow-md transition-shadow`}>
                                          <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm`}
                                                style={{ background: 'linear-gradient(135deg, #0ea3d8 0%, #0d8fc4 100%)' }}
                                              >
                                                {initials}
                                              </div>
                                              <div>
                                                <h5 className="font-semibold text-primary text-sm">{userName}</h5>
                                                <p className="text-xs text-secondary mt-0.5">HR</p>
                                              </div>
                                            </div>
                                            <div className={`px-2.5 py-1 rounded-full ${colors.badge} text-xs font-semibold`}>
                                              {Math.round(percentage)}%
                                            </div>
                                          </div>

                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs text-secondary flex items-center gap-1">
                                                <Award className="w-3.5 h-3.5" />
                                                Score
                                              </span>
                                              <span className={`text-sm font-bold ${colors.text}`}>
                                                {result.score.correct}/{result.score.total}
                                              </span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                              <div
                                                className={`h-2 rounded-full transition-all ${percentage >= 90 ? 'bg-green-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                                  }`}
                                                style={{ width: `${percentage}%` }}
                                              />
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-secondary pt-1">
                                              <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(result.completedAt).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric'
                                                })}
                                              </span>
                                              <span className="text-secondary">
                                                {new Date(result.completedAt).toLocaleTimeString('en-US', {
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Questions Display (showing correct answers) */}
                              <div className="space-y-3 mt-3">
                                {item.questions.map((q, idx) => (
                                  <div key={idx} className="bg-card rounded p-3 border border-theme">
                                    <p className="font-medium text-primary mb-2">Q{idx + 1}: {q.question}</p>
                                    <div className="space-y-1">
                                      {q.options.map((option, optIdx) => {
                                        const isCorrectOption = q.correctAnswer === optIdx;
                                        return (
                                          <div key={optIdx} className="flex items-center gap-2">
                                            <input
                                              type="radio"
                                              checked={isCorrectOption}
                                              readOnly
                                              className="w-4 h-4"
                                            />
                                            <span className={`text-sm ${isCorrectOption ? 'text-green-600 font-medium' : 'text-secondary'} flex items-center gap-2`}>
                                              {String.fromCharCode(65 + optIdx)}. {option}
                                              {isCorrectOption && ' ✓ (Correct Answer)'}
                                            </span>
                                          </div>
                                        );
                                      })}
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
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowUploadModal(false)}>
          <div className="bg-card rounded-lg shadow-lg w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-theme">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">Upload Training Content</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadTitle('');
                    setUploadDescription('');
                  }}
                  className="text-secondary hover:text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-secondary mt-1">Add a new training material</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Test Type *</label>
                <div className="flex gap-2">
                  <select
                    value={uploadTestType}
                    onChange={(e) => setUploadTestType(e.target.value)}
                    disabled={uploading}
                    className="flex-1 px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)] disabled:opacity-50"
                  >
                    <option className="form-option" value="">Select Test Type</option>
                    {testTypes.map((type) => (
                      <option  className="form-option" key={type._id} value={type.name}>
                        {type.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddTestTypeModal(true)}
                    disabled={uploading}
                    className="px-4 py-2 bg-[rgba(255,255,255,0.06)] text-primary border border-[rgba(255,255,255,0.1)] rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Type
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Content Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadType('VIDEO')}
                    disabled={uploading}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${uploadType === 'VIDEO'
                        ? 'bg-[#0ea3d8] !text-white border-[#0ea3d8]'
                        : 'bg-card text-primary border-gray-300 hover:bg-[rgba(255,255,255,0.03)]'
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
                        ? 'bg-[#0ea3d8] !text-white border-[#0ea3d8]'
                        : 'bg-card text-primary border-gray-300 hover:bg-[rgba(255,255,255,0.03)]'
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
                        ? 'bg-[#0ea3d8] !text-white border-[#0ea3d8]'
                        : 'bg-card text-primary border-gray-300 hover:bg-[rgba(255,255,255,0.03)]'
                      } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Image className="w-4 h-4 inline mr-2" />
                    Image
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-primary mb-2">
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
                <label htmlFor="description" className="block text-sm font-medium text-primary mb-2">
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
                <label htmlFor="file" className="block text-sm font-medium text-primary mb-2">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowQAModal(false)}>
          <div className="bg-card rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-theme sticky top-0 bg-card">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">Add Q&A</h3>
                <button
                  onClick={() => {
                    setShowQAModal(false);
                    setQATitle('');
                    setQADescription('');
                    setQAQuestions([]);
                    setCurrentQQuestion('');
                    setCurrentQOptions(['', '', '', '']);
                    setCurrentQCorrectAnswer(0);
                  }}
                  className="text-secondary hover:text-secondary"
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

              {/* Test Type */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Test Type *</label>
                <div className="flex gap-2">
                  <select
                    value={qaTestType}
                    onChange={(e) => setQATestType(e.target.value)}
                    disabled={creatingQA}
                    className="flex-1 px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)] disabled:opacity-50"
                  >
                    <option className="form-option" value="">Select Test Type</option>
                    {testTypes.map((type) => (
                      <option className="form-option" key={type._id} value={type.name}>
                        {type.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddTestTypeModal(true)}
                    disabled={creatingQA}
                    className="px-4 py-2 bg-[rgba(255,255,255,0.06)] text-primary border border-[rgba(255,255,255,0.1)] rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Type
                  </button>
                </div>
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
                            className="text-secondary hover:text-rose-400 ml-2 disabled:opacity-50"
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
                              <span className={`text-sm ${q.correctAnswer === optIdx ? 'text-[#00FFA3] font-medium' : 'text-secondary'}`}>
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
                    className="w-full px-4 py-2 bg-[rgba(255,255,255,0.06)] text-primary border border-[rgba(255,255,255,0.1)] rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* Add Test Type Modal */}
      {showAddTestTypeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !creatingTestType && setShowAddTestTypeModal(false)}>
          <div className="bg-card rounded-lg shadow-lg w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-theme">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">Add Test Type</h3>
                <button
                  onClick={() => !creatingTestType && setShowAddTestTypeModal(false)}
                  disabled={creatingTestType}
                  className="text-secondary hover:text-secondary disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-secondary mt-1">Create a new test type</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="test-type-name" className="block text-sm font-medium text-primary mb-2">
                  Name * (e.g., TDG, VEHICLE)
                </label>
                <input
                  id="test-type-name"
                  type="text"
                  value={newTestTypeName}
                  onChange={(e) => setNewTestTypeName(e.target.value.toUpperCase())}
                  placeholder="Enter test type name (uppercase)"
                  disabled={creatingTestType}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)] disabled:opacity-50"
                />
                <p className="text-xs text-secondary mt-1">This will be stored in uppercase</p>
              </div>
              <div>
                <label htmlFor="test-type-display-name" className="block text-sm font-medium text-primary mb-2">
                  Display Name * (e.g., TDG, Vehicle Inspection)
                </label>
                <input
                  id="test-type-display-name"
                  type="text"
                  value={newTestTypeDisplayName}
                  onChange={(e) => setNewTestTypeDisplayName(e.target.value)}
                  placeholder="Enter display name"
                  disabled={creatingTestType}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(0,209,255,0.15)] disabled:opacity-50"
                />
                <p className="text-xs text-secondary mt-1">This is how it will appear in dropdowns</p>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button
                  onClick={() => !creatingTestType && setShowAddTestTypeModal(false)}
                  disabled={creatingTestType}
                  className="px-4 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTestType}
                  disabled={creatingTestType || !newTestTypeName.trim() || !newTestTypeDisplayName.trim()}
                  className="px-4 py-2 bg-[rgba(0,209,255,0.15)] !text-white rounded-lg hover:bg-[#0d8fc4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creatingTestType ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create
                    </>
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

export default AdminHRTrainingView;

