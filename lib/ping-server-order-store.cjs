'use strict';

const crypto = require('node:crypto');
const { getPingFirestoreAdmin } = require('../ping-firebase-admin');

const REQUEST_COLLECTION = 'ping_order_requests';
const ORDER_COLLECTION = 'ping_orders';
const REGISTRY_COLLECTION = 'ping_checkout_sessions';
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const PREPARATION_LEASE_MS = 2 * 60 * 1000;

class ServerOrderStoreError extends Error {
  constructor(code, status = 500) {
    super(code);
    this.name = 'ServerOrderStoreError';
    this.code = code;
    this.status = status;
  }
}

function asMillis(value) {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function orderIdForIdempotencyHash(idempotencyHash) {
  if (!/^[a-f0-9]{64}$/.test(String(idempotencyHash || ''))) {
    throw new ServerOrderStoreError('invalid_idempotency_hash', 400);
  }
  return `ord_${idempotencyHash.slice(0, 40)}`;
}

function fileNameForOrder(flowType, orderId) {
  return flowType === 'thankyou'
    ? `thankyou_filtered_${orderId}.csv`
    : `addressbook_filtered_${orderId}.csv`;
}

function checkoutRegistryDocument(input) {
  return {
    orderId: input.orderId,
    amount: input.totalAmount,
    recipientCount: input.recipientCount,
    checkoutSecretHash: input.checkoutSecretHash,
    status: 'ACTIVE',
    createdAt: input.now,
    expiresAt: input.checkoutExpiresAt,
    consumedAt: null,
    attemptCount: 0,
  };
}

function orderDocument(input, orderId, attemptId, now) {
  const prepared = input.prepared;
  const fileName = fileNameForOrder(prepared.flowType, orderId);
  return {
    orderId,
    name: prepared.applicant.name,
    phone: prepared.applicant.phone,
    sourceObituaryUrl: prepared.sourceObituaryUrl || null,
    deliveryUrl: prepared.deliveryUrl || null,
    obituaryOriginalUrl: prepared.sourceObituaryUrl || null,
    obituaryPageUrl: prepared.deliveryUrl || null,
    safeLinkUrl: null,
    message: prepared.messageBody,
    messageTitle: prepared.messageTitle || null,
    bulkSmsTemplateId: prepared.templateId,
    preferredSendChannel: 'sms',
    preferredSendChannelLabel: '문자(LMS)',
    templateData: prepared.deliveryUrl ? { obit_link: prepared.deliveryUrl } : {},
    partner: null,
    plan: 'standard',
    fileUrl: null,
    storagePath: null,
    fileName,
    contactSource: 'server_order_api',
    googleContactsCount: null,
    count: prepared.recipientCount,
    totalCount: prepared.recipientCount,
    totalAmount: prepared.totalAmount,
    status: 'preparing',
    preparationStatus: 'PREPARING',
    preparationAttemptId: attemptId,
    sendStatus: 'instant',
    scheduledAt: null,
    createdAt: now,
    departureAt: null,
    purgeAfter: null,
  };
}

async function defaultUploadArtifact(orderId, attemptId, fileName, csvBuffer) {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  const bucketName =
    String(process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').trim() ||
    `${admin.app().options.projectId}.appspot.com`;
  const storagePath = `orders/${orderId}/preparations/${attemptId}/${fileName}`;
  const file = admin.storage().bucket(bucketName).file(storagePath);
  await file.save(csvBuffer, {
    contentType: 'text/csv; charset=utf-8',
    resumable: false,
    metadata: { cacheControl: 'private, max-age=0' },
  });
  return {
    storagePath,
    delete: async () => {
      await file.delete({ ignoreNotFound: true });
    },
  };
}

async function markPreparationFailed(db, refs, attemptId, code, now) {
  await db.runTransaction(async (tx) => {
    const requestSnap = await tx.get(refs.requestRef);
    if (!requestSnap.exists) return;
    const request = requestSnap.data() || {};
    if (request.preparationAttemptId !== attemptId || request.status === 'READY') return;
    tx.set(refs.requestRef, {
      status: 'FAILED',
      failureCode: String(code || 'order_preparation_failed').slice(0, 120),
      updatedAt: now,
      leaseExpiresAt: now,
    }, { merge: true });
    tx.set(refs.orderRef, {
      status: 'failed_preparation',
      preparationStatus: 'FAILED_PREPARATION',
      preparationFailureCode: String(code || 'order_preparation_failed').slice(0, 120),
      updatedAt: now,
    }, { merge: true });
  });
}

async function createServerOrder(input, options = {}) {
  const db = options.db || getPingFirestoreAdmin();
  const nowMs = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const now = new Date(nowMs);
  const attemptId = options.attemptId || crypto.randomUUID();
  const orderId = orderIdForIdempotencyHash(input.idempotencyHash);
  const requestRef = db.collection(REQUEST_COLLECTION).doc(input.idempotencyHash);
  const orderRef = db.collection(ORDER_COLLECTION).doc(orderId);
  const registryRef = db.collection(REGISTRY_COLLECTION).doc(orderId);
  const refs = { requestRef, orderRef, registryRef };
  const idempotencyExpiresAt = new Date(nowMs + IDEMPOTENCY_TTL_MS);
  const leaseExpiresAt = new Date(nowMs + PREPARATION_LEASE_MS);

  const claim = await db.runTransaction(async (tx) => {
    const snap = await tx.get(requestRef);
    if (snap.exists) {
      const existing = snap.data() || {};
      if (existing.payloadHash !== input.payloadHash) {
        throw new ServerOrderStoreError('idempotency_payload_conflict', 409);
      }
      if (asMillis(existing.idempotencyExpiresAt) <= nowMs) {
        throw new ServerOrderStoreError('idempotency_key_expired', 409);
      }
      if (existing.status === 'READY') {
        return {
          reused: true,
          orderId: existing.orderId,
          totalAmount: existing.totalAmount,
          recipientCount: existing.recipientCount,
          checkoutExpiresAt: asMillis(existing.checkoutExpiresAt),
        };
      }
      if (existing.status === 'PREPARING' && asMillis(existing.leaseExpiresAt) > nowMs) {
        throw new ServerOrderStoreError('order_preparation_in_progress', 409);
      }
    }

    const order = orderDocument(input, orderId, attemptId, now);
    tx.set(requestRef, {
      clientRequestIdHash: input.idempotencyHash,
      payloadHash: input.payloadHash,
      orderId,
      status: 'PREPARING',
      preparationAttemptId: attemptId,
      recipientCount: input.prepared.recipientCount,
      totalAmount: input.prepared.totalAmount,
      createdAt: snap.exists ? (snap.data() || {}).createdAt || now : now,
      updatedAt: now,
      leaseExpiresAt,
      idempotencyExpiresAt,
      checkoutExpiresAt: input.checkoutExpiresAt,
    }, { merge: true });
    tx.set(orderRef, order, { merge: true });
    return { reused: false, orderId };
  });

  if (claim.reused) return claim;

  const fileName = fileNameForOrder(input.prepared.flowType, orderId);
  let artifact = null;
  try {
    const upload = options.uploadArtifact || defaultUploadArtifact;
    artifact = await upload(orderId, attemptId, fileName, input.csvBuffer);

    await db.runTransaction(async (tx) => {
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists) throw new ServerOrderStoreError('idempotency_claim_missing', 409);
      const request = requestSnap.data() || {};
      if (request.payloadHash !== input.payloadHash) {
        throw new ServerOrderStoreError('idempotency_payload_conflict', 409);
      }
      if (request.preparationAttemptId !== attemptId || request.status !== 'PREPARING') {
        throw new ServerOrderStoreError('preparation_lease_lost', 409);
      }
      const registrySnap = await tx.get(registryRef);
      if (registrySnap.exists) {
        const row = registrySnap.data() || {};
        const same =
          row.status === 'ACTIVE' &&
          row.checkoutSecretHash === input.checkoutSecretHash &&
          Number(row.amount) === input.prepared.totalAmount &&
          Number(row.recipientCount) === input.prepared.recipientCount;
        if (!same) throw new ServerOrderStoreError('checkout_session_conflict', 409);
      } else {
        tx.set(registryRef, checkoutRegistryDocument({
          orderId,
          totalAmount: input.prepared.totalAmount,
          recipientCount: input.prepared.recipientCount,
          checkoutSecretHash: input.checkoutSecretHash,
          checkoutExpiresAt: input.checkoutExpiresAt,
          now,
        }));
      }
      tx.set(orderRef, {
        status: 'waiting_payment',
        preparationStatus: 'READY_FOR_PAYMENT',
        storagePath: artifact.storagePath,
        fileUrl: null,
        updatedAt: now,
      }, { merge: true });
      tx.set(requestRef, {
        status: 'READY',
        storagePath: artifact.storagePath,
        checkoutExpiresAt: input.checkoutExpiresAt,
        updatedAt: now,
        leaseExpiresAt: now,
      }, { merge: true });
    });

    return {
      reused: false,
      orderId,
      totalAmount: input.prepared.totalAmount,
      recipientCount: input.prepared.recipientCount,
      checkoutExpiresAt: input.checkoutExpiresAt.getTime(),
      storagePath: artifact.storagePath,
    };
  } catch (error) {
    if (artifact && typeof artifact.delete === 'function') {
      await artifact.delete().catch(() => {});
    }
    await markPreparationFailed(
      db,
      refs,
      attemptId,
      error && (error.code || error.message),
      new Date(),
    ).catch(() => {});
    throw error;
  }
}

module.exports = {
  REQUEST_COLLECTION,
  ORDER_COLLECTION,
  REGISTRY_COLLECTION,
  IDEMPOTENCY_TTL_MS,
  PREPARATION_LEASE_MS,
  ServerOrderStoreError,
  orderIdForIdempotencyHash,
  fileNameForOrder,
  checkoutRegistryDocument,
  orderDocument,
  createServerOrder,
};
