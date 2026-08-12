import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConversationListScreen } from '../modules/messaging/screens/ConversationListScreen';
import { ChatScreen } from '../modules/messaging/screens/ChatScreen';
import { CallScreen } from '../modules/calls/screens/CallScreen';
import { CallHistoryScreen } from '../modules/calls/screens/CallHistoryScreen';
import { MediaViewerScreen } from '../modules/media/screens/MediaViewerScreen';

export function AppRouter() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path='/' element={<ConversationListScreen />} />
				<Route path='/chat/:conversationId' element={<ChatScreen />} />
				<Route path='/call/:callId' element={<CallScreen />} />
				<Route path='/call-history' element={<CallHistoryScreen />} />
				<Route
					path='/media/:attachmentId'
					element={<MediaViewerScreen />}
				/>
				<Route path='*' element={<Navigate to='/' replace />} />
			</Routes>
		</BrowserRouter>
	);
}
