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
import { formatMessageTime } from '../../../shared/utils/date';

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

	useMessages(conversationId!);
	const { onType } = useTyping(conversationId!);
	useCallSignaling();

	const { data: conv } = useQuery<Conversation>({
		queryKey: ['conversation', conversationId],
		queryFn: async () =>
			(
				await apiClient.get<Conversation>(
					`/api/conversations/${conversationId}`
				)
			).data
	});

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages.length]);

	useEffect(() => {
		if (!socket || !messages.length) return;
		const last = messages[messages.length - 1];
		if (last && last.senderId !== currentUser?.id) {
			socket.emit('message:read', { messageId: last.id });
		}
	}, [messages, socket, currentUser]);

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

	const other = conv?.members?.find(m => m.userId !== currentUser?.id);
	const otherName = conv?.name ?? other?.user?.displayName ?? 'Chat';
	const isTyping = typingUsers.length > 0;

	return (
		<div className='flex flex-col h-dvh bg-ios-bg text-ios-label'>
			{/* ── Header ── */}
			<div className='safe-top' />
			<div className='flex items-center gap-2 px-4 py-3 border-b border-ios-separator flex-shrink-0'>
				<button
					className='press-scale p-1.5 -ml-1.5 text-ios-blue'
					onClick={() => navigate('/')}
				>
					<ChevronLeft />
				</button>

				<div className='flex items-center gap-2.5 flex-1 min-w-0'>
					<div className='w-9 h-9 rounded-full bg-ios-bg3 flex items-center justify-center text-sm font-semibold flex-shrink-0'>
						{otherName.charAt(0).toUpperCase()}
					</div>
					<div className='min-w-0'>
						<div className='text-[15px] font-semibold truncate'>
							{otherName}
						</div>
						<div
							className={`text-[11px] transition-colors ${isTyping ? 'text-ios-blue' : 'text-ios-green'}`}
						>
							{isTyping ? 'typing…' : 'online'}
						</div>
					</div>
				</div>

				<div className='flex items-center gap-1'>
					<HeaderIconBtn
						onClick={() =>
							socket?.emit('call:initiate', {
								conversationId: conversationId!,
								type: 'voice'
							})
						}
					>
						<PhoneIcon />
					</HeaderIconBtn>
					<HeaderIconBtn
						onClick={() =>
							socket?.emit('call:initiate', {
								conversationId: conversationId!,
								type: 'video'
							})
						}
					>
						<VideoIcon />
					</HeaderIconBtn>
				</div>
			</div>

			{/* ── Messages ── */}
			<div className='flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1'>
				{messages.map((msg, i) => {
					const isOwn = msg.senderId === currentUser?.id;
					const prevMsg = messages[i - 1];
					const showAvatar =
						!isOwn &&
						(!prevMsg || prevMsg.senderId !== msg.senderId);
					return (
						<MessageRow
							key={msg.id}
							msg={msg}
							isOwn={isOwn}
							showAvatar={showAvatar}
							onReply={() => setReplyTo(msg)}
						/>
					);
				})}

				{/* Typing indicator */}
				{isTyping && (
					<div className='flex items-end gap-2 mt-1'>
						<div className='w-7 h-7 rounded-full bg-ios-bg3 flex items-center justify-center text-xs flex-shrink-0'>
							{otherName.charAt(0)}
						</div>
						<div className='bg-ios-bg2 rounded-[18px] rounded-bl-[4px] px-4 py-3'>
							<TypingDots />
						</div>
					</div>
				)}
				<div ref={bottomRef} />
			</div>

			{/* ── Reply banner ── */}
			{replyTo && (
				<div className='flex items-center justify-between px-4 py-2.5 bg-ios-bg2 border-t border-ios-separator flex-shrink-0'>
					<div className='flex items-center gap-2 min-w-0'>
						<div className='w-0.5 h-8 bg-ios-blue rounded-full flex-shrink-0' />
						<div className='min-w-0'>
							<div className='text-[11px] text-ios-blue font-semibold'>
								Replying
							</div>
							<div className='text-[12px] text-ios-label2 truncate'>
								{replyTo.content ?? `[${replyTo.type}]`}
							</div>
						</div>
					</div>
					<button
						className='press-scale ml-2 text-ios-gray p-1'
						onClick={() => setReplyTo(null)}
					>
						<XIcon />
					</button>
				</div>
			)}

			{/* ── Input bar ── */}
			<div className='flex items-end gap-2.5 px-4 py-3 border-t border-ios-separator flex-shrink-0 safe-bottom'>
				<textarea
					className='flex-1 bg-ios-bg2 border border-ios-separator rounded-ios-xl px-4 py-2.5 text-[15px] text-ios-label placeholder:text-ios-gray resize-none outline-none leading-[1.4] max-h-28 overflow-y-auto'
					placeholder='Message…'
					rows={1}
					value={text}
					onChange={e => {
						setText(e.target.value);
						onType();
					}}
					onKeyDown={e => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							handleSend();
						}
					}}
				/>
				<button
					className={`press-scale flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
						text.trim()
							? 'bg-ios-blue text-white'
							: 'bg-ios-bg3 text-ios-gray'
					}`}
					onClick={handleSend}
					disabled={!text.trim() || sendMutation.isPending}
				>
					<SendIcon />
				</button>
			</div>
		</div>
	);
}

