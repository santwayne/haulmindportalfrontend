import React, { useState, useEffect } from 'react';
import { FileText, Image, Video, MessageSquare, Upload, CheckCircle2, XCircle, Eye, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserRole, getUserId } from '../../../utils/auth';
import {
  getTrainingContent,
  getTrainingContentSignedUrl,
  getQuestionBanks,
  submitTestResult,
  getTestTypes
} from '../../../axios/api/driver';

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
    _id?: string;
    question: string;
    options: string[];
    correctAnswer: number;
  }>;
  assignedRoles?: string[];
  createdAt?: string;
}

interface TestResult {
  _id: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

interface TestType {
  _id?: string;
  name: string;
  displayName?: string;
}

const TrainingContentView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = getUserRole();
  const userId = getUserId() || '';
  const [loading, setLoading] = useState(true);
  const [trainingContent, setTrainingContent] = useState<TrainingContent[]>([]);
  const [qaContent, setQAContent] = useState<QAItem[]>([]);
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, Record<number, number>>>({});
  const [submittedQA, setSubmittedQA] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, { correct: number; total: number; passed: boolean }>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [, setTestResults] = useState<Record<string, TestResult>>({});

  // Determine target role and dashboard route based on the current URL
  const isDispatchRoute = location.pathname.includes('/dispatch/training');
  const isFleetMaintenanceRoute = location.pathname.includes('/fleetmaintenance/training');
  const isComplianceRoute = location.pathname.includes('/compliance/training');
  const isAccountsRoute = location.pathname.includes('/accounts/training');
  const isHealthSafetyRoute = location.pathname.includes('/healthandsafety/training');

  let targetRole: string;
  let roleLabel: string;
  let dashboardRoute: string;

  if (isDispatchRoute) {
    targetRole = 'dispatcher';
    roleLabel = 'Dispatcher';
    dashboardRoute = '/dispatch';
  } else if (isFleetMaintenanceRoute) {
    targetRole = 'Fleet Maintenance Manager';
    roleLabel = 'Fleet Maintenance';
    dashboardRoute = '/fleetmaintenance';
  } else if (isComplianceRoute) {
    targetRole = 'Compliance Manager';
    roleLabel = 'Compliance';
    dashboardRoute = '/compliance';
  } else if (isAccountsRoute) {
    targetRole = 'accountant';
    roleLabel = 'Accountant';
    dashboardRoute = '/accounts';
  } else if (isHealthSafetyRoute) {
    targetRole = 'safety officer';
    roleLabel = 'Health & Safety';
    dashboardRoute = '/healthandsafety';
  } else {
    // Default to HR for Management route
    targetRole = 'hr';
    roleLabel = 'HR';
    dashboardRoute = '/Management';
  }

  // Redirect to dashboard on the first login of each session.
  // Login.tsx sets 'showDashboardFirst' in sessionStorage to ensure the user
  // always sees their dashboard before accessing training content.
  useEffect(() => {
    const shouldShowDashboardFirst = sessionStorage.getItem('showDashboardFirst') === 'true';
    if (shouldShowDashboardFirst) {
      sessionStorage.removeItem('showDashboardFirst');
      navigate(dashboardRoute, { replace: true });
    }
  }, [dashboardRoute, navigate]);

  console.log('TrainingContentView - Path:', location.pathname);
  console.log('TrainingContentView - User role:', userRole, 'Target role:', targetRole);

