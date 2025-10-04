const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(32);
process.env.LAHZA_SECRET_KEY = "test-lahza-secret";

const ordersRouter = require("../routes/orders");
const paymentsRouter = require("../routes/payments");

const Order = require("../models/Order");
const Product = require("../models/Product");
const Variant = require("../models/Variant");
const DiscountRule = require("../models/DiscountRule");
const axios = require("axios");

const ordersStore = new Map();

const defaultAxiosGet = async () => ({ data: { data: {} } });
axios.get = defaultAxiosGet;

Order.create = async (doc) => {
  const _id = new mongoose.Types.ObjectId().toString();
  const saved = { ...doc, _id };
  ordersStore.set(_id, saved);
  return saved;
};

Order.findById = (id) => ({
  lean: async () => ordersStore.get(String(id)) || null,
});

Order.findByIdAndUpdate = (id, update) => ({
  lean: async () => {
    const existing = ordersStore.get(String(id));
    if (!existing) return null;
    const set = { ...(update?.$set || {}) };
    const updated = { ...existing, ...set };
    ordersStore.set(String(id), updated);
    return updated;
  },
});

const originalFindOneAndUpdate = Order.findOneAndUpdate;
if (typeof originalFindOneAndUpdate !== "function") {
  Order.findOneAndUpdate = () => ({
    lean: async () => null,
  });
}

function normalizeComparable(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }
  if (typeof value === "object" && typeof value.toString === "function") {
    return value.toString();
  }
  return value;
}

function matchesFilter(doc, filter = {}) {
  if (!filter || typeof filter !== "object") return true;
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (Object.prototype.hasOwnProperty.call(value, "$ne")) {
        return (
          normalizeComparable(doc[key]) !== normalizeComparable(value.$ne)
        );
      }
      return false;
    }
    return normalizeComparable(doc[key]) === normalizeComparable(value);
  });
}

Order.findOne = (filter = {}) => ({
  lean: async () => {
    for (const order of ordersStore.values()) {
      if (matchesFilter(order, filter)) {
        return { ...order };
      }
    }
    return null;
  },
});

Order.findOneAndUpdate = (filter = {}, update = {}, options = {}) => ({
  lean: async () => {
    for (const [id, order] of ordersStore.entries()) {
      if (!matchesFilter(order, filter)) continue;
      const set = { ...(update?.$set || {}) };
      const updated = { ...order, ...set };
      ordersStore.set(id, updated);
      return options?.new ? { ...updated } : { ...order };
    }
    return null;
  },
});

Order.updateOne = async (filter = {}, update = {}) => {
  for (const [id, order] of ordersStore.entries()) {
    if (!matchesFilter(order, filter)) continue;
    const set = { ...(update?.$set || {}) };
    const updated = { ...order, ...set };
    ordersStore.set(id, updated);
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }
  return { acknowledged: false, matchedCount: 0, modifiedCount: 0 };
};

let variantResolver = () => null;
Variant.findOne = (query) => ({
  lean: async () => {
    const res = await variantResolver(query);
    return res ? { ...res } : null;
  },
});

let productResolver = () => null;
Product.findById = (id) => ({
  lean: async () => {
    const res = await productResolver(id);
    return res ? { ...res } : null;
  },
});

let discountResolver = () => null;
DiscountRule.findOne = (query) => ({
  sort() {
    return this;
  },
  lean: async () => {
    const res = await discountResolver(query);
    return res ? { ...res } : null;
  },
});

let lastLahzaPayload = null;
axios.post = async (url, payload) => {
  lastLahzaPayload = { url, payload };
  return {
    data: {
      data: {
        authorization_url: "https://lahza.example/checkout",
        reference: "lahza-ref-123",
      },
    },
  };
};

function resetState() {
  ordersStore.clear();
  lastLahzaPayload = null;
  variantResolver = () => null;
  productResolver = () => null;
  discountResolver = () => null;
  axios.get = defaultAxiosGet;
}

function createMockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function getRouteHandler(router, method, path) {
  const stack = router.stack || (router.default && router.default.stack) || [];
  for (const layer of stack) {
    if (
      layer.route &&
      layer.route.path === path &&
      layer.route.methods?.[method]
    ) {
      const handlers = layer.route.stack || [];
      return handlers[handlers.length - 1].handle;
    }
  }
  throw new Error(`Handler for ${method.toUpperCase()} ${path} not found`);
}

