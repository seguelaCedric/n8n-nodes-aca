import { createHmac, timingSafeEqual } from 'node:crypto';
import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';

import { acaApiRequest, acaApiRequestAllItems } from '../Aca/shared/transport';

/** The one event this node exists for. Not user-selectable. */
const SIGNAL_EVENT = 'signal_lead_added';

/** Constant-time compare that tolerates a length mismatch instead of throwing. */
function safeEqual(a: string, b: string): boolean {
	const bufferA = Buffer.from(a);
	const bufferB = Buffer.from(b);
	return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

// `usableAsTool` is deliberately absent, for the same reason as on ACA Trigger:
// n8n's type allows only `true | UsableAsToolDescription | undefined`, and a
// trigger has no inputs and nothing an agent could call.
// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool
export class AcaSignalTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ACA Signal Trigger',
		name: 'acaSignalTrigger',
		icon: { light: 'file:../../icons/aca.svg', dark: 'file:../../icons/aca.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle:
			'={{ $parameter["signalTypes"] && $parameter["signalTypes"].length ? $parameter["signalTypes"].join(", ") : "any signal" }}',
		description: 'Starts the workflow when a buying signal puts a lead on a lead list in ACA',
		defaults: { name: 'ACA Signal Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'acaApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Fires once per lead, when a signal rule adds one to a lead list — public signals, your own custom signal subscriptions, and pushes from the signal library. The signal that caused it comes with the lead.',
				name: 'aboutNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Signal Types',
				name: 'signalTypes',
				type: 'multiOptions',
				default: [],
				description:
					'Only start the workflow for these kinds of signal. Leave empty for every kind. Filtered inside n8n rather than by ACA — a signal you did not pick still arrives and is acknowledged, it just starts nothing.',
				options: [
					{
						name: 'Acquisition',
						value: 'acquisition',
						description: 'The company was acquired, or acquired somebody',
					},
					{
						name: 'Executive Hire',
						value: 'executive_hire',
						description: 'The company appointed a senior leader',
					},
					{
						name: 'Funding',
						value: 'funding',
						description: 'The company raised a round',
					},
					{
						name: 'Growth',
						value: 'growth',
						description: 'The company is expanding — new market, office or product',
					},
					{
						name: 'Hiring',
						value: 'hiring',
						description: 'The company is hiring',
					},
					{
						name: 'Hiring Demand',
						value: 'hiring_demand',
						description: 'A sustained spike in the company’s open roles',
					},
					{
						name: 'Job Change',
						value: 'job_change',
						description: 'Somebody moved into a new role',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Raw Envelope',
						name: 'rawEnvelope',
						type: 'boolean',
						default: false,
						description:
							'Whether to output ACA delivery envelope verbatim instead of the flattened shape',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			/**
			 * Does a live subscription already point at this workflow URL?
			 *
			 * Matched on the URL rather than a stored ID, exactly as ACA Trigger does
			 * it: `getNodeWebhookUrl` returns the test URL during a manual run and the
			 * production URL once the workflow is activated, so an ID-only check would
			 * accept a subscription still aimed at a dead test URL.
			 *
			 * `secret` is re-read for the same reason — n8n does not persist workflow
			 * static data across manual executions, and without it every delivery
			 * would fail signature verification after a restart.
			 */
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');

				try {
					const existing = await acaApiRequestAllItems.call(this, '/webhooks');
					const match = existing.find(
						(subscription) =>
							subscription.target_url === webhookUrl && subscription.is_active === true,
					);

					// The event set is fixed, so unlike ACA Trigger there is nothing to
					// drift — but a subscription this URL inherited from a different
					// node would carry the wrong events, and re-registering fixes it.
					const subscribed = (match?.events as string[]) ?? [];
					if (!match || subscribed.length !== 1 || subscribed[0] !== SIGNAL_EVENT) {
						delete webhookData.webhookId;
						delete webhookData.webhookSecret;
						return false;
					}

					webhookData.webhookId = match.id as string;
					webhookData.webhookSecret = match.secret as string;
					return true;
				} catch (error) {
					this.logger.error(
						'ACA Signal Trigger: could not check for an existing webhook subscription',
						{ error },
					);
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				try {
					// Posting the same URL twice updates the existing subscription
					// rather than failing, so re-activating always converges.
					const response = await acaApiRequest.call(this, 'POST', '/webhooks', {
						target_url: webhookUrl,
						events: [SIGNAL_EVENT],
						source: 'n8n',
					});

					const created = (response.data ?? response) as IDataObject;

					if (!created?.id || !created?.secret) {
						throw new NodeApiError(this.getNode(), response as JsonObject, {
							message: 'ACA did not return an ID and signing secret for the new subscription',
						});
					}

					const webhookData = this.getWorkflowStaticData('node');
					webhookData.webhookId = created.id as string;
					webhookData.webhookSecret = created.secret as string;
					return true;
				} catch (error) {
					this.logger.error('ACA Signal Trigger: could not create the webhook subscription', {
						error,
					});
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId === undefined) {
					return true;
				}

				try {
					await acaApiRequest.call(this, 'DELETE', `/webhooks/${webhookData.webhookId}`);
				} catch (error) {
					// Already gone is the state we wanted; anything else is worth
					// surfacing but must not block deactivating the workflow.
					const httpCode = (error as { httpCode?: string }).httpCode;
					if (httpCode !== '404') {
						this.logger.error('ACA Signal Trigger: could not delete the webhook subscription', {
							error,
						});
						return false;
					}
					this.logger.debug('ACA Signal Trigger: webhook subscription was already removed', {
						error,
					});
				}

				delete webhookData.webhookId;
				delete webhookData.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		const headers = this.getHeaderData() as IDataObject;
		const body = this.getBodyData() as IDataObject;
		const webhookData = this.getWorkflowStaticData('node');
		const secret = webhookData.webhookSecret as string | undefined;

		// n8n only materialises the raw body on demand, and the signature covers
		// the exact bytes ACA sent. Re-serialising the parsed object would reorder
		// keys and produce a different digest, so every request would look forged.
		if (!request.rawBody) {
			await request.readRawBody();
		}

		const signature = headers['x-webhook-signature'];
		const isValid =
			typeof secret === 'string' &&
			secret !== '' &&
			typeof signature === 'string' &&
			!!request.rawBody &&
			safeEqual(
				signature,
				`sha256=${createHmac('sha256', secret).update(request.rawBody).digest('hex')}`,
			);

		if (!isValid) {
			// Fail closed. A missing secret is not a reason to trust the payload.
			const response = this.getResponseObject();
			response.status(401).send('Invalid webhook signature').end();
			return { noWebhookResponse: true };
		}

		const eventName = (headers['x-webhook-event'] as string) ?? (body.event as string);
		const data = (body.data ?? {}) as IDataObject;

		// Acknowledge with 200 and start nothing, for anything this node is not
		// for. Delivery is at-least-once with retries, so returning an error for
		// an authentic event we simply do not want would only buy two more copies.
		if (eventName !== SIGNAL_EVENT) {
			return {};
		}

		const signalTypes = this.getNodeParameter('signalTypes', []) as string[];
		if (signalTypes.length > 0 && !signalTypes.includes(data.signal_type as string)) {
			return {};
		}

		const options = this.getNodeParameter('options', {}) as IDataObject;

		return {
			workflowData: [
				[
					{
						json: options.rawEnvelope
							? body
							: {
									event: eventName,
									timestamp: body.timestamp,
									// Stable across all retry attempts - the right dedupe key.
									deliveryId: headers['x-webhook-id'],
									organizationId: body.organization_id,
									// Spread rather than re-nest. The keys ACA sends are the keys
									// the docs name, so `{{ $json.why_it_matters }}` is what a
									// reader expects; inventing a camelCase parallel vocabulary
									// would mean every field has two names.
									...data,
								},
					},
				],
			],
		};
	}
}
