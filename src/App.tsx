import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes';
import ErrorBoundary from './components/common/ErrorBoundary';
import { TrialExpiredToastProvider } from './contexts/TrialExpiredToastContext';
import { ChatProvider } from './contexts/ChatContext';
import { CallProvider } from './contexts/CreateCallContext';
import { GlobalCallHandler } from './components/common/GlobalCallHandler';

function App() {
  return (
    <ErrorBoundary>
      <ChatProvider>
        <CallProvider>
          <GlobalCallHandler />
          <TrialExpiredToastProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </Router>
          </TrialExpiredToastProvider>
        </CallProvider>
      </ChatProvider>
    </ErrorBoundary>
  )
}

export default App
