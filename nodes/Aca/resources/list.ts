import type { INodeProperties } from 'n8n-workflow';

import {
	listLocator,
	returnAllProperties,
	simplifyMembersProperty,
	splitCsv,
	unwrapData,
} from '../shared/descriptions';
import { MEMBER_FILTERS_QUERY, memberFilterProperties } from '../shared/memberFilters';

const forList = { resource: ['list'] };
const forGetMany = { ...forList, operation: ['getAll'] };
const forCreate = { ...forList, operation: ['create'] };
const forUpdate = { ...forList, operation: ['update'] };
const forGetMembers = { ...forList, operation: ['getMembers'] };
const forAddMembers = { ...forList, operation: ['addMembers'] };
const forRemoveMembers = { ...forList, operation: ['removeMembers'] };

export const listDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forList },
		default: 'getAll',
		options: [
			{
				name: 'Add Members',
				value: 'addMembers',
				action: 'Add contacts to lead list',
				routing: { request: { method: 'POST', url: '/lists/members' } },
			},
			{
				name: 'Archive',
				value: 'update',
				action: 'Rename or archive lead list',
				description: 'Lists cannot be deleted over the API - archive them instead',
				routing: {
					request: { method: 'PATCH', url: '=/lists/{{ $parameter.listId }}' },
					output: unwrapData,
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create lead list',
				routing: { request: { method: 'POST', url: '/lists' }, output: unwrapData },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get lead list',
				routing: {
					request: { method: 'GET', url: '=/lists/{{ $parameter.listId }}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many lead lists',
				routing: { request: { method: 'GET', url: '/lists' }, output: unwrapData },
			},
			{
				name: 'Get Contacts',
				value: 'getMembers',
				action: 'Get contacts in lead list',
				description: 'Retrieve every contact in a lead list',
				routing: { request: { method: 'GET', url: '/lists/members' }, output: unwrapData },
			},
			{
				name: 'Remove Members',
				value: 'removeMembers',
				action: 'Remove contacts from lead list',
				routing: { request: { method: 'DELETE', url: '/lists/members' } },
			},
		],
	},

	/* -- Which list ----- */
	{
		...listLocator,
		displayOptions: { show: { resource: ['list'], operation: ['get', 'update'] } },
	},
	{
		...listLocator,
		description: 'The list to read contacts from',
		displayOptions: { show: forGetMembers },
		routing: {
			send: { type: 'query', property: 'listId' },
			// The filter object rides along with the list ID rather than on the
			// Filters collection itself, so it is built once from every field the
			// user set instead of one fragment per field.
			request: { qs: { filters: MEMBER_FILTERS_QUERY } },
		},
	},
	{
		...listLocator,
		displayName: 'Target List',
		description: 'The list contacts are added to or removed from',
		displayOptions: { show: { resource: ['list'], operation: ['addMembers', 'removeMembers'] } },
		routing: { send: { type: 'body', property: 'listId' } },
	},

	/* -- Get Many ----- */
	...returnAllProperties(forGetMany),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: forGetMany },
		options: [
			{
				displayName: 'Source Type',
				name: 'source_type',
				type: 'string',
				default: '',
				description: 'How the list was built, e.g. <code>manual</code> or <code>pool_search</code>',
				routing: { send: { type: 'query', property: 'source_type' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'active',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Archived', value: 'archived' },
				],
				routing: { send: { type: 'query', property: 'status' } },
			},
		],
	},

	/* -- Get Contacts ----- */
	...returnAllProperties(forGetMembers),
	simplifyMembersProperty(forGetMembers),
	...memberFilterProperties(forGetMembers),
	{
		displayName:
			'Smart lists return nothing here. Their membership is a saved filter that ACA evaluates on demand rather than a stored set of contacts, so there is nothing for this operation to read. The list picker marks them.',
		name: 'smartListNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: forGetMembers },
	},

	/* -- Create ----- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. May warm leads',
		displayOptions: { show: forCreate },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: { show: forCreate },
		routing: { send: { type: 'body', property: 'description' } },
	},

	/* -- Archive / rename ----- */
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: forUpdate },
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'archived',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Archived', value: 'archived' },
				],
				routing: { send: { type: 'body', property: 'status' } },
			},
		],
	},

	/* -- Add members ----- */
	{
		displayName: 'Add By',
		name: 'addBy',
		type: 'options',
		default: 'contactIds',
		description: 'How to choose the contacts to add',
		displayOptions: { show: forAddMembers },
		options: [
			{ name: 'Contact IDs', value: 'contactIds' },
			{
				name: 'Filtered Copy of Another List',
				value: 'sourceList',
				description: 'Resolve the contacts server-side, without moving IDs through the workflow',
			},
		],
	},
	{
		displayName: 'Contact IDs',
		name: 'contactIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 3f2a9c1e-7b40-4d8e-9a12-6c5b8e0d1f34,8c1d4e77-2a3b-4f56-9e01-77b2c9d4e5f6',
		description: 'Comma-separated contact IDs, up to 5000 per call',
		displayOptions: { show: { ...forAddMembers, addBy: ['contactIds'] } },
		routing: { send: { type: 'body', property: 'contactIds', value: splitCsv } },
	},
	{
		displayName: 'Source List ID',
		name: 'sourceListId',
		type: 'string',
		required: true,
		default: '',
		description: 'Copy matching members out of this list',
		displayOptions: { show: { ...forAddMembers, addBy: ['sourceList'] } },
		routing: { send: { type: 'body', property: 'sourceListId' } },
	},
	{
		displayName: 'Filters',
		name: 'sourceFilters',
		type: 'json',
		required: true,
		default: '{\n  "has_email": true\n}',
		description:
			'Applied to the source list to pick the subset to copy. Up to 50,000 matches per call.',
		displayOptions: { show: { ...forAddMembers, addBy: ['sourceList'] } },
		routing: { send: { type: 'body', property: 'filters', value: '={{ JSON.parse($value) }}' } },
	},

	/* -- Remove members ----- */
	{
		displayName: 'Contact IDs',
		name: 'contactIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 3f2a9c1e-7b40-4d8e-9a12-6c5b8e0d1f34,8c1d4e77-2a3b-4f56-9e01-77b2c9d4e5f6',
		description: 'Comma-separated contact IDs, up to 5000 per call',
		displayOptions: { show: forRemoveMembers },
		routing: { send: { type: 'body', property: 'contactIds', value: splitCsv } },
	},
];
