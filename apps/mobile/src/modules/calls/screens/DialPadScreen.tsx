import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../infrastructure/api.client';
import { useSocketContext } from '../../../app/providers/SocketProvider';
import { useCallsStore } from '../store/calls.store';
import { useAuthStore } from '../../auth/store/auth.store';
import type { User } from '@wudapp/types';

interface SearchUser extends Pick<
	User,
	'id' | 'username' | 'displayName' | 'avatarPath' | 'status'
> {}

export function DialPadScreen() {
	const navigate = useNavigate();
	const { socket } = useSocketContext();
	const currentUser = useAuthStore(s => s.user);
	const { setOutgoing, setPhase } = useCallsStore();

	const [query, setQuery] = useState('');
	const [results, setResults] = useState<SearchUser[]>([]);
	const [loading, setLoading] = useState(false);
	const [selected, setSelected] = useState<SearchUser | null>(null);

	// ── Debounced search ───────────────────────────────────────────────────────
	useEffect(() => {
		if (!query.trim()) {
			setResults([]);
			return;
		}
		const t = setTimeout(async () => {
			setLoading(true);
			try {
				const res = await apiClient.get<SearchUser[]>(
					`/api/users/search?q=${encodeURIComponent(query)}`
				);
				setResults(res.data.filter(u => u.id !== currentUser?.id));
			} catch {
				setResults([]);
			} finally {
				setLoading(false);
			}
		}, 300);
		return () => clearTimeout(t);
	}, [query, currentUser]);

	const initiateCall = (user: SearchUser, type: 'voice' | 'video') => {
		if (!socket) return;

		// We need a conversationId — create a DM first then call
		apiClient
			.post<{ id: string }>('/api/conversations', {
				type: 'dm',
				memberIds: [user.id]
			})
			.then(res => {
				const conversationId = res.data.id;
				socket.emit('call:initiate', { conversationId, type });

				// Optimistically set outgoing state so CallScreen shows ringing
				setOutgoing({
					id: 'pending',
					conversationId,
					type,
					initiatedBy: currentUser?.id ?? '',
					status: 'ringing',
					startedAt: null,
					endedAt: null
				});
				setPhase('outgoing');

				// Navigate to call screen — callId will be updated via socket event
				navigate(`/call/outgoing`);
			})
			.catch(() => {});
	};

	return (
		<div style={styles.root}>
			{/* ── Header ── */}
			<div style={styles.header}>
				<button style={styles.backBtn} onClick={() => navigate('/')}>
					<svg
						width='20'
						height='20'
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth='2.5'
						strokeLinecap='round'
						strokeLinejoin='round'
					>
						<polyline points='15 18 9 12 15 6' />
					</svg>
				</button>
				<span style={styles.headerTitle}>New Call</span>
			</div>

			{/* ── Search input ── */}
			<div style={styles.searchWrap}>
				<div style={styles.searchBox}>
					<svg
						width='16'
						height='16'
						viewBox='0 0 24 24'
						fill='none'
						stroke='#666'
						strokeWidth='2'
						strokeLinecap='round'
						strokeLinejoin='round'
						style={{ flexShrink: 0 }}
					>
						<circle cx='11' cy='11' r='8' />
						<line x1='21' y1='21' x2='16.65' y2='16.65' />
					</svg>
					<input
						style={styles.searchInput}
						placeholder='Search username…'
						value={query}
						onChange={e => {
							setQuery(e.target.value);
							setSelected(null);
						}}
						autoFocus
					/>
					{query.length > 0 && (
						<button
							style={styles.clearBtn}
							onClick={() => {
								setQuery('');
								setResults([]);
								setSelected(null);
							}}
						>
							<svg
								width='14'
								height='14'
								viewBox='0 0 24 24'
								fill='none'
								stroke='#666'
								strokeWidth='2.5'
								strokeLinecap='round'
							>
								<line x1='18' y1='6' x2='6' y2='18' />
								<line x1='6' y1='6' x2='18' y2='18' />
							</svg>
						</button>
					)}
				</div>
			</div>

			{/* ── Results ── */}
			<div style={styles.list}>
				{loading && (
					<div style={styles.centered}>
						<div style={styles.spinner} />
					</div>
				)}

				{!loading && query.length > 0 && results.length === 0 && (
					<div style={styles.centered}>
						<span style={styles.emptyText}>
							No users found for "{query}"
						</span>
					</div>
				)}

				{!loading &&
					results.map(user => (
						<div
							key={user.id}
							style={{
								...styles.userRow,
								background:
									selected?.id === user.id
										? '#111'
										: 'transparent'
							}}
							onClick={() =>
								setSelected(
									selected?.id === user.id ? null : user
								)
							}
						>
							{/* Avatar */}
							<div style={styles.avatar}>
								<span style={styles.avatarLetter}>
									{user.displayName.charAt(0).toUpperCase()}
								</span>
								<span
									style={{
										...styles.dot,
										background:
											user.status === 'online'
												? '#3fc060'
												: '#555'
									}}
								/>
							</div>

							{/* Info */}
							<div style={styles.userInfo}>
								<span style={styles.displayName}>
									{user.displayName}
								</span>
								<span style={styles.username}>
									@{user.username}
								</span>
							</div>

							{/* Call buttons — show when selected */}
							{selected?.id === user.id && (
								<div style={styles.callBtns}>
									<button
										style={styles.callBtn}
										onClick={e => {
											e.stopPropagation();
											initiateCall(user, 'voice');
										}}
										aria-label='Voice call'
									>
										<svg
											width='20'
											height='20'
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
									<button
										style={{
											...styles.callBtn,
											background: '#1a3a5c'
										}}
										onClick={e => {
											e.stopPropagation();
											initiateCall(user, 'video');
										}}
										aria-label='Video call'
									>
										<svg
											width='20'
											height='20'
											viewBox='0 0 24 24'
											fill='none'
											stroke='currentColor'
											strokeWidth='2'
											strokeLinecap='round'
											strokeLinejoin='round'
										>
											<polygon points='23 7 16 12 23 17 23 7' />
											<rect
												x='1'
												y='5'
												width='15'
												height='14'
												rx='2'
												ry='2'
											/>
										</svg>
									</button>
								</div>
							)}
						</div>
					))}
			</div>

			{/* ── Quick dial pad ── */}
			{!query && (
				<div style={styles.dialPad}>
					<div style={styles.dialHint}>
						Enter a username above to find someone
					</div>
					<div style={styles.dialGrid}>
						{[
							'1',
							'2',
							'3',
							'4',
							'5',
							'6',
							'7',
							'8',
							'9',
							'*',
							'0',
							'#'
						].map(k => (
							<button
								key={k}
								style={styles.dialKey}
								onClick={() => setQuery(q => q + k)}
							>
								{k}
							</button>
						))}
					</div>
					<button
						style={styles.dialBackspace}
						onClick={() => setQuery(q => q.slice(0, -1))}
					>
						<svg
							width='20'
							height='20'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
						>
							<path d='M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z' />
							<line x1='18' y1='9' x2='12' y2='15' />
							<line x1='12' y1='9' x2='18' y2='15' />
						</svg>
					</button>
				</div>
			)}
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	root: {
		display: 'flex',
		flexDirection: 'column',
		height: '100dvh',
		background: '#000',
		color: '#fff',
		fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
	},
	header: {
		display: 'flex',
		alignItems: 'center',
		gap: 12,
		padding: '14px 16px',
		borderBottom: '1px solid #1a1a1a',
		flexShrink: 0
	},
	backBtn: {
		background: 'none',
		border: 'none',
		color: '#fff',
		cursor: 'pointer',
		padding: 4,
		display: 'flex',
		alignItems: 'center'
	},
	headerTitle: { fontSize: 18, fontWeight: 700 },
	searchWrap: { padding: '14px 16px', flexShrink: 0 },
	searchBox: {
		display: 'flex',
		alignItems: 'center',
		gap: 10,
		background: '#1c1c1e',
		borderRadius: 14,
		padding: '10px 14px'
	},
	searchInput: {
		flex: 1,
		background: 'none',
		border: 'none',
		color: '#fff',
		fontSize: 16,
		outline: 'none'
	},
	clearBtn: {
		background: 'none',
		border: 'none',
		cursor: 'pointer',
		display: 'flex',
		alignItems: 'center',
		padding: 2
	},
	list: { flex: 1, overflowY: 'auto' },
	centered: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 40
	},
	spinner: {
		width: 24,
		height: 24,
		border: '2px solid #333',
		borderTop: '2px solid #fff',
		borderRadius: '50%',
		animation: 'spin 0.8s linear infinite'
	},
	emptyText: { color: '#555', fontSize: 14, textAlign: 'center' },
	userRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 14,
		padding: '12px 16px',
		cursor: 'pointer',
		transition: 'background 0.15s',
		borderRadius: 0
	},
	avatar: {
		position: 'relative',
		width: 48,
		height: 48,
		borderRadius: '50%',
		background: '#222',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0
	},
	avatarLetter: { fontSize: 18, fontWeight: 600 },
	dot: {
		position: 'absolute',
		bottom: 2,
		right: 2,
		width: 10,
		height: 10,
		borderRadius: '50%',
		border: '2px solid #000'
	},
	userInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
	displayName: { fontSize: 15, fontWeight: 600 },
	username: { fontSize: 13, color: '#666' },
	callBtns: { display: 'flex', gap: 10 },
	callBtn: {
		background: '#1a3a1a',
		border: 'none',
		borderRadius: '50%',
		width: 44,
		height: 44,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		color: '#3fc060',
		cursor: 'pointer',
		flexShrink: 0
	},
	dialPad: {
		padding: '0 16px 32px',
		flexShrink: 0
	},
	dialHint: {
		fontSize: 13,
		color: '#444',
		textAlign: 'center',
		marginBottom: 20
	},
	dialGrid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(3, 1fr)',
		gap: 12,
		marginBottom: 16
	},
	dialKey: {
		background: '#1c1c1e',
		border: 'none',
		borderRadius: 14,
		padding: '18px 0',
		color: '#fff',
		fontSize: 22,
		fontWeight: 500,
		cursor: 'pointer',
		fontFamily: 'inherit'
	},
	dialBackspace: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: '100%',
		background: 'none',
		border: 'none',
		color: '#666',
		cursor: 'pointer',
		padding: 10
	}
};