// ── MessageRow ────────────────────────────────────────────────────────────────
function MessageRow({
	msg,
	isOwn,
	showAvatar,
	onReply
}: {
	msg: Message;
	isOwn: boolean;
	showAvatar: boolean;
	onReply: () => void;
}) {
	const deleted = !!msg.deletedAt;
	return (
		<div
			className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
			onDoubleClick={onReply}
		>
			{/* Avatar (others only) */}
			{!isOwn && (
				<div
					className={`w-7 h-7 rounded-full bg-ios-bg3 flex items-center justify-center text-xs flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}
				>
					{msg.sender?.displayName?.charAt(0) ?? '?'}
				</div>
			)}

			<div
				className={`max-w-[72%] px-3.5 py-2 ${
					isOwn
						? 'bg-ios-blue rounded-[18px] rounded-br-[4px]'
						: 'bg-ios-bg2 rounded-[18px] rounded-bl-[4px]'
				}`}
			>
				{/* Reply reference */}
				{msg.replyToId && (
					<div className='flex items-center gap-1.5 mb-1.5 opacity-60'>
						<div className='w-0.5 h-6 bg-current rounded-full' />
						<span className='text-[11px] italic'>
							Replied to a message
						</span>
					</div>
				)}

				{deleted ? (
					<span className='text-[14px] italic opacity-50'>
						Message deleted
					</span>
				) : (
					<span className='text-[15px] leading-[1.4] break-words'>
						{msg.content}
					</span>
				)}

				<div
					className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
				>
					<span className='text-[10px] opacity-40'>
						{formatMessageTime(msg.createdAt)}
					</span>
					{msg.editedAt && (
						<span className='text-[10px] opacity-30'>edited</span>
					)}
					{isOwn && <ReadTick msg={msg} />}
				</div>
			</div>
		</div>
	);
}

function ReadTick({ msg }: { msg: Message }) {
	const hasRead = (msg.readBy ?? []).some(r => r.readAt);
	return (
		<span
			className={`text-[11px] ${hasRead ? 'opacity-100' : 'opacity-50'}`}
		>
			{hasRead ? '✓✓' : '✓'}
		</span>
	);
}

function TypingDots() {
	return (
		<div className='flex items-center gap-1'>
			{[0, 1, 2].map(i => (
				<div
					key={i}
					className='w-2 h-2 rounded-full bg-ios-gray'
					style={{
						animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`
					}}
				/>
			))}
		</div>
	);
}

function HeaderIconBtn({
	children,
	onClick
}: {
	children: React.ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			className='press-scale flex items-center justify-center w-9 h-9 rounded-full bg-ios-bg3 text-ios-blue'
			onClick={onClick}
		>
			{children}
		</button>
	);
}

function ChevronLeft() {
	return (
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
	);
}
function PhoneIcon() {
	return (
		<svg
			width='17'
			height='17'
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
		>
			<path d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.14 1.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.11 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z' />
		</svg>
	);
}
function VideoIcon() {
	return (
		<svg
			width='17'
			height='17'
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
		>
			<polygon points='23 7 16 12 23 17 23 7' />
			<rect x='1' y='5' width='15' height='14' rx='2' ry='2' />
		</svg>
	);
}
function SendIcon() {
	return (
		<svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'>
			<path d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' />
		</svg>
	);
}
function XIcon() {
	return (
		<svg
			width='14'
			height='14'
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth='2.5'
			strokeLinecap='round'
		>
			<line x1='18' y1='6' x2='6' y2='18' />
			<line x1='6' y1='6' x2='18' y2='18' />
		</svg>
	);
}
