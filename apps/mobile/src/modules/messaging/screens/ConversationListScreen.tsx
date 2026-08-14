import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../infrastructure/api.client';
import { useMessagingStore } from '../store/messaging.store';
import { useAuthStore } from '../../auth/store/auth.store';
import { useCallSignaling } from '../../calls/hooks/useCallSignaling';
import type { Conversation } from '@wudapp/types';
import { formatMessageTime } from '../../../shared/utils/date';

interface NetworkUser {
	id: string;
	username: string;
	displayName: string;
	avatarPath: string | null;
	status: 'online' | 'offline' | 'away';
	lastSeen: string;
	createdAt: string;
}

// ── Test User bot — hard-coded messages ───────────────────────────────────────
/* const TEST_BOT_RESPONSES = [
    "Hey! I'm Test User 👋 Send me anything.",
	 "Got it! I'm just a bot for now but I'll be smarter soon.",
	'Interesting... let me think about that 🤔',
	'Nice one. Try sending a voice note!',
	"I'm always online. Always watching. Just kidding 😅"
];
*/
export function ConversationListScreen() {
	const navigate = useNavigate();
	const currentUser = useAuthStore(s => s.user);
	const { setConversations } = useMessagingStore();
	const [removedUsers, setRemovedUsers] = useState<Set<string>>(new Set());

	useCallSignaling();

	// ── Recent conversations ───────────────────────────────────────────────────
	const { data: convList = [] } = useQuery<Conversation[]>({
		queryKey: ['conversations'],
		queryFn: async () => {
			const res =
				await apiClient.get<Conversation[]>('/api/conversations');
			const list = Array.isArray(res.data) ? res.data : [];
			setConversations(list);
			return list;
		}
	});

	// ── All users on the network ───────────────────────────────────────────────
	const { data: networkUsers = [] } = useQuery<NetworkUser[]>({
		queryKey: ['network-users'],
		queryFn: async () => {
			const res = await apiClient.get<NetworkUser[]>('/api/users');
			return res.data.filter(u => u.id !== currentUser?.id);
		},
		refetchInterval: 15_000
	});

	const suggestedUsers = networkUsers.filter(u => !removedUsers.has(u.id));
	const hasRecent = convList.length > 0;

	const handleInvite = (user: NetworkUser) => {
		apiClient
			.post<{ id: string }>('/api/conversations', {
				type: 'dm',
				memberIds: [user.id]
			})
			.then(res => navigate(`/chat/${res.data.id}`))
			.catch(() => {});
	};

	const handleRemove = (userId: string) => {
		setRemovedUsers(prev => new Set(prev).add(userId));
	};

	const formatLastSeen = (user: NetworkUser): string => {
		if (user.status === 'online') return 'online';
		const diff = Date.now() - new Date(user.lastSeen).getTime();
		const hrs = diff / 3_600_000;
		if (hrs > 24) return 'offline';
		if (hrs >= 1) return `last seen ${Math.floor(hrs)}h ago`;
		const mins = Math.floor(diff / 60_000);
		return mins < 1 ? 'just now' : `last seen ${mins}m ago`;
	};

	return (
		<div className='flex flex-col h-dvh bg-ios-bg text-ios-label overflow-hidden'>
			{/* ── Header ── */}
			<div className='safe-top' />
			<div className='flex items-center justify-between px-5 py-3 border-b border-ios-separator'>
				<h1 className='text-2xl font-bold tracking-tight'>Wudapp</h1>
				<button
					className='press-scale flex items-center justify-center w-9 h-9 rounded-full bg-ios-bg3 text-ios-blue'
					onClick={() => navigate('/call-history')}
				>
					<ClockIcon />
				</button>
			</div>

			<div className='flex-1 overflow-y-auto'>
				{/* ── Recent chats ── */}
				{hasRecent && (
					<section>
						<SectionHeader title='Recent' />
						{convList.map(conv => {
							const other = conv.members?.find(
								m => m.userId !== currentUser?.id
							);
							const name =
								conv.name ??
								other?.user?.displayName ??
								'Unknown';
							const last = conv.lastMessage;
							return (
								<ConvRow
									key={conv.id}
									name={name}
									sub={
										last
											? last.type === 'text'
												? (last.content ?? '')
												: `📎 ${last.type}`
											: 'No messages yet'
									}
									time={
										last
											? formatMessageTime(last.createdAt)
											: ''
									}
									unread={conv.unreadCount ?? 0}
									status='online'
									onClick={() => navigate(`/chat/${conv.id}`)}
								/>
							);
						})}
					</section>
				)}

				{/* ── Suggested / network users ── */}
				<section>
					<SectionHeader title='Suggested' />

					{suggestedUsers.length === 0 && (
						<div className='px-5 py-10 text-center text-ios-gray text-sm'>
							No other users on the network
						</div>
					)}

					{suggestedUsers.map(user => (
						<SuggestedRow
							key={user.id}
							user={user}
							lastSeenLabel={formatLastSeen(user)}
							onInvite={() => handleInvite(user)}
							onRemove={() => handleRemove(user.id)}
						/>
					))}
				</section>
			</div>
		</div>
	);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
	return (
		<div className='px-5 pt-6 pb-2'>
			<span className='text-xs font-semibold text-ios-gray tracking-widest uppercase'>
				{title}
			</span>
		</div>
	);
}

