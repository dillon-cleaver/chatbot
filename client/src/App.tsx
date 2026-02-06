import { Routes, Route, Navigate } from 'react-router-dom';
import { ChatContent } from './components/chat/ChatContent/ChatContent';
import { SettingsProvider } from './hooks/useSettings';

function App(): React.JSX.Element {
  return (
    <SettingsProvider>
      <Routes>
        <Route path="/" element={<ChatContent />} />
        <Route path="/chat/:conversationId" element={<ChatContent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SettingsProvider>
  );
}

export default App;
