import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../infrastructure/api.client';
import { useMessagingStore } from '../store/messaging.store';
import { useAuthStore } from '../../auth/store/auth.store';
import { useMessages } from '../hooks/useMessages';
import { useTyping } from '../hooks/useTyping';
import { useCallSignaling } from '../../calls/hooks/useCallSignaling';
import { useSocketContext } from '../../../app/providers/SocketProvider';
import type { Message, Conversation } from '@wudapp/types';
import { formatMessageTime, formatDuration } from '../../../shared/utils/date';

export function ChatScreen() {
	const { conversationId } = useParams<{ conversationId: string }>();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const currentUser = useAuthStore(s => s.user);
	const { socket } = useSocketContext();

	const messages = useMessagingStore(
		s => s.messages.get(conversationId!) ?? []
	);
	const typingUsers = useMessagingStore(
		s => s.typingUsers.get(conversationId!) ?? []
	);

	const [text, setText] = useState('');
	const [replyTo, setReplyTo] = useState<Message | null>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	useMessages(conversationId!);
	const { onType } = useTyping(conversationId!);
	useCallSignaling();

	// ── Fetch conversation metadata ────────────────────────────────────────────
	const { data: conv } = useQuery<Conversation>({
		queryKey: ['conversation', conversationId],
		queryFn: async () => {
			const res = await apiClient.get<Conversation>(
				`/api/conversations/${conversationId}`
			);
			return res.data;
		}
	});

	// ── Scroll to bottom on new messages ──────────────────────────────────────
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages.length]);

	// ── Mark messages read when visible ───────────────────────────────────────
	useEffect(() => {
		if (!socket || !messages.length) return;
		const last = messages[messages.length - 1];
		if (last && last.senderId !== currentUser?.id) {
			socket.emit('message:read', { messageId: last.id });
		}
	}, [messages, socket, currentUser]);

	// ── Send text message ──────────────────────────────────────────────────────
	const sendMutation = useMutation({
		mutationFn: () =>
			apiClient.post('/api/messages', {
				conversationId,
				content: text.trim(),
				type: 'text',
				...(replyTo ? { replyToId: replyTo.id } : {})
			}),
		onSuccess: () => {
			setText('');
			setReplyTo(null);
			qc.invalidateQueries({ queryKey: ['messages', conversationId] });
		}
	});

	const handleSend = () => {
		if (!text.trim()) return;
		sendMutation.mutate();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const otherName =
		conv?.name ??
		conv?.members?.find(m => m.userId !== currentUser?.id)?.user
			?.displayName ??
		'Chat';

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

				<div style={styles.headerInfo}>
					<div style={styles.headerAvatar}>
						{otherName.charAt(0).toUpperCase()}
					</div>
					<div>
						<div style={styles.headerName}>{otherName}</div>
						<div style={styles.headerStatus}>
							{typingUsers.length > 0 ? 'typing…' : 'online'}
						</div>
					</div>
				</div>

				<div style={styles.headerActions}>
					<button
						style={styles.iconBtn}
						onClick={() => {
							socket?.emit('call:initiate', {
								conversationId: conversationId!,
								type: 'voice'
							});
						}}
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
						style={styles.iconBtn}
						onClick={() => {
							socket?.emit('call:initiate', {
								conversationId: conversationId!,
								type: 'video'
							});
						}}
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
			</div>

			{/* ── Messages ── */}
			<div style={styles.messageList}>
				{messages.map(msg => (
					<MessageRow
						key={msg.id}
						msg={msg}
						isOwn={msg.senderId === currentUser?.id}
						onReply={() => setReplyTo(msg)}
					/>
				))}
				<div ref={bottomRef} />
			</div>

			{/* ── Reply banner ── */}
			{replyTo && (
				<div style={styles.replyBanner}>
					<div style={styles.replyBannerInner}>
						<span style={styles.replyLabel}>Replying to</span>
						<span style={styles.replyPreview}>
							{replyTo.content ?? `[${replyTo.type}]`}
						</span>
					</div>
					<button
						style={styles.replyClose}
						onClick={() => setReplyTo(null)}
					>
						✕
					</button>
				</div>
			)}

			{/* ── Input bar ── */}
			<div style={styles.inputBar}>
				<textarea
					ref={inputRef}
					style={styles.input}
					placeholder='Message…'
					rows={1}
					value={text}
					onChange={e => {
						setText(e.target.value);
						onType();
					}}
					onKeyDown={handleKeyDown}
				/>
				<button
					style={{
						...styles.sendBtn,
						opacity: text.trim() ? 1 : 0.4
					}}
					onClick={handleSend}
					disabled={!text.trim() || sendMutation.isPending}
				>
					<svg
						width='20'
						height='20'
						viewBox='0 0 24 24'
						fill='currentColor'
					>
						<path d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' />
					</svg>
				</button>
			</div>
		</div>
	);
}

