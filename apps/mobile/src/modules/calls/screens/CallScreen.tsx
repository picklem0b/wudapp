import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCallsStore } from '../store/calls.store';
import { useCallState } from '../hooks/useCallState';
import { useWebRTC } from '../hooks/useWebRTC';
import { useSocketContext } from '../../../app/providers/SocketProvider';

export function CallScreen() {
	const { callId } = useParams<{ callId: string }>();
	const navigate = useNavigate();
	const { socket } = useSocketContext();
	const { activeCall, incomingCall, outgoingCall, phase, clearAll } =
		useCallsStore();
	const { controls, toggleAudio, toggleVideo, toggleSpeaker } =
		useCallState();
	const { endCall } = useWebRTC();

	const localVideoRef = useRef<HTMLVideoElement>(null);
	const remoteVideoRef = useRef<HTMLVideoElement>(null);
	const [duration, setDuration] = useState(0);
	const [remoteStreams, setRemoteStreams] = useState<
		Map<string, MediaStream>
	>(new Map());

	const call = activeCall ?? incomingCall ?? outgoingCall;
	const isVideo = call?.type === 'video';

	useEffect(() => {
		if (phase !== 'active') return;
		const t = setInterval(() => setDuration(d => d + 1), 1000);
		return () => clearInterval(t);
	}, [phase]);

	useEffect(() => {
		if (phase !== 'active' && phase !== 'outgoing') return;
		navigator.mediaDevices
			.getUserMedia({ audio: true, video: isVideo })
			.then(stream => {
				if (localVideoRef.current)
					localVideoRef.current.srcObject = stream;
			})
			.catch(() => {});
	}, [phase, isVideo]);

	useEffect(() => {
		const handler = (e: Event) => {
			const { peerId, stream } = (e as CustomEvent).detail;
			setRemoteStreams(prev => new Map(prev).set(peerId, stream));
			if (remoteVideoRef.current)
				remoteVideoRef.current.srcObject = stream;
		};
		window.addEventListener('webrtc:remote-stream', handler);
		return () =>
			window.removeEventListener('webrtc:remote-stream', handler);
	}, []);

	const handleEnd = () => {
		const id = callId !== 'outgoing' ? callId : call?.id;
		if (id) socket?.emit('call:end', { callId: id });
		endCall();
		clearAll();
		navigate('/');
	};

	const handleAccept = () => {
		if (!callId || callId === 'outgoing') return;
		socket?.emit('call:accept', { callId });
	};

	const handleDecline = () => {
		const id = callId !== 'outgoing' ? callId : call?.id;
		if (id) socket?.emit('call:decline', { callId: id });
		clearAll();
		navigate('/');
	};

	const fmt = (s: number) =>
		`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

	const statusLabel =
		phase === 'outgoing'
			? 'Calling…'
			: phase === 'incoming'
				? 'Incoming call'
				: remoteStreams.size > 0
					? fmt(duration)
					: 'Connecting…';

	return (
		<div className='flex flex-col h-dvh bg-black text-white relative overflow-hidden'>
			{/* ── Remote video or voice backdrop ── */}
			{isVideo && phase === 'active' ? (
				<video
					ref={remoteVideoRef}
					autoPlay
					playsInline
					className='flex-1 object-cover bg-ios-bg2'
				/>
			) : (
				<div className='flex-1 flex flex-col items-center justify-center gap-4 relative'>
					{(phase === 'outgoing' || phase === 'incoming') && (
						<>
							<div className='absolute w-36 h-36 rounded-full border border-ios-blue/20 animate-pulse-ring' />
							<div
								className='absolute w-44 h-44 rounded-full border border-ios-blue/10 animate-pulse-ring'
								style={{ animationDelay: '0.4s' }}
							/>
						</>
					)}
					<div className='w-24 h-24 rounded-full bg-ios-bg2 flex items-center justify-center text-4xl font-bold z-10'>
						{call?.initiatedBy?.charAt(0).toUpperCase() ?? '?'}
					</div>
					<div className='text-xl font-semibold z-10'>
						{call?.initiatedBy ?? 'Unknown'}
					</div>
					<div className='text-[14px] text-ios-gray z-10'>
						{statusLabel}
					</div>
				</div>
			)}

			{/* ── Local PiP ── */}
			{isVideo && (
				<video
					ref={localVideoRef}
					autoPlay
					playsInline
					muted
					className='absolute top-14 right-4 w-24 h-36 rounded-ios-lg object-cover bg-ios-bg3 border border-ios-separator z-10'
				/>
			)}

			{/* ── Incoming ── */}
			{phase === 'incoming' && (
				<div className='flex justify-around items-center px-10 pb-16 pt-6 flex-shrink-0'>
					<CallActionBtn
						color='bg-ios-red'
						label='Decline'
						onClick={handleDecline}
					>
						<PhoneDown />
					</CallActionBtn>
					<CallActionBtn
						color='bg-ios-green'
						label='Accept'
						onClick={handleAccept}
					>
						<PhoneUp />
					</CallActionBtn>
				</div>
			)}

			{/* ── Outgoing ── */}
			{phase === 'outgoing' && (
				<div className='flex flex-col items-center gap-3 pb-16 pt-6 flex-shrink-0'>
					<CallActionBtn
						color='bg-ios-red'
						label='Cancel'
						onClick={handleEnd}
					>
						<PhoneDown />
					</CallActionBtn>
				</div>
			)}

			{/* ── Active controls ── */}
			{phase === 'active' && (
				<div className='flex items-center justify-center gap-5 px-6 pb-16 pt-6 flex-shrink-0'>
					{isVideo && (
						<CtrlBtn
							active={!controls.videoMuted}
							label={controls.videoMuted ? 'Cam off' : 'Cam on'}
							onClick={toggleVideo}
						>
							<CamIcon muted={controls.videoMuted} />
						</CtrlBtn>
					)}
					<CtrlBtn
						active={!controls.audioMuted}
						label={controls.audioMuted ? 'Unmute' : 'Mute'}
						onClick={toggleAudio}
					>
						<MicIcon muted={controls.audioMuted} />
					</CtrlBtn>
					<CtrlBtn
						active={controls.speakerOn}
						label={controls.speakerOn ? 'Speaker' : 'Earpiece'}
						onClick={toggleSpeaker}
					>
						<SpeakerIcon on={controls.speakerOn} />
					</CtrlBtn>
					<button
						className='press-scale w-16 h-16 rounded-full bg-ios-red flex items-center justify-center'
						onClick={handleEnd}
					>
						<PhoneDown />
					</button>
				</div>
			)}
		</div>
	);
}

function CallActionBtn({
	color,
	label,
	onClick,
	children
}: {
	color: string;
	label: string;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className='flex flex-col items-center gap-2'>
			<button
				className={`press-scale w-[70px] h-[70px] rounded-full ${color} flex items-center justify-center`}
				onClick={onClick}
			>
				{children}
			</button>
			<span className='text-[13px] text-ios-label2'>{label}</span>
		</div>
	);
}

function CtrlBtn({
	active,
	label,
	onClick,
	children
}: {
	active: boolean;
	label: string;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className='flex flex-col items-center gap-1.5'>
			<button
				className={`press-scale w-14 h-14 rounded-full flex items-center justify-center ${active ? 'bg-ios-bg3' : 'bg-ios-bg2'}`}
				onClick={onClick}
			>
				{children}
			</button>
			<span className='text-[11px] text-ios-gray'>{label}</span>
		</div>
	);
}

function PhoneDown() {
	return (
		<svg width='26' height='26' viewBox='0 0 24 24' fill='white'>
			<path d='M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 012 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.07 9.81a2 2 0 012-2.18H8a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11l-1.27 1.27z' />
			<line
				x1='23'
				y1='1'
				x2='1'
				y2='23'
				stroke='white'
				strokeWidth='2'
				strokeLinecap='round'
			/>
		</svg>
	);
}
function PhoneUp() {
	return (
		<svg width='26' height='26' viewBox='0 0 24 24' fill='white'>
			<path d='M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z' />
		</svg>
	);
}
function MicIcon({ muted }: { muted: boolean }) {
	return (
		<svg
			width='22'
			height='22'
			viewBox='0 0 24 24'
			fill='none'
			stroke='white'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
		>
			{muted ? (
				<>
					<path d='M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6' />
					<path d='M17 16.95A7 7 0 015 12v-2' />
					<line x1='1' y1='1' x2='23' y2='23' />
				</>
			) : (
				<>
					<path d='M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z' />
					<path d='M19 10v2a7 7 0 01-14 0v-2' />
					<line x1='12' y1='19' x2='12' y2='23' />
				</>
			)}
		</svg>
	);
}
function CamIcon({ muted }: { muted: boolean }) {
	return (
		<svg
			width='22'
			height='22'
			viewBox='0 0 24 24'
			fill='none'
			stroke='white'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
		>
			{muted ? (
				<>
					<line x1='1' y1='1' x2='23' y2='23' />
					<path d='M21 21H3a2 2 0 01-2-2V8' />
					<path d='M16 16V8a2 2 0 00-2-2H4' />
					<polygon points='23 7 16 12 23 17 23 7' />
				</>
			) : (
				<>
					<polygon points='23 7 16 12 23 17 23 7' />
					<rect x='1' y='5' width='15' height='14' rx='2' ry='2' />
				</>
			)}
		</svg>
	);
}
function SpeakerIcon({ on }: { on: boolean }) {
	return (
		<svg
			width='22'
			height='22'
			viewBox='0 0 24 24'
			fill='none'
			stroke='white'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
		>
			<polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5' />
			{on && (
				<path d='M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07' />
			)}
		</svg>
	);
}
