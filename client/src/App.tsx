import { Routes, Route, Navigate } from 'react-router-dom';
import { ChatContent } from './components/chat/ChatContent/ChatContent';

function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<ChatContent key="new" />} />
      <Route path="/chat/:conversationId" element={<ChatContent key="chat" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
