import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AcaApi implements ICredentialType {
	name = 'acaApi';

	displayName = 'ACA API';

	icon: Icon = { light: 'file:../icons/aca.svg', dark: 'file:../icons/aca.dark.svg' };

	documentationUrl = 'https://github.com/seguelaCedric/n8n-nodes-aca?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'e.g. aca_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
			description:
				'Create one in ACA under Settings > CLI Tokens. The token is tied to a single organisation at the moment you issue it, so use one token per organisation.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	// The cheapest authenticated read in the API: unpaginated, a handful of rows,
	// and a clean 401 on a revoked token.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.automatedclientacquisition.com/v1',
			url: '/custom-fields',
			method: 'GET',
		},
	};
}
