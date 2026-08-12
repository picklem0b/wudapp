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
	const activeCall = useCallsStore(s => s.activeCall);
	const { controls, toggleAudio, toggleVideo, toggleSpeaker } =
		useCallState();
	const { startCall, endCall } = useWebRTC();

	const localVideoRef = useRef<HTMLVideoElement>(null);
	const remoteVideoRef = useRef<HTMLVideoElement>(null);
	const [duration, setDuration] = useState(0);
	const [remoteStreams, setRemoteStreams] = useState<
		Map<string, MediaStream>
	>(new Map());

	const isVideo = activeCall?.type === 'video';

	// ── Timer ──────────────────────────────────────────────────────────────────
	useEffect(() => {
		const t = setInterval(() => setDuration(d => d + 1), 1000);
		return () => clearInterval(t);
	}, []);

	// ── Local stream → video element ──────────────────────────────────────────
	useEffect(() => {
		if (!callId) return;
		(async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
					video: isVideo
				});
				if (localVideoRef.current) {
					localVideoRef.current.srcObject = stream;
				}
			} catch {
				// mic/cam not available in dev — expected
			}
		})();
	}, [callId, isVideo]);

	// ── Remote stream events ───────────────────────────────────────────────────
	useEffect(() => {
		const handler = (e: Event) => {
			const { peerId, stream } = (e as CustomEvent).detail;
			setRemoteStreams(prev => new Map(prev).set(peerId, stream));
			if (remoteVideoRef.current && !isVideo) {
				remoteVideoRef.current.srcObject = stream;
			}
		};
		window.addEventListener('webrtc:remote-stream', handler);
		return () =>
			window.removeEventListener('webrtc:remote-stream', handler);
	}, [isVideo]);

	const handleEnd = () => {
		if (callId) socket?.emit('call:end', { callId });
		endCall();
		navigate(-1);
	};

	const formatDur = (s: number) =>
		`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

	return (
		<div style={styles.root}>
			{/* ── Remote video / voice placeholder ── */}
			{isVideo ? (
				<video
					ref={remoteVideoRef}
					autoPlay
					playsInline
					style={styles.remoteVideo}
				/>
			) : (
				<div style={styles.voicePlaceholder}>
					<div style={styles.voiceAvatar}>
						{activeCall?.initiatedBy?.charAt(0).toUpperCase() ??
							'?'}
					</div>
					<div style={styles.callerName}>
						{remoteStreams.size > 0 ? 'Connected' : 'Calling…'}
					</div>
					<div style={styles.callTimer}>{formatDur(duration)}</div>
				</div>
			)}

			{/* ── Local video PiP (video calls only) ── */}
			{isVideo && (
				<video
					ref={localVideoRef}
					autoPlay
					playsInline
					muted
					style={styles.localVideo}
				/>
			)}

			{/* ── Controls ── */}
			<div style={styles.controls}>
				{isVideo && (
					<ControlBtn
						label={controls.videoMuted ? 'Cam off' : 'Cam on'}
						active={!controls.videoMuted}
						onClick={toggleVideo}
						icon={
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
								{controls.videoMuted ? (
									<>
										<line x1='1' y1='1' x2='23' y2='23' />
										<path d='M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6l2 3h4a2 2 0 012 2v9.34' />
										<path d='M16 11.37A4 4 0 1112.63 8L16 11.37zM8 8v.01' />
									</>
								) : (
									<>
										<polygon points='23 7 16 12 23 17 23 7' />
										<rect
											x='1'
											y='5'
											width='15'
											height='14'
											rx='2'
											ry='2'
										/>
									</>
								)}
							</svg>
						}
					/>
				)}

				<ControlBtn
					label={controls.audioMuted ? 'Unmute' : 'Mute'}
					active={!controls.audioMuted}
					onClick={toggleAudio}
					icon={
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
							{controls.audioMuted ? (
								<>
									<line x1='1' y1='1' x2='23' y2='23' />
									<path d='M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6' />
									<path d='M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23' />
									<line x1='12' y1='19' x2='12' y2='23' />
									<line x1='8' y1='23' x2='16' y2='23' />
								</>
							) : (
								<>
									<path d='M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z' />
									<path d='M19 10v2a7 7 0 01-14 0v-2' />
									<line x1='12' y1='19' x2='12' y2='23' />
									<line x1='8' y1='23' x2='16' y2='23' />
								</>
							)}
						</svg>
					}
				/>

				<ControlBtn
					label={controls.speakerOn ? 'Speaker' : 'Earpiece'}
					active={controls.speakerOn}
					onClick={toggleSpeaker}
					icon={
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
							{controls.speakerOn && (
								<path d='M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07' />
							)}
						</svg>
					}
				/>

				{/* End call */}
				<button style={styles.endBtn} onClick={handleEnd}>
					<svg
						width='28'
						height='28'
						viewBox='0 0 24 24'
						fill='currentColor'
					>
						<path d='M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z' />
						<line
							x1='1'
							y1='1'
							x2='23'
							y2='23'
							stroke='#fff'
							strokeWidth='2'
							strokeLinecap='round'
						/>
					</svg>
				</button>
			</div>
		</div>
	);
}

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
				background: active ? '#2a2a2a' : '#444'
			}}
			onClick={onClick}
		>
			{icon}
			<span style={styles.ctrlLabel}>{label}</span>
		</button>
	);
}

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
	remoteVideo: {
		flex: 1,
		objectFit: 'cover',
		background: '#111'
	},
	voicePlaceholder: {
		flex: 1,
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 16
	},
	voiceAvatar: {
		width: 96,
		height: 96,
		borderRadius: '50%',
		background: '#1c1c1e',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		fontSize: 40,
		fontWeight: 700
	},
	callerName: { fontSize: 22, fontWeight: 600 },
	callTimer: { fontSize: 16, color: '#888' },
	localVideo: {
		position: 'absolute',
		top: 20,
		right: 16,
		width: 100,
		height: 140,
		borderRadius: 16,
		objectFit: 'cover',
		background: '#222',
		border: '2px solid #333'
	},
	controls: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 16,
		padding: '24px 20px',
		flexShrink: 0
	},
	ctrlBtn: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: 6,
		border: 'none',
		borderRadius: 20,
		padding: '14px 18px',
		color: '#fff',
		cursor: 'pointer',
		minWidth: 64
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