const codHandler = getRouteHandler(ordersRouter, "post", "/");
const prepareCardHandler = getRouteHandler(
  ordersRouter,
  "post",
  "/prepare-card"
);
const lahzaCreateHandler = getRouteHandler(paymentsRouter, "post", "/create");
const adminPayHandler = getRouteHandler(
  ordersRouter,
  "patch",
  "/by-reference/:reference/pay"
);
test(
  "COD orders force paymentStatus to unpaid",
  { concurrency: false },
  async () => {
    resetState();

    const productId = new mongoose.Types.ObjectId().toString();
    const variantId = new mongoose.Types.ObjectId().toString();

    const variantDoc = {
      _id: variantId,
      product: productId,
      price: { amount: 50, discount: null },
      stock: { sku: "SKU-PAID" },
      color: { images: [] },
    };

    variantResolver = (query) => {
      if (
        query?._id &&
        String(query._id) === variantId &&
        (!query.product || String(query.product) === productId)
      ) {
        return variantDoc;
      }
      return null;
    };

    const req = {
      body: {
        address: "Force Unpaid St",
        items: [
          {
            productId,
            variantId,
            quantity: 1,
          },
        ],
        paymentMethod: "cod",
        paymentStatus: "paid",
      },
    };

    const res = createMockRes();
    await codHandler(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.paymentStatus, "unpaid");

    const saved = ordersStore.get(res.body._id);
    assert.ok(saved, "order persisted in store");
    assert.equal(saved.paymentStatus, "unpaid");
  }
);

test(
  "COD orders recompute tampered discount server-side",
  { concurrency: false },
  async () => {
    resetState();

    const productId = new mongoose.Types.ObjectId().toString();
    const variantId = new mongoose.Types.ObjectId().toString();
    const ruleId = new mongoose.Types.ObjectId().toString();

    const variantDoc = {
      _id: variantId,
      product: productId,
      price: { amount: 100, discount: null },
      stock: { sku: "SKU123" },
      color: { images: [] },
    };
    variantResolver = (query) => {
      if (
        query?._id &&
        String(query._id) === variantId &&
        (!query.product || String(query.product) === productId)
      ) {
        return variantDoc;
      }
      return null;
    };

    productResolver = (id) => {
      if (String(id) === productId) {
        return {
          _id: productId,
          images: ["img.png"],
          name: { ar: "منتج", he: "Product" },
        };
      }
      return null;
    };

    const discountRule = {
      _id: ruleId,
      type: "percent",
      value: 10,
      threshold: 100,
      isActive: true,
      name: "Ten Percent",
    };
    discountResolver = (query) => {
      const threshold = query?.threshold?.$lte ?? Infinity;
      const eligible =
        threshold >= discountRule.threshold && discountRule.isActive;
      if (!eligible) return null;
      if (query?._id) {
        return String(query._id) === ruleId ? discountRule : null;
      }
      return discountRule;
    };

    const req = {
      body: {
        address: "Test Address",
        items: [
          {
            productId,
            variantId,
            quantity: 2,
          },
        ],
        paymentMethod: "cod",
        discount: {
          applied: true,
          ruleId,
          amount: 9999,
          type: "percent",
          value: 999,
        },
      },
    };

    const res = createMockRes();
    await codHandler(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.subtotal, 200);
    assert.equal(res.body.discount.amount, 20);
    assert.equal(res.body.total, 180);

    const saved = ordersStore.get(res.body._id);
    assert.ok(saved, "order persisted in store");
    assert.equal(saved.discount.amount, 20);
    assert.equal(saved.total, 180);
  }
);

test(
  "Card preparation ignores discounts without a valid rule",
  { concurrency: false },
  async () => {
    resetState();

    const productId = new mongoose.Types.ObjectId().toString();
    const variantId = new mongoose.Types.ObjectId().toString();

    const variantDoc = {
      _id: variantId,
      product: productId,
      price: { amount: 150, discount: null },
      stock: { sku: "SKU987" },
      color: { images: [] },
    };
    variantResolver = (query) => {
      if (
        query?._id &&
        String(query._id) === variantId &&
        (!query.product || String(query.product) === productId)
      ) {
        return variantDoc;
      }
      return null;
    };

    productResolver = (id) => {
      if (String(id) === productId) {
        return {
          _id: productId,
          images: [],
          name: { ar: "عنصر", he: "Item" },
        };
      }
      return null;
    };

    discountResolver = () => null;

    const req = {
      body: {
        address: "Card Address",
        items: [
          {
            productId,
            variantId,
            quantity: 2,
          },
        ],
        guestInfo: { name: "Guest" },
        discount: {
          applied: true,
          ruleId: new mongoose.Types.ObjectId().toString(),
          amount: 75,
          type: "fixed",
          value: 75,
        },
      },
    };

    const res = createMockRes();
    await prepareCardHandler(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.total, 300);

    const saved = ordersStore.get(res.body._id);
    assert.ok(saved, "order persisted in store");
    assert.equal(saved.discount.amount, 0);
    assert.equal(saved.total, 300);
  }
);

