import React from 'react';
import { FaCheck } from 'react-icons/fa';

interface StepTrackerProps {
  currentStep: 'planned' | 'dispatched' | 'assigned' | 'in-delivery' | 'delivered' | 'completed' | 'paid';
  className?: string;
}

const StepTracker: React.FC<StepTrackerProps> = ({ currentStep, className = '' }) => {
  const steps = [
    { key: 'planned', label: 'Planned' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'in-delivery', label: 'In Delivery' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'completed', label: 'Completed' }
  ];
  
  // Map old status names to new ones for backward compatibility
  const statusMap: any = {
    'assigned': 'dispatched',
    'paid': 'completed'
  };
  
  const normalizedStep = statusMap[currentStep] || currentStep;

  const getStepIndex = (step: string) => {
    return steps.findIndex(s => s.key === step);
  };

  const currentIndex = getStepIndex(normalizedStep);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  isCompleted
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-200 text-secondary'
                } ${
                  isCurrent ? 'ring-4 ring-green-200' : ''
                }`}
              >
                {isCompleted ? <FaCheck size={14} /> : index + 1}
              </div>
              <span
                className={`text-xs mt-2 font-medium whitespace-nowrap ${
                  isCompleted ? 'text-green-600' : 'text-secondary'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 rounded-full transition-all ${
                isCompleted ? 'bg-green-500' : 'bg-gray-200'
              }`} style={{ minWidth: '40px' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepTracker;

