import { createHmac, timingSafeEqual } from 'node:crypto';
import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';

import { ACA_WEBHOOK_EVENTS } from '../Aca/shared/constants';
import { acaApiRequest, acaApiRequestAllItems } from '../Aca/shared/transport';

/** Constant-time compare that tolerates a length mismatch instead of throwing. */
function safeEqual(a: string, b: string): boolean {
	const bufferA = Buffer.from(a);
	const bufferB = Buffer.from(b);
	return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

// `usableAsTool` is deliberately absent from this node. n8n's own type allows
// only `true | UsableAsToolDescription | undefined`, so there is no way to say
// "false" - and a trigger cannot be an agent tool: it has no inputs and nothing
// to call. Declaring it `true` would put a node that cannot execute into the AI
// Agent's tool picker.
// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool
export class AcaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ACA Trigger',
		name: 'acaTrigger',
		icon: { light: 'file:../../icons/aca.svg', dark: 'file:../../icons/aca.dark.svg' },
		group: ['trigger'],
		version: 1,
		// An unconfigured trigger has no events yet; joining an empty array would
		// leave the canvas node captionless.
		subtitle:
			'={{ $parameter["events"] && $parameter["events"].length ? $parameter["events"].join(", ") : "no events selected" }}',
		description: 'Starts the workflow when something happens in ACA',
		defaults: { name: 'ACA Trigger' },
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
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The ACA events this workflow should start on',
				options: ACA_WEBHOOK_EVENTS,
			},
			{
				displayName:
					'<b>Contact Updated</b> fires on every change to a contact row, so a bulk edit or an enrichment run can deliver a very large burst. If you only care about meaningful transitions, use <b>Stage Changed</b> or <b>Score Changed</b> instead.',
				name: 'volumeNotice',
				type: 'notice',
				default: '',
				displayOptions: { show: { events: ['contact_updated'] } },
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
			 * Matching on the URL rather than on a stored ID is load-bearing.
			 * `getNodeWebhookUrl` returns the *test* URL during a manual run and the
			 * *production* URL once the workflow is activated, so an ID-only check
			 * would happily accept a subscription still aimed at a dead test URL and
			 * production events would go nowhere.
			 *
			 * It also re-reads `secret`, because n8n does not persist workflow static
			 * data across manual executions - without this, signature verification
			 * would fail after a restart.
			 */
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events', []) as string[];

				try {
					const existing = await acaApiRequestAllItems.call(this, '/webhooks');
					const match = existing.find(
						(subscription) =>
							subscription.target_url === webhookUrl && subscription.is_active === true,
					);

					if (!match) {
						delete webhookData.webhookId;
						delete webhookData.webhookSecret;
						return false;
					}

					// Re-register when the selected events have drifted from what is
					// registered, otherwise editing the node would silently keep
					// delivering the old set.
					const subscribed = (match.events as string[]) ?? [];
					const sameEvents =
						subscribed.length === events.length &&
						events.every((event) => subscribed.includes(event));

					if (!sameEvents) {
						delete webhookData.webhookId;
						delete webhookData.webhookSecret;
						return false;
					}

					webhookData.webhookId = match.id as string;
					webhookData.webhookSecret = match.secret as string;
					return true;
				} catch (error) {
					this.logger.error('ACA Trigger: could not check for an existing webhook subscription', {
						error,
					});
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events', []) as string[];

				if (events.length === 0) {
					throw new NodeOperationError(
						this.getNode(),
						'Select at least one event for the ACA Trigger to listen to',
					);
				}

				try {
					// Posting the same URL twice updates the existing subscription
					// rather than failing, so re-activating a workflow always converges.
					const response = await acaApiRequest.call(this, 'POST', '/webhooks', {
						target_url: webhookUrl,
						events,
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
					this.logger.error('ACA Trigger: could not create the webhook subscription', { error });
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
						this.logger.error('ACA Trigger: could not delete the webhook subscription', { error });
						return false;
					}
					this.logger.debug('ACA Trigger: webhook subscription was already removed', { error });
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

		const selected = this.getNodeParameter('events', []) as string[];
		const eventName = (headers['x-webhook-event'] as string) ?? (body.event as string);

		if (!eventName || !selected.includes(eventName)) {
			// Acknowledge with 200 and start nothing. Delivery is at-least-once with
			// retries, so returning an error for an authentic event we simply do not
			// want would only buy two more copies of it.
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
									data: body.data,
								},
					},
				],
			],
		};
	}
}
