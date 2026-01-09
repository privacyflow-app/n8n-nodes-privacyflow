import {
	NodeConnectionTypes,
	NodeApiError,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';

export class PrivacyFlowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PrivacyFlow Trigger',
		name: 'privacyFlowTrigger',
		icon: {
			light: 'file:../../icons/privacyflow.svg',
			dark: 'file:../../icons/privacyflow.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		subtitle: 'Poll Messages',
		description: 'Start workflows when PrivacyFlow messages are received',
		defaults: {
			name: 'PrivacyFlow Trigger',
		},
		usableAsTool: true,
		polling: true,
		inputs: [],
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
				displayName: 'Message Limit',
				name: 'messageLimit',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 50,
				description: 'Maximum number of messages to retrieve per poll (1-100)',
			},
		],
	};

async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
	const messageLimit = this.getNodeParameter('messageLimit', 0) as number;

	// Validate parameters
	if (messageLimit < 1 || messageLimit > 100) {
		throw new NodeOperationError(this.getNode(), 'Message limit must be between 1 and 100');
	}

	try {
		// Debug logging
		const credentials = await this.getCredentials('privacyFlowApi');
		this.logger.error(`Polling with baseURL: ${credentials?.baseUrl}`);
		this.logger.error(`Credentials keys: ${Object.keys(credentials || {}).join(', ')}`);
		if (!credentials?.baseUrl) {
			throw new NodeOperationError(this.getNode(), 'Credentials missing baseUrl');
		}
		const fullUrl = `${credentials.baseUrl}/api/v1/messages/poll`;
		this.logger.error(`Constructed URL: ${fullUrl}`);

		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'privacyFlowApi',
			{
				method: 'GET',
				url: '/api/v1/messages/poll',
				baseURL: credentials.baseUrl as string,
				qs: {
					limit: messageLimit,
				},
				json: true,
				timeout: 30000, // 30 second timeout
			},
		);

const messages = response.messages || [];

// Return null if no new messages (required for n8n polling)
if (messages.length === 0) {
return null;
}

return [this.helpers.returnJsonArray(messages)];
} catch (error) {
	// Debug logging
	this.logger.error(`Polling error: ${error.message}`, { error });
	this.logger.error(`Error details: ${JSON.stringify({
		code: error.code,
		config: error.config,
		url: error.config?.url,
		baseURL: error.config?.baseURL,
		fullError: error,
	})}`);

	// Handle authentication errors immediately (no retry)
	if (error.response?.status === 401) {
		throw new NodeApiError(this.getNode(), error, {
			message: 'Authentication failed: Please check your API key',
		});
	}

	// Handle rate limiting
	if (error.response?.status === 429) {
		throw new NodeApiError(this.getNode(), error, {
			message: 'Rate limit exceeded: Please try again later',
		});
	}

	// Handle network and server errors
	if (
		error.code === 'ECONNRESET' ||
		error.code === 'ETIMEDOUT' ||
		error.code === 'ENOTFOUND' ||
		error.response?.status >= 500
	) {
		throw new NodeApiError(this.getNode(), error, {
			message: error.message,
		});
	}

	// For other errors
	throw new NodeApiError(this.getNode(), error, {
		message: error.message,
	});
}
}
}