// ── MessageRow ────────────────────────────────────────────────────────────────
function MessageRow({
	msg,
	isOwn,
	onReply
}: {
	msg: Message;
	isOwn: boolean;
	onReply: () => void;
}) {
	const deleted = !!msg.deletedAt;

	return (
		<div
			style={{
				...styles.msgWrapper,
				justifyContent: isOwn ? 'flex-end' : 'flex-start'
			}}
		>
			<div
				style={{
					...styles.bubble,
					background: isOwn ? '#0095f6' : '#1c1c1e',
					borderRadius: isOwn
						? '18px 18px 4px 18px'
						: '18px 18px 18px 4px',
					maxWidth: '72%'
				}}
				onDoubleClick={onReply}
			>
				{/* Reply thread reference */}
				{msg.replyToId && (
					<div style={styles.replyRef}>
						<span style={styles.replyRefBar} />
						<span style={styles.replyRefText}>
							Replied to a message
						</span>
					</div>
				)}

				{deleted ? (
					<span style={styles.deletedText}>
						This message was deleted
					</span>
				) : msg.type === 'text' ? (
					<span style={styles.msgText}>{msg.content}</span>
				) : (
					<span style={styles.msgText}>📎 {msg.type}</span>
				)}

				<div style={styles.msgMeta}>
					<span style={styles.msgTime}>
						{formatMessageTime(msg.createdAt)}
					</span>
					{msg.editedAt && <span style={styles.edited}>edited</span>}
					{isOwn && <ReadTick msg={msg} />}
				</div>
			</div>
		</div>
	);
}

function ReadTick({ msg }: { msg: Message }) {
	const hasRead = (msg.readBy ?? []).some(r => r.readAt);
	const hasDelivered = (msg.readBy ?? []).some(r => r.deliveredAt);
	const color = hasRead ? '#0095f6' : '#888';
	if (!hasDelivered && !hasRead) {
		return (
			<span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>
				✓
			</span>
		);
	}
	return (
		<span style={{ color, fontSize: 11, marginLeft: 4 }}>
			{hasRead ? '✓✓' : '✓✓'}
		</span>
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
		fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
	},
	header: {
		display: 'flex',
		alignItems: 'center',
		gap: 10,
		padding: '12px 16px',
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
	headerInfo: {
		display: 'flex',
		alignItems: 'center',
		gap: 10,
		flex: 1
	},
	headerAvatar: {
		width: 38,
		height: 38,
		borderRadius: '50%',
		background: '#222',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		fontSize: 16,
		fontWeight: 600,
		flexShrink: 0
	},
	headerName: { fontSize: 15, fontWeight: 600, lineHeight: 1.2 },
	headerStatus: { fontSize: 12, color: '#3fc060', marginTop: 1 },
	headerActions: { display: 'flex', gap: 4 },
	iconBtn: {
		background: 'none',
		border: 'none',
		color: '#fff',
		cursor: 'pointer',
		padding: 8,
		borderRadius: 20,
		display: 'flex',
		alignItems: 'center'
	},
	messageList: {
		flex: 1,
		overflowY: 'auto',
		padding: '12px 16px',
		display: 'flex',
		flexDirection: 'column',
		gap: 6
	},
	msgWrapper: {
		display: 'flex',
		width: '100%'
	},
	bubble: {
		padding: '9px 13px',
		wordBreak: 'break-word'
	},
	replyRef: {
		display: 'flex',
		alignItems: 'center',
		gap: 6,
		marginBottom: 5,
		opacity: 0.65
	},
	replyRefBar: {
		width: 3,
		height: 30,
		background: '#fff',
		borderRadius: 2,
		flexShrink: 0
	},
	replyRefText: { fontSize: 12, fontStyle: 'italic' },
	msgText: { fontSize: 15, lineHeight: 1.4 },
	deletedText: { fontSize: 14, fontStyle: 'italic', color: '#888' },
	msgMeta: {
		display: 'flex',
		alignItems: 'center',
		gap: 4,
		marginTop: 4,
		justifyContent: 'flex-end'
	},
	msgTime: { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
	edited: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
	replyBanner: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: '8px 16px',
		background: '#111',
		borderTop: '1px solid #1a1a1a',
		flexShrink: 0
	},
	replyBannerInner: { display: 'flex', flexDirection: 'column', gap: 2 },
	replyLabel: { fontSize: 11, color: '#0095f6', fontWeight: 600 },
	replyPreview: {
		fontSize: 13,
		color: '#888',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		maxWidth: 260
	},
	replyClose: {
		background: 'none',
		border: 'none',
		color: '#888',
		cursor: 'pointer',
		fontSize: 16,
		padding: 4
	},
	inputBar: {
		display: 'flex',
		alignItems: 'flex-end',
		gap: 10,
		padding: '10px 16px',
		borderTop: '1px solid #1a1a1a',
		flexShrink: 0
	},
	input: {
		flex: 1,
		background: '#1c1c1e',
		border: 'none',
		borderRadius: 22,
		padding: '10px 16px',
		color: '#fff',
		fontSize: 15,
		resize: 'none',
		outline: 'none',
		lineHeight: 1.4,
		maxHeight: 120,
		overflowY: 'auto',
		fontFamily: 'inherit'
	},
	sendBtn: {
		background: '#0095f6',
		border: 'none',
		borderRadius: '50%',
		width: 40,
		height: 40,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		color: '#fff',
		cursor: 'pointer',
		flexShrink: 0,
		transition: 'opacity 0.2s'
	}
};
