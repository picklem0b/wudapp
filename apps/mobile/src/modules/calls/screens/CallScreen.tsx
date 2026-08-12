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

	// ── Timer (only when active) ───────────────────────────────────────────────
	useEffect(() => {
		if (phase !== 'active') return;
		const t = setInterval(() => setDuration(d => d + 1), 1000);
		return () => clearInterval(t);
	}, [phase]);

	// ── Local stream ───────────────────────────────────────────────────────────
	useEffect(() => {
		if (phase !== 'active' && phase !== 'outgoing') return;
		(async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
					video: isVideo
				});
				if (localVideoRef.current)
					localVideoRef.current.srcObject = stream;
			} catch {
				/* no mic/cam in dev */
			}
		})();
	}, [phase, isVideo]);

	// ── Remote stream ──────────────────────────────────────────────────────────
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

	const formatDur = (s: number) =>
		`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

	const callerLabel =
		phase === 'outgoing'
			? 'Calling…'
			: phase === 'incoming'
				? 'Incoming call'
				: remoteStreams.size > 0
					? formatDur(duration)
					: 'Connecting…';

	return (
		<div style={styles.root}>
			{/* ── Remote video / voice background ── */}
			{isVideo && phase === 'active' ? (
				<video
					ref={remoteVideoRef}
					autoPlay
					playsInline
					style={styles.remoteVideo}
				/>
			) : (
				<div style={styles.backdrop}>
					{/* Pulsing ring on outgoing/incoming */}
					{(phase === 'outgoing' || phase === 'incoming') && (
						<div style={styles.pulseRing} />
					)}
					<div style={styles.voiceAvatar}>
						{call?.initiatedBy?.charAt(0).toUpperCase() ?? '?'}
					</div>
					<div style={styles.callerName}>
						{call?.initiatedBy ?? 'Unknown'}
					</div>
					<div style={styles.callerStatus}>{callerLabel}</div>
				</div>
			)}

			{/* ── Local video PiP ── */}
			{isVideo && (
				<video
					ref={localVideoRef}
					autoPlay
					playsInline
					muted
					style={styles.localVideo}
				/>
			)}

			{/* ── Incoming — accept / decline ── */}
			{phase === 'incoming' && (
				<div style={styles.incomingControls}>
					<div style={styles.incomingRow}>
						<div style={styles.incomingAction}>
							<button
								style={styles.declineBtn}
								onClick={handleDecline}
							>
								<PhoneDown />
							</button>
							<span style={styles.actionLabel}>Decline</span>
						</div>
						<div style={styles.incomingAction}>
							<button
								style={styles.acceptBtn}
								onClick={handleAccept}
							>
								<PhoneIcon />
							</button>
							<span style={styles.actionLabel}>Accept</span>
						</div>
					</div>
				</div>
			)}

			{/* ── Outgoing — cancel ── */}
			{phase === 'outgoing' && (
				<div style={styles.outgoingControls}>
					<button style={styles.cancelBtn} onClick={handleEnd}>
						<PhoneDown />
					</button>
					<span style={styles.actionLabel}>Cancel</span>
				</div>
			)}

			{/* ── Active — full controls ── */}
			{phase === 'active' && (
				<div style={styles.controls}>
					{isVideo && (
						<ControlBtn
							label={controls.videoMuted ? 'Cam off' : 'Cam on'}
							active={!controls.videoMuted}
							onClick={toggleVideo}
							icon={<VideoIcon muted={controls.videoMuted} />}
						/>
					)}
					<ControlBtn
						label={controls.audioMuted ? 'Unmute' : 'Mute'}
						active={!controls.audioMuted}
						onClick={toggleAudio}
						icon={<MicIcon muted={controls.audioMuted} />}
					/>
					<ControlBtn
						label={controls.speakerOn ? 'Speaker' : 'Earpiece'}
						active={controls.speakerOn}
						onClick={toggleSpeaker}
						icon={<SpeakerIcon on={controls.speakerOn} />}
					/>
					<button style={styles.endBtn} onClick={handleEnd}>
						<PhoneDown />
					</button>
				</div>
			)}
		</div>
	);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ControlBtn({
	icon,
	label,
	active,
	onClick
}: {
	icon: React.ReactNode;
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			style={{
				...styles.ctrlBtn,
				background: active ? '#2a2a2a' : '#1c1c1e'
			}}
			onClick={onClick}
		>
			{icon}
			<span style={styles.ctrlLabel}>{label}</span>
		</button>
	);
}

function PhoneIcon() {
	return (
		<svg width='26' height='26' viewBox='0 0 24 24' fill='currentColor'>
			<path d='M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z' />
		</svg>
	);
}
function PhoneDown() {
	return (
		<svg width='26' height='26' viewBox='0 0 24 24' fill='currentColor'>
			<path d='M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 012 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.07 9.81a2 2 0 012-2.18H8a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11l-1.27 1.27z' />
			<line
				x1='23'
				y1='1'
				x2='1'
				y2='23'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
			/>
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
			stroke='currentColor'
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
function VideoIcon({ muted }: { muted: boolean }) {
	return (
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
			stroke='currentColor'
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

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
	root: {
		display: 'flex',
		flexDirection: 'column',
		height: '100dvh',
		background: '#0a0a0a',
		color: '#fff',
		fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
		position: 'relative'
	},
	remoteVideo: { flex: 1, objectFit: 'cover', background: '#111' },
	backdrop: {
		flex: 1,
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 14,
		position: 'relative'
	},
	pulseRing: {
		position: 'absolute',
		width: 140,
		height: 140,
		borderRadius: '50%',
		border: '2px solid rgba(0,149,246,0.3)',
		animation: 'pulse 1.8s ease-out infinite'
	},
	voiceAvatar: {
		width: 100,
		height: 100,
		borderRadius: '50%',
		background: '#1c1c1e',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		fontSize: 42,
		fontWeight: 700,
		zIndex: 1
	},
	callerName: { fontSize: 24, fontWeight: 700, zIndex: 1 },
	callerStatus: { fontSize: 15, color: '#888', zIndex: 1 },
	localVideo: {
		position: 'absolute',
		top: 20,
		right: 16,
		width: 100,
		height: 140,
		borderRadius: 16,
		objectFit: 'cover',
		background: '#222',
		border: '2px solid #333',
		zIndex: 10
	},
	incomingControls: {
		padding: '28px 20px 44px',
		flexShrink: 0
	},
	incomingRow: {
		display: 'flex',
		justifyContent: 'space-around',
		alignItems: 'center'
	},
	incomingAction: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: 10
	},
	declineBtn: {
		background: '#ff3b30',
		border: 'none',
		borderRadius: '50%',
		width: 70,
		height: 70,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		color: '#fff',
		cursor: 'pointer'
	},
	acceptBtn: {
		background: '#34c759',
		border: 'none',
		borderRadius: '50%',
		width: 70,
		height: 70,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		color: '#fff',
		cursor: 'pointer'
	},
	outgoingControls: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: 10,
		padding: '28px 20px 44px',
		flexShrink: 0
	},
	cancelBtn: {
		background: '#ff3b30',
		border: 'none',
		borderRadius: '50%',
		width: 70,
		height: 70,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		color: '#fff',
		cursor: 'pointer'
	},
	actionLabel: { fontSize: 13, color: '#aaa' },
	controls: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 14,
		padding: '24px 20px 40px',
		flexShrink: 0
	},
	ctrlBtn: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: 6,
		border: 'none',
		borderRadius: 18,
		padding: '14px 16px',
		color: '#fff',
		cursor: 'pointer',
		minWidth: 60
	},
	ctrlLabel: { fontSize: 11, color: '#aaa' },
	endBtn: {
		background: '#ff3b30',
		border: 'none',
		borderRadius: '50%',
		width: 64,
		height: 64,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		color: '#fff',
		cursor: 'pointer'
	}
};
