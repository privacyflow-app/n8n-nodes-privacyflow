import {
	NodeConnectionTypes,
	NodeApiError,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
} from 'n8n-workflow';
import { sendMessageDescription } from './resources/message';
import { listContactsDescription } from './resources/contact';

export class PrivacyFlow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Privacyflow',
		name: 'privacyFlow',
		icon: {
			light: 'file:../../icons/privacyflow.svg',
			dark: 'file:../../icons/privacyflow.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter.operation + ": " + $parameter.resource}}',
		description: 'Privacy-first messaging for n8n workflows',
		defaults: {
			name: 'PrivacyFlow',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'privacyFlowApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message Action',
						value: 'message-actions',
					},
					{
						name: 'Contact Management',
						value: 'contact-management',
					},
				],
				default: 'message-actions',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['message-actions'],
					},
				},
				options: [
					{
						name: 'Send a Text Message',
						value: 'sendTextMessage',
						description: 'Send a plaintext message',
						action: 'Send a text message a message actions',
					},
					{
						name: 'Get All Unread Messages',
						value: 'getUnreadMessages',
						description: 'Retrieve messages that failed to deliver',
						action: 'Get all unread messages a message actions',
					},
				],
				default: 'sendTextMessage',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['contact-management'],
					},
				},
				options: [
					{
						name: 'List Contacts',
						value: 'listContacts',
						description: 'Get available contacts',
						action: 'List contacts a contact management',
					},
				],
				default: 'listContacts',
			},
			...sendMessageDescription,
			...listContactsDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0) as string;

		// Handle operations
		switch (operation) {
			case 'sendTextMessage':
				return await sendMessage.call(this);
			case 'getUnreadMessages':
				return await getUnreadMessages.call(this);
			case 'listContacts':
				return await listContacts.call(this);
			default:
				throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
		}
	}
}

async function sendMessage(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const recipient = this.getNodeParameter('recipient', 0) as string;
	const message = this.getNodeParameter('message', 0) as string;

	// Input validation
	if (!recipient.trim()) {
		throw new NodeOperationError(this.getNode(), 'Recipient is required for sending messages');
	}
	if (!message.trim()) {
		throw new NodeOperationError(this.getNode(), 'Message content cannot be empty');
	}
	if (message.length > 10000) {
		throw new NodeOperationError(this.getNode(), 'Message content exceeds 10,000 character limit');
	}

	const body: IDataObject = {
		recipient,
		message,
	};

	try {
		// Get baseUrl from credentials
		const credentials = await this.getCredentials('privacyFlowApi');
		const baseUrl = credentials.baseUrl as string;

		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'privacyFlowApi', {
			method: 'POST',
			url: `${baseUrl}/api/v1/messages/send`,
			body,
			json: true,
		});

		return [this.helpers.returnJsonArray([response])];
	} catch (error) {
		if (error.response?.status === 401) {
			throw new NodeApiError(this.getNode(), error, {
				message: 'Authentication failed: Please check your API key',
			});
		}
		if (error.response?.status === 429) {
			throw new NodeApiError(this.getNode(), error, {
				message: 'Rate limit exceeded: Please try again later',
			});
		}
		throw new NodeApiError(this.getNode(), error, {
			message: `Failed to send message: ${error.message}`,
		});
	}
}

async function getUnreadMessages(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	try {
		// Get baseUrl from credentials
		const credentials = await this.getCredentials('privacyFlowApi');
		const baseUrl = credentials.baseUrl as string;

		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'privacyFlowApi', {
			method: 'GET',
			url: `${baseUrl}/api/v1/messages/unread`,
			json: true,
		});

		const messages = response.messages || [];
		return [this.helpers.returnJsonArray(messages)];
	} catch (error) {
		if (error.response?.status === 401) {
			throw new NodeApiError(this.getNode(), error, {
				message: 'Authentication failed: Please check your API key',
			});
		}
		throw new NodeApiError(this.getNode(), error, {
			message: `Failed to retrieve unread messages: ${error.message}`,
		});
	}
}

async function listContacts(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	try {
		// Get baseUrl from credentials
		const credentials = await this.getCredentials('privacyFlowApi');
		const baseUrl = credentials.baseUrl as string;

		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'privacyFlowApi', {
			method: 'GET',
			url: `${baseUrl}/api/v1/contacts`,
			json: true,
		});

		const contacts = response.contacts || [];
		return [this.helpers.returnJsonArray(contacts)];
	} catch (error) {
		if (error.response?.status === 401) {
			throw new NodeApiError(this.getNode(), error, {
				message: 'Authentication failed: Please check your API key',
			});
		}
		throw new NodeApiError(this.getNode(), error, {
			message: `Failed to retrieve contacts: ${error.message}`,
		});
	}
}
