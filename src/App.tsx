import { useAuth } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { ChatApp } from '@/components/ChatApp';

export default function App() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex h-full items-center justify-center bg-tg-bg-light dark:bg-tg-bg-dark">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-tg-blue/30 border-t-tg-blue" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <ChatProvider>
      <ChatApp />
    </ChatProvider>
  );
}
