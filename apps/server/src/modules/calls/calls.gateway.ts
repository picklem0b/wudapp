import type { TypedIO } from '../../infrastructure/socket.server.js';
import { logger } from '../../infrastructure/logger.js';
import { callsService } from './calls.service.js';

export function registerCallsGateway(io: TypedIO): void {
	io.on('connection', socket => {
		const { userId } = socket.data;

		socket.on(
			'call:initiate',
			async ({
				conversationId,
				type
			}: {
				conversationId: string;
				type: 'voice' | 'video';
			}) => {
				logger.info(
					{ userId, conversationId, type },
					'[call] Initiating call'
				);
				const call = await callsService.initiateCall(
					conversationId,
					userId,
					type
				);
				socket.join(`call:${call.id}`);
				socket.to(conversationId).emit('call:incoming', call as any);
				logger.info(
					{ callId: call.id, conversationId, type },
					'[call] Incoming emitted to room'
				);
			}
		);

		socket.on('call:accept', async ({ callId }: { callId: string }) => {
			logger.info({ userId, callId }, '[call] Call accepted');
			await callsService.updateStatus(callId, 'active');
			await callsService.addParticipant(callId, userId);
			socket.join(`call:${callId}`);
			io.to(`call:${callId}`).emit('call:accepted', { callId, userId });
		});

		socket.on('call:decline', async ({ callId }: { callId: string }) => {
			logger.info({ userId, callId }, '[call] Call declined');
			await callsService.updateStatus(callId, 'declined');
			io.to(`call:${callId}`).emit('call:declined', { callId, userId });
		});

		socket.on('call:end', async ({ callId }: { callId: string }) => {
			logger.info({ userId, callId }, '[call] Call ended');
			await callsService.updateStatus(callId, 'ended');
			await callsService.removeParticipant(callId, userId);
			io.to(`call:${callId}`).emit('call:ended', { callId });
			socket.leave(`call:${callId}`);
		});

		socket.on(
			'webrtc:offer',
			({
				callId,
				toUserId: _toUserId,
				sdp
			}: {
				callId: string;
				toUserId: string;
				sdp: RTCSessionDescriptionInit;
			}) => {
				logger.debug({ userId, callId }, '[webrtc] Offer relayed');
				socket
					.to(`call:${callId}`)
					.emit('webrtc:offer', { callId, fromUserId: userId, sdp });
			}
		);

		socket.on(
			'webrtc:answer',
			({
				callId,
				toUserId: _toUserId,
				sdp
			}: {
				callId: string;
				toUserId: string;
				sdp: RTCSessionDescriptionInit;
			}) => {
				logger.debug({ userId, callId }, '[webrtc] Answer relayed');
				socket
					.to(`call:${callId}`)
					.emit('webrtc:answer', { callId, fromUserId: userId, sdp });
			}
		);

		socket.on(
			'webrtc:ice-candidate',
			({
				callId,
				toUserId: _toUserId,
				candidate
			}: {
				callId: string;
				toUserId: string;
				candidate: RTCIceCandidateInit;
			}) => {
				logger.debug(
					{ userId, callId },
					'[webrtc] ICE candidate relayed'
				);
				socket.to(`call:${callId}`).emit('webrtc:ice-candidate', {
					callId,
					fromUserId: userId,
					candidate
				});
			}
		);
	});
}
