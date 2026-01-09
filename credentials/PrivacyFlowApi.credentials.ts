import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PrivacyFlowApi implements ICredentialType {
	name = 'privacyFlowApi';

	displayName = 'PrivacyFlow API';

	icon: Icon = {
		light: 'file:../icons/privacyflow.svg',
		dark: 'file:../icons/privacyflow.dark.svg',
	};

	documentationUrl = 'https://docs.privacyflow.app';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your PrivacyFlow API key (serves as unique identifier)',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.privacyflow.app',
			required: true,
			description: 'The base URL for the PrivacyFlow API',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/health',
			method: 'GET',
		},
	};
}