test(
  "Lahza initialization uses the authoritative order total",
  { concurrency: false },
  async () => {
    resetState();

    const productId = new mongoose.Types.ObjectId().toString();
    const variantId = new mongoose.Types.ObjectId().toString();
    const ruleId = new mongoose.Types.ObjectId().toString();

    const variantDoc = {
      _id: variantId,
      product: productId,
      price: { amount: 120, discount: null },
      stock: { sku: "SKU555" },
      color: { images: [] },
    };
    variantResolver = (query) => {
      if (
        query?._id &&
        String(query._id) === variantId &&
        (!query.product || String(query.product) === productId)
      ) {
        return variantDoc;
      }
      return null;
    };

    productResolver = (id) => {
      if (String(id) === productId) {
        return {
          _id: productId,
          images: [],
          name: { ar: "منتج", he: "Product" },
        };
      }
      return null;
    };

    const discountRule = {
      _id: ruleId,
      type: "percent",
      value: 20,
      threshold: 100,
      isActive: true,
      name: "Twenty Percent",
    };
    discountResolver = (query) => {
      const threshold = query?.threshold?.$lte ?? Infinity;
      const eligible =
        threshold >= discountRule.threshold && discountRule.isActive;
      if (!eligible) return null;
      if (query?._id) {
        return String(query._id) === ruleId ? discountRule : null;
      }
      return discountRule;
    };

    const orderReq = {
      body: {
        address: "Pay Address",
        items: [
          {
            productId,
            variantId,
            quantity: 2,
          },
        ],
        paymentMethod: "cod",
        discount: {
          applied: true,
          ruleId,
          amount: 9999,
          type: "percent",
          value: 999,
        },
      },
    };

    const codRes = createMockRes();
    await codHandler(orderReq, codRes);
    const orderId = codRes.body._id;
    const expectedTotal = 192;

    const req = {
      body: {
        orderId,
        callback_url: "https://example.com/return",
        name: "Test User",
        email: "user@example.com",
        mobile: "+970500000000",
      },
    };

    const res = createMockRes();
    await lahzaCreateHandler(req, res);

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.authorization_url);
    assert.ok(res.body.reference);

    assert.ok(lastLahzaPayload, "Lahza payload captured");
    assert.equal(
      lastLahzaPayload.payload.amount,
      Math.round(expectedTotal * 100)
    );
    const metadata = JSON.parse(lastLahzaPayload.payload.metadata);
    assert.equal(metadata.expectedAmountMinor, Math.round(expectedTotal * 100));

    const saved = ordersStore.get(orderId);
    assert.equal(saved.total, expectedTotal);
    assert.equal(saved.reference, "lahza-ref-123");
    assert.equal(saved.paymentMethod, "card");
  }
);

test(
  "Admin pay accepts Lahza verification amounts returned in major units",
  { concurrency: false },
  async () => {
    resetState();

    const reference = "lahza-major-amount";
    const orderId = new mongoose.Types.ObjectId().toString();
    const baseOrder = {
      _id: orderId,
      reference,
      total: 120,
      subtotal: 120,
      discount: { amount: 0 },
      items: [],
      paymentStatus: "unpaid",
      paymentCurrency: "ILS",
      status: "waiting_confirmation",
    };
    ordersStore.set(orderId, baseOrder);

    const previousAxiosGet = axios.get;
    axios.get = async (url) => {
      assert.ok(
        url.includes(reference),
        "verification call should target the order reference"
      );
      return {
        data: {
          data: {
            status: "success",
            amount: 120,
            currency: "ILS",
            metadata: {
              expectedAmountMinor: 12000,
            },
            reference,
            id: "txn-120",
          },
        },
      };
    };

    const req = {
      params: { reference },
      user: { id: new mongoose.Types.ObjectId().toString(), role: "admin" },
    };
    const res = createMockRes();

    try {
      await adminPayHandler(req, res);
    } finally {
      axios.get = previousAxiosGet;
    }

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.paymentStatus, "paid");
    assert.equal(res.body.paymentVerifiedAmount, 120);

    const saved = ordersStore.get(orderId);
    assert.ok(saved, "order should remain stored");
    assert.equal(saved.paymentStatus, "paid");
    assert.equal(saved.paymentVerifiedAmount, 120);
  }
);