function ConvRow({
	name,
	sub,
	time,
	unread,
	status,
	onClick
}: {
	name: string;
	sub: string;
	time: string;
	unread: number;
	status: string;
	onClick: () => void;
}) {
	return (
		<button
			className='press-scale flex items-center gap-3 w-full px-5 py-3 text-left hover:bg-ios-bg2/50 transition-colors'
			onClick={onClick}
		>
			<Avatar name={name} status={status} size='md' />
			<div className='flex-1 min-w-0'>
				<div className='flex items-baseline justify-between'>
					<span className='text-[15px] font-semibold truncate'>
						{name}
					</span>
					<span className='text-xs text-ios-gray ml-2 flex-shrink-0'>
						{time}
					</span>
				</div>
				<div className='flex items-center justify-between mt-0.5'>
					<span className='text-[13px] text-ios-label2 truncate flex-1'>
						{sub}
					</span>
					{unread > 0 && (
						<span className='ml-2 flex-shrink-0 bg-ios-blue text-white text-[11px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center'>
							{unread > 99 ? '99+' : unread}
						</span>
					)}
				</div>
			</div>
		</button>
	);
}

function SuggestedRow({
	user,
	lastSeenLabel,
	onInvite,
	onRemove
}: {
	user: NetworkUser;
	lastSeenLabel: string;
	onInvite: () => void;
	onRemove: () => void;
}) {
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<div className='flex items-center gap-3 px-5 py-3 animate-fade-in'>
			<Avatar name={user.displayName} status={user.status} size='md' />

			<div className='flex-1 min-w-0'>
				<div className='text-[15px] font-semibold truncate'>
					{user.displayName}
				</div>
				<div
					className={`text-[12px] mt-0.5 ${
						user.status === 'online'
							? 'text-ios-green'
							: lastSeenLabel === 'offline'
								? 'text-ios-gray'
								: 'text-ios-label3'
					}`}
				>
					{lastSeenLabel}
				</div>
			</div>

			{/* Actions */}
			<div className='flex items-center gap-2 flex-shrink-0'>
				<button
					className='press-scale text-[13px] font-semibold text-ios-blue bg-ios-blue/10 px-3 py-1.5 rounded-ios'
					onClick={onInvite}
				>
					Invite
				</button>
				<button
					className='press-scale text-[13px] font-medium text-ios-gray bg-ios-bg3 px-3 py-1.5 rounded-ios'
					onClick={onRemove}
				>
					Remove
				</button>
				<div className='relative'>
					<button
						className='press-scale flex items-center justify-center w-8 h-8 rounded-full bg-ios-bg3 text-ios-gray'
						onClick={() => setMenuOpen(v => !v)}
					>
						<DotsIcon />
					</button>
					{menuOpen && (
						<UserContextMenu
							user={user}
							onClose={() => setMenuOpen(false)}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function UserContextMenu({
	user,
	onClose
}: {
	user: NetworkUser;
	onClose: () => void;
}) {
	useEffect(() => {
		const handler = () => onClose();
		document.addEventListener('click', handler);
		return () => document.removeEventListener('click', handler);
	}, [onClose]);

	const joined = new Date(user.createdAt).toLocaleDateString('en-ZA', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	return (
		<div
			className='absolute right-0 bottom-10 z-50 w-52 bg-ios-bg2 border border-ios-separator rounded-ios-lg shadow-xl animate-fade-in overflow-hidden'
			onClick={e => e.stopPropagation()}
		>
			<MenuItem label='View Profile' icon='👤' onClick={onClose} />
			<MenuItem label='Block' icon='🚫' onClick={onClose} destructive />
			<div className='px-4 py-2.5 border-t border-ios-separator'>
				<p className='text-[11px] text-ios-gray leading-relaxed'>
					Joined {joined}
				</p>
			</div>
		</div>
	);
}

function MenuItem({
	label,
	icon,
	onClick,
	destructive
}: {
	label: string;
	icon: string;
	onClick: () => void;
	destructive?: boolean;
}) {
	return (
		<button
			className={`press-scale flex items-center gap-3 w-full px-4 py-3 text-[14px] font-medium text-left border-b border-ios-separator last:border-0 ${
				destructive ? 'text-ios-red' : 'text-ios-label'
			}`}
			onClick={onClick}
		>
			<span>{icon}</span>
			<span>{label}</span>
		</button>
	);
}

function Avatar({
	name,
	status,
	size
}: {
	name: string;
	status: string;
	size: 'sm' | 'md' | 'lg';
}) {
	const sz =
		size === 'lg'
			? 'w-14 h-14 text-xl'
			: size === 'md'
				? 'w-12 h-12 text-lg'
				: 'w-9 h-9 text-sm';
	const dot = size === 'lg' ? 'w-3.5 h-3.5 border-2' : 'w-2.5 h-2.5 border-2';
	const dotColor = status === 'online' ? 'bg-ios-green' : 'bg-ios-gray3';
	return (
		<div
			className={`relative flex-shrink-0 ${sz} rounded-full bg-ios-bg3 flex items-center justify-center font-semibold`}
		>
			{name.charAt(0).toUpperCase()}
			<span
				className={`absolute bottom-0 right-0 ${dot} ${dotColor} rounded-full border-ios-bg`}
			/>
		</div>
	);
}

function ClockIcon() {
	return (
		<svg
			width='18'
			height='18'
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
		>
			<circle cx='12' cy='12' r='10' />
			<polyline points='12 6 12 12 16 14' />
		</svg>
	);
}
function DotsIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
			<circle cx='12' cy='5' r='1.5' />
			<circle cx='12' cy='12' r='1.5' />
			<circle cx='12' cy='19' r='1.5' />
		</svg>
	);
}