  useEffect(() => {
    fetchAllData();
  }, [targetRole]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      console.log('=== Fetching Training Data ===');
      console.log('User role:', userRole);
      console.log('Target role:', targetRole);
      console.log('User ID:', userId);

      // Fetch training content assigned to the target role
      const contentResponse = await getTrainingContent({ role: targetRole });
      console.log(`Training content response for ${targetRole}:`, contentResponse);

      if (contentResponse?.success && Array.isArray(contentResponse.data)) {
        // Filter content assigned to the target role
        const roleContent = contentResponse.data.filter((item: TrainingContent) => {
          // Include if assignedRoles includes target role or if no assignedRoles (backward compatibility)
          return !item.assignedRoles || item.assignedRoles.length === 0 || item.assignedRoles.includes(targetRole);
        });
        console.log('Total content from API:', contentResponse.data.length);
        console.log(`${targetRole} training content:`, roleContent.length, 'items');
        setTrainingContent(roleContent);
      } else {
        console.warn('Training content response not successful or not array:', contentResponse);
        setTrainingContent([]);
      }

      // Fetch question banks assigned to the target role
      const qaResponse = await getQuestionBanks({ role: targetRole });
      console.log(`Question banks response for ${targetRole}:`, qaResponse);

      if (qaResponse?.success && Array.isArray(qaResponse.data)) {
        // Filter Q&A assigned to the target role
        const roleQA = qaResponse.data.filter((item: QAItem) => {
          // Include if assignedRoles includes target role or if no assignedRoles (backward compatibility)
          return !item.assignedRoles || item.assignedRoles.length === 0 || item.assignedRoles.includes(targetRole);
        });
        console.log('Total Q&A from API:', qaResponse.data.length);
        console.log(`${targetRole} question banks:`, roleQA.length, 'items');
        setQAContent(roleQA);
      } else {
        console.warn('Question banks response not successful or not array:', qaResponse);
        setQAContent([]);
      }

      console.log('=== Fetch Complete ===');

      // Fetch test types
      const testTypesResponse = await getTestTypes();
      if (testTypesResponse?.success && Array.isArray(testTypesResponse.data)) {
        setTestTypes(testTypesResponse.data);
      }

      // Fetch existing test results for this user
      // This would be done via a separate API call if available
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load training content. Please refresh the page.');
    } finally {
      setLoading(false);
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

  const handleAnswerSelect = (qaId: string, questionIndex: number, answerIndex: number) => {
    if (submittedQA[qaId]) return;

    setUserAnswers((prev) => ({
      ...prev,
      [qaId]: {
        ...prev[qaId],
        [questionIndex]: answerIndex,
      },
    }));
  };

  const handleSubmitQA = async (qaId: string, qaItem: QAItem) => {
    if (!userId) {
      alert('User ID not found. Please login again.');
      return;
    }

    const answers = userAnswers[qaId] || {};
    const allAnswered = qaItem.questions.every((_, idx) => answers[idx] !== undefined);

    if (!allAnswered) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setSubmitting((prev) => ({ ...prev, [qaId]: true }));

    try {
      // Format answers for submission
      const formattedAnswers = qaItem.questions.map((q, index) => {
        const questionId = q._id || index.toString();
        const selectedAnswer = answers[index] ?? -1;
        return {
          questionId,
          selectedAnswer
        };
      });

      const response = await submitTestResult({
        driverId: userId,
        testType: qaItem.testType,
        questionBankId: qaId,
        answers: formattedAnswers
      });

      if (response?.success && response.data) {
        const result = response.data;
        const score = result.score || 0;
        const passed = result.passed || false;
        const totalQuestions = qaItem.questions.length;
        const correctAnswers = Math.round((score / 100) * totalQuestions);

        setScores((prev) => ({
          ...prev,
          [qaId]: { correct: correctAnswers, total: totalQuestions, passed }
        }));

        setSubmittedQA((prev) => ({
          ...prev,
          [qaId]: true,
        }));

        setTestResults((prev) => ({
          ...prev,
          [qaId]: {
            _id: result._id || '',
            score,
            passed,
            createdAt: result.createdAt || new Date().toISOString()
          }
        }));

        alert(`Test submitted successfully! Score: ${score}% (${correctAnswers}/${totalQuestions}) - ${passed ? 'Passed' : 'Failed'}`);
      } else {
        alert(response?.message || 'Failed to submit test. Please try again.');
      }
    } catch (error: any) {
      console.error('Error submitting test:', error);
      alert(error?.response?.data?.message || 'Failed to submit test. Please try again.');
    } finally {
      setSubmitting((prev) => ({ ...prev, [qaId]: false }));
    }
  };

  const handleResetQA = (qaId: string) => {
    setUserAnswers((prev) => {
      const newAnswers = { ...prev };
      delete newAnswers[qaId];
      return newAnswers;
    });
    setSubmittedQA((prev) => {
      const newSubmitted = { ...prev };
      delete newSubmitted[qaId];
      return newSubmitted;
    });
    setScores((prev) => {
      const newScores = { ...prev };
      delete newScores[qaId];
      return newScores;
    });
    setTestResults((prev) => {
      const newResults = { ...prev };
      delete newResults[qaId];
      return newResults;
    });
  };

  if (loading) {
    return (
      <div className="p-6 bg-main min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-blue)] mx-auto mb-4" />
          <p className="text-secondary">Loading training content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-main min-h-screen">
      <div className="w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-headings mb-2">Training Content</h1>
          <p className="text-secondary">
            Training materials and Q&A for {roleLabel}
          </p>
        </div>

        {/* Training Materials Section */}
        <div className="bg-card rounded-lg shadow-sm mb-6">
          <div className="p-6 border-b border-theme">
            <h2 className="text-xl font-semibold text-headings">Training Materials</h2>
            <p className="text-sm text-secondary mt-1">
              Videos, PDFs, and images for your role
            </p>
          </div>
          <div className="p-6">
            {trainingContent.length === 0 ? (
              <div className="text-center py-12 text-secondary">
                <Upload className="w-12 h-12 mx-auto mb-4 text-secondary" />
                <p>No training materials available yet</p>
                <p className="text-sm mt-2">Training materials will appear here when uploaded</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainingContent.map((item) => (
                  <div key={item._id} className="bg-card rounded-lg p-4 border border-theme">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="text-[var(--accent-blue)]">{getIcon(item.type)}</div>
                        <h3 className="font-semibold text-headings">{item.name}</h3>
                      </div>
                      <button
                        onClick={() => handleViewContent(item._id, item.type)}
                        className="text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/70 p-1"
                        title="View content"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    {item.description && (
                      <p className="text-sm text-secondary mt-2 mb-3">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm text-secondary mt-3">
                      <div className="flex items-center gap-2">
                        <span className="capitalize bg-[rgba(255,255,255,0.08)] text-secondary px-2 py-1 rounded text-xs">{getTypeLabel(item.type)}</span>
                        <span className="bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] px-2 py-1 rounded text-xs">{getTestTypeDisplayName(item.testType)}</span>
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
            <h2 className="text-xl font-semibold text-headings">Q&A Content</h2>
            <p className="text-sm text-secondary mt-1">
              Questions and answers for your role
            </p>
          </div>
          <div className="p-6">
            {qaContent.length === 0 ? (
              <div className="text-center py-12 text-secondary">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-secondary" />
                <p>No Q&A content available yet</p>
                <p className="text-sm mt-2">Q&A content will appear here when added</p>
              </div>
            ) : (
              <div className="space-y-4">
                {qaContent.map((item) => {
                  const isSubmitted = submittedQA[item._id];
                  const answers = userAnswers[item._id] || {};
                  const score = scores[item._id];
                  const allAnswered = item.questions.every((_, idx) => answers[idx] !== undefined);
                  const isSubmitting = submitting[item._id];

                  return (
                    <div key={item._id} className="bg-card rounded-lg p-4 border border-theme">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-headings">{item.testName}</h3>
                              <span className="bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] px-2 py-1 rounded text-xs">{getTestTypeDisplayName(item.testType)}</span>
                              <span className="text-sm text-secondary">Passing: {item.passingPercentage}%</span>
                              <span className="text-sm text-secondary">Questions: {item.questions.length}</span>
                              {item.mandatory && <span className="text-xs text-[var(--accent-purple)] font-medium">Mandatory</span>}
                            </div>

                          </div>
                          {isSubmitted && score && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-theme">
                              <span className="text-sm font-medium text-headings">Score:</span>
                              <span className={`text-lg font-bold ${score.passed ? 'text-[var(--accent-green)]' : score.correct / score.total >= 0.7 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-purple)]'}`}>
                                {score.correct}/{score.total}
                              </span>
                              <span className="text-sm text-secondary">
                                ({Math.round((score.correct / score.total) * 100)}%)
                              </span>
                              {score.passed && (
                                <CheckCircle2 className="w-5 h-5 text-[var(--accent-green)]" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="space-y-3 mt-3">
                          {item.questions.map((q, idx) => {
                            const userAnswer = answers[idx];
                            const isCorrect = userAnswer === q.correctAnswer;
                            const showResults = isSubmitted;

                            return (
                              <div key={idx} className="bg-card rounded p-3 border border-theme">
                                <p className="font-medium text-headings mb-2">Q{idx + 1}: {q.question}</p>
                                <div className="space-y-1">
                                  {q.options.map((option, optIdx) => {
                                    const isSelected = userAnswer === optIdx;
                                    const isCorrectOption = q.correctAnswer === optIdx;
                                    let optionClass = 'text-secondary';

                                    if (showResults) {
                                      if (isCorrectOption) {
                                        optionClass = 'text-[var(--accent-green)] font-medium';
                                      } else if (isSelected && !isCorrectOption) {
                                        optionClass = 'text-[var(--accent-purple)] font-medium';
                                      }
                                    }

                                    return (
                                      <div key={optIdx} className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name={`qa-${item._id}-q${idx}`}
                                          checked={isSelected}
                                          onChange={() => handleAnswerSelect(item._id, idx, optIdx)}
                                          disabled={isSubmitted || isSubmitting}
                                          className="w-4 h-4"
                                        />
                                        <span className={`text-sm ${optionClass} flex items-center gap-2`}>
                                          {String.fromCharCode(65 + optIdx)}. {option}
                                          {showResults && isCorrectOption && (
                                            <CheckCircle2 className="w-4 h-4 text-[var(--accent-green)]" />
                                          )}
                                          {showResults && isSelected && !isCorrectOption && (
                                            <XCircle className="w-4 h-4 text-[var(--accent-purple)]" />
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                                {showResults && (
                                  <div className={`mt-2 text-xs font-medium ${isCorrect ? 'text-[var(--accent-green)]' : 'text-[var(--accent-purple)]'}`}>
                                    {isCorrect ? '✓ Correct!' : '✗ Incorrect. The correct answer is marked in green.'}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 flex gap-2">
                          {!isSubmitted ? (
                            <button
                              onClick={() => handleSubmitQA(item._id, item)}
                              disabled={!allAnswered || isSubmitting}
                              className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                'Submit Answers'
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleResetQA(item._id)}
                              className="px-4 py-2 bg-[rgba(255,255,255,0.08)] text-secondary border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.12)] transition-colors"
                            >
                              Retake Quiz
                            </button>
                          )}
                        </div>
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
  );
};

export default TrainingContentView;
