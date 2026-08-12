//import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../infrastructure/api.client';
import { useMessagingStore } from '../store/messaging.store';
import { useAuthStore } from '../../auth/store/auth.store';
import { useCallSignaling } from '../../calls/hooks/useCallSignaling';
import type { Conversation } from '@wudapp/types';
import { formatMessageTime } from '../../../shared/utils/date';

export function ConversationListScreen() {
	const navigate = useNavigate();
	const currentUser = useAuthStore(s => s.user);
	const { conversations, setConversations } = useMessagingStore();

	useCallSignaling();

	const { isLoading, isError } = useQuery({
		queryKey: ['conversations'],
		queryFn: async () => {
			const res = await apiClient.get<
				| { conversations?: Conversation[]; length?: number }
				| Conversation[]
			>('/api/conversations');
			const list: Conversation[] = Array.isArray(res.data)
				? res.data
				: ((res.data as any).conversations ?? []);
			setConversations(list);
			return list;
		}
	});

	const convList = Array.from(conversations.values());

	return (
		<div style={styles.root}>
			{/* ── Header ── */}
			<div style={styles.header}>
				<span style={styles.headerTitle}>Wudapp</span>
				<button
					style={styles.iconBtn}
					onClick={() => navigate('/call-history')}
					aria-label='Call history'
				>
					<svg
						width='22'
						height='22'
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth='2'
						strokeLinecap='round'
						strokeLinejoin='round'
					>
						<path d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.14 1.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.11 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z' />
					</svg>
				</button>
			</div>

			{/* ── Body ── */}
			<div style={styles.list}>
				{isLoading && (
					<div style={styles.centered}>
						<div style={styles.spinner} />
					</div>
				)}

				{isError && (
					<div style={styles.centered}>
						<span style={styles.errorText}>
							Could not load conversations
						</span>
					</div>
				)}

				{!isLoading && !isError && convList.length === 0 && (
					<div style={styles.centered}>
						<span style={styles.emptyText}>
							No conversations yet
						</span>
					</div>
				)}

				{convList.map(conv => {
					const otherName =
						conv.name ??
						conv.members?.find(m => m.userId !== currentUser?.id)
							?.user?.displayName ??
						'Unknown';
					const avatarLetter = otherName.charAt(0).toUpperCase();
					const lastMsg = conv.lastMessage;

					return (
						<button
							key={conv.id}
							style={styles.row}
							onClick={() => navigate(`/chat/${conv.id}`)}
						>
							{/* Avatar */}
							<div style={styles.avatar}>
								<span style={styles.avatarLetter}>
									{avatarLetter}
								</span>
								<span style={styles.onlineDot} />
							</div>

							{/* Text */}
							<div style={styles.rowBody}>
								<div style={styles.rowTop}>
									<span style={styles.convName}>
										{otherName}
									</span>
									{lastMsg && (
										<span style={styles.timestamp}>
											{formatMessageTime(
												lastMsg.createdAt
											)}
										</span>
									)}
								</div>
								<div style={styles.rowBottom}>
									<span style={styles.lastMsg}>
										{lastMsg
											? lastMsg.type === 'text'
												? (lastMsg.content ?? '')
												: `📎 ${lastMsg.type}`
											: 'No messages yet'}
									</span>
									{(conv.unreadCount ?? 0) > 0 && (
										<span style={styles.badge}>
											{conv.unreadCount}
										</span>
									)}
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
	root: {
		display: 'flex',
		flexDirection: 'column',
		height: '100dvh',
		background: '#000',
		color: '#fff',
		fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
		overflowX: 'hidden'
	},
	header: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: '16px 20px',
		borderBottom: '1px solid #1a1a1a'
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: 700,
		letterSpacing: -0.5
	},
	iconBtn: {
		background: 'none',
		border: 'none',
		color: '#fff',
		cursor: 'pointer',
		padding: 6,
		borderRadius: 20,
		display: 'flex',
		alignItems: 'center'
	},
	list: {
		flex: 1,
		overflowY: 'auto'
	},
	centered: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		height: 200
	},
	spinner: {
		width: 28,
		height: 28,
		border: '3px solid #333',
		borderTop: '3px solid #fff',
		borderRadius: '50%',
		animation: 'spin 0.8s linear infinite'
	},
	errorText: { color: '#ff4444', fontSize: 14 },
	emptyText: { color: '#555', fontSize: 14 },
	row: {
		display: 'flex',
		alignItems: 'center',
		gap: 14,
		padding: '12px 20px',
		background: 'none',
		border: 'none',
		color: '#fff',
		cursor: 'pointer',
		width: '100%',
		textAlign: 'left',
		transition: 'background 0.15s'
	},
	avatar: {
		position: 'relative',
		width: 52,
		height: 52,
		borderRadius: '50%',
		background: '#222',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0
	},
	avatarLetter: { fontSize: 20, fontWeight: 600, color: '#fff' },
	onlineDot: {
		position: 'absolute',
		bottom: 2,
		right: 2,
		width: 11,
		height: 11,
		borderRadius: '50%',
		background: '#3fc060',
		border: '2px solid #000'
	},
	rowBody: {
		flex: 1,
		minWidth: 0
	},
	rowTop: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'baseline',
		marginBottom: 3
	},
	convName: {
		fontSize: 15,
		fontWeight: 600,
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis'
	},
	timestamp: { fontSize: 12, color: '#555', flexShrink: 0, marginLeft: 8 },
	rowBottom: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	lastMsg: {
		fontSize: 13,
		color: '#666',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		flex: 1
	},
	badge: {
		background: '#0095f6',
		color: '#fff',
		fontSize: 11,
		fontWeight: 700,
		borderRadius: 10,
		padding: '2px 7px',
		marginLeft: 8,
		flexShrink: 0
	}
};
