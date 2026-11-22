import { MessageSquare } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { openDriverMessenger } from './driverMessengerEvents';

// Header button (all departments): opens the driver messenger and shows unread count.
const DriverMessagesButton = ({ className = 'header-btn' }: { className?: string }) => {
  const chat = useChat();
  const total: number = chat?.totalUnread || 0;
  return (
    <button
      onClick={() => openDriverMessenger()}
      className={`${className} relative`}
      title="Driver messages"
      aria-label="Driver messages"
    >
      <MessageSquare size={18} />
      {total > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {total > 99 ? '99+' : total}
        </span>
      )}
    </button>
  );
};

export default DriverMessagesButton;
