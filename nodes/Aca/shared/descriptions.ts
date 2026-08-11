import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

/**
 * ACA paginates by keyset: `?limit=&cursor=` in, `{ data, has_more, next_cursor }`
 * out. There is no offset and no total count, because the underlying tables run
 * to millions of rows per organisation.
 *
 * The cursor is appended to `url`, deliberately NOT sent as `qs`. n8n's routing
 * engine shallow-merges the paginated request over the original options, so
 * returning a `qs` object here would replace the whole query object - silently
 * dropping every filter the user selected from page two onwards. Appending to
 * the URL leaves `qs` untouched.
 *
 * On the first iteration `$response` is `{}`, so the ternary falls through to
 * the unmodified `$request.url` and no cursor is sent. `continue` is only
 * evaluated once a real response exists.
 */
const cursorPagination: NonNullable<INodeProperties['routing']> = {
	send: {
		paginate: '={{ $value }}',
		type: 'query',
		property: 'limit',
		value: '100',
	},
	operations: {
		pagination: {
			type: 'generic',
			properties: {
				continue: '={{ $response.body?.has_more === true && !!$response.body?.next_cursor }}',
				request: {
					url:
						'={{ $response.body?.next_cursor' +
						' ? $request.url + ($request.url.includes("?") ? "&" : "?")' +
						' + "cursor=" + encodeURIComponent($response.body.next_cursor)' +
						' : $request.url }}',
				},
			},
		},
	},
};

/**
 * The standard Return All / Limit pair for a list operation.
 *
 * `maxValue: 100` mirrors the API's own ceiling, so the UI stops the user before
 * the server has to.
 */
export function returnAllProperties(show: IDisplayOptions['show']): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show },
			routing: cursorPagination,
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1, maxValue: 100 },
			default: 50,
			description: 'Max number of results to return',
			displayOptions: { show: { ...show, returnAll: [false] } },
			routing: {
				send: { type: 'query', property: 'limit' },
				output: { maxResults: '={{ $value }}' },
			},
		},
	];
}

/** Unwrap `{ success, data: [...] }` into one n8n item per row. */
export const unwrapData: NonNullable<INodeProperties['routing']>['output'] = {
	postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }],
};

/**
 * A single-item delete returns `{ deleted: true }`.
 *
 * ACA answers with `{ success, deleted, requested }`, which is the right shape
 * for a bulk call and noise for a single one - n8n's convention for deleting one
 * thing is a bare confirmation.
 */
export const confirmDeleted: NonNullable<INodeProperties['routing']>['output'] = {
	postReceive: [{ type: 'set', properties: { value: '={{ { "deleted": true } }}' } }],
};

/**
 * Contact rows carry 25 columns. Most workflows want a name, an address and a
 * score, so offer the short version and default to it - the raw row is one
 * toggle away.
 */
export function simplifyProperty(show: IDisplayOptions['show']): INodeProperties {
	return {
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		description:
			'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: { show },
		routing: {
			output: {
				postReceive: [
					{
						type: 'setKeyValue',
						enabled: '={{ $value }}',
						properties: {
							id: '={{ $responseItem.id }}',
							name: '={{ $responseItem.display_name }}',
							email: '={{ $responseItem.primary_email }}',
							phone: '={{ $responseItem.primary_phone }}',
							company: '={{ $responseItem.company }}',
							jobTitle: '={{ $responseItem.job_title }}',
							linkedinUrl: '={{ $responseItem.primary_linkedin_url }}',
							status: '={{ $responseItem.status }}',
							leadScore: '={{ $responseItem.lead_score }}',
							stageId: '={{ $responseItem.stage_id }}',
							tags: '={{ $responseItem.tags }}',
							customFields: '={{ $responseItem.custom_fields }}',
							createdAt: '={{ $responseItem.created_at }}',
						},
					},
				],
			},
		},
	};
}

/**
 * Flatten a list-membership row into the contact it points at.
 *
 * `GET /lists/members` returns `{ id, contact_id, added_at, contact: {...} }` —
 * a membership record with the contact nested inside it. Nobody reading a list
 * wants to write `$json.contact.display_name`, so lift the contact to the top
 * level and keep `addedAt` alongside it.
 */
export function simplifyMembersProperty(show: IDisplayOptions['show']): INodeProperties {
	return {
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		// n8n's linter mandates this exact wording on any parameter named `simple`.
		description:
			'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: { show },
		routing: {
			output: {
				postReceive: [
					{
						type: 'setKeyValue',
						enabled: '={{ $value }}',
						properties: {
							id: '={{ $responseItem.contact_id }}',
							name: '={{ $responseItem.contact?.display_name }}',
							email: '={{ $responseItem.contact?.primary_email }}',
							phone: '={{ $responseItem.contact?.primary_phone }}',
							company: '={{ $responseItem.contact?.company }}',
							jobTitle: '={{ $responseItem.contact?.job_title }}',
							linkedinUrl: '={{ $responseItem.contact?.primary_linkedin_url }}',
							country: '={{ $responseItem.contact?.country }}',
							status: '={{ $responseItem.contact?.status }}',
							leadScore: '={{ $responseItem.contact?.lead_score }}',
							tags: '={{ $responseItem.contact?.tags }}',
							customFields: '={{ $responseItem.contact?.custom_fields }}',
							addedAt: '={{ $responseItem.added_at }}',
						},
					},
				],
			},
		},
	};
}

/** Picker for a lead list, by name or by pasted ID. */
export const listLocator: INodeProperties = {
	displayName: 'Lead List',
	name: 'listId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a lead list...',
			typeOptions: { searchListMethod: 'getLeadLists', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 8c1d4e77-2a3b-4f56-9e01-77b2c9d4e5f6',
		},
	],
};

/** Picker for an email sequence, by name or by pasted ID. */
export const sequenceLocator: INodeProperties = {
	displayName: 'Sequence',
	name: 'sequenceId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a sequence...',
			typeOptions: { searchListMethod: 'getSequences', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 44616863-c68b-4ed2-b646-ee498d2c404b',
		},
	],
};

/** Turn a comma-separated field into a JSON array of trimmed, non-empty values. */
export const splitCsv = '={{ $value.split(",").map(v => v.trim()).filter(v => v) }}';
