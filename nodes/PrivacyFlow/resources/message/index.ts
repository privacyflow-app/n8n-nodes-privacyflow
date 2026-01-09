import type { INodeProperties } from 'n8n-workflow';

export const sendMessageDescription: INodeProperties[] = [
	{
		displayName: 'Recipient (Contact ID)',
		name: 'recipient',
		type: 'string',
		default: '',
		required: true,
		description:
			'The contact ID to send the message to. PrivacyFlow will automatically determine the correct messenger protocol.',
		displayOptions: {
			show: {
				resource: ['message-actions'],
				operation: ['sendTextMessage'],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: {
			multipleValues: false,
		},
		default: '',
		required: true,
		description: 'The message content to send (max 10,000 characters)',
		displayOptions: {
			show: {
				resource: ['message-actions'],
				operation: ['sendTextMessage'],
			},
		},
	},
];
