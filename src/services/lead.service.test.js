const {
  isNonEmptyString,
  parsePositiveInteger,
  parseDate,
  calculateAge,
  toMinutes,
  mapDeliveryWithCapacity,
  mapLeadResponse,
  findEligibleDeliveries,
} = require("./lead.service");

describe("lead.service helpers", () => {
  describe("isNonEmptyString", () => {
    test("returns true for non-empty strings", () => {
      expect(isNonEmptyString("hello")).toBe(true);
      expect(isNonEmptyString("  hello  ")).toBe(true);
    });

    test("returns false for empty or whitespace-only strings", () => {
      expect(isNonEmptyString("")).toBe(false);
      expect(isNonEmptyString("   ")).toBe(false);
    });

    test("returns false for non-string values", () => {
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
    });
  });

  describe("parsePositiveInteger", () => {
    test("returns the number for positive integers", () => {
      expect(parsePositiveInteger(5)).toBe(5);
      expect(parsePositiveInteger("10")).toBe(10);
    });

    test("returns null for invalid values", () => {
      expect(parsePositiveInteger(0)).toBe(null);
      expect(parsePositiveInteger(-1)).toBe(null);
      expect(parsePositiveInteger("abc")).toBe(null);
      expect(parsePositiveInteger(null)).toBe(null);
    });
  });

  describe("parseDate", () => {
    test("returns a Date for valid date strings", () => {
      const date = parseDate("1990-05-15");
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(1990);
      expect(date.getMonth()).toBe(4);
      expect(date.getDate()).toBe(15);
    });

    test("returns null for invalid dates", () => {
      expect(parseDate("1990-02-30")).toBe(null);
      expect(parseDate("not-a-date")).toBe(null);
      expect(parseDate("")).toBe(null);
    });
  });

  describe("calculateAge", () => {
    test("calculates age correctly when birthday has passed this year", () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 30, today.getMonth() - 1, 1);
      expect(calculateAge(birthDate)).toBe(30);
    });

    test("calculates age correctly when birthday has not passed this year", () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 30, today.getMonth() + 1, 1);
      expect(calculateAge(birthDate)).toBe(29);
    });
  });

  describe("toMinutes", () => {
    test("converts HH:MM to minutes", () => {
      expect(toMinutes("09:00")).toBe(540);
      expect(toMinutes("18:30")).toBe(1110);
    });
  });
});

describe("mapDeliveryWithCapacity", () => {
  test("includes remainingCapacity", () => {
    const delivery = {
      id: 1,
      clientId: 2,
      verticalId: 3,
      minAge: 18,
      maxAge: 65,
      capacity: 5,
      price: 25.5,
      client: { id: 2, name: "AXA" },
      vertical: { id: 3, name: "Auto" },
      postalCodes: [],
      timeSlots: [],
    };
    const countMap = new Map();
    const result = mapDeliveryWithCapacity(delivery, countMap);
    expect(result.remainingCapacity).toBe(5);
    expect(result.price).toBe(25.5);
  });
});

describe("mapLeadResponse", () => {
  test("maps assignedDelivery to delivery", () => {
    const lead = {
      id: 1,
      firstName: "Jean",
      lastName: "Dupont",
      birthDate: new Date("1990-05-15"),
      postalCode: "75001",
      verticalId: 3,
      vertical: { id: 3, name: "Auto" },
      status: "DISTRIBUTED",
      assignedDeliveryId: 2,
      distributedAt: new Date(),
      pricePaid: 25.5,
      assignedDelivery: {
        id: 2,
        clientId: 4,
        verticalId: 3,
        minAge: 18,
        maxAge: 65,
        capacity: 5,
        price: 25.5,
        client: { id: 4, name: "AXA" },
        vertical: { id: 3, name: "Auto" },
        postalCodes: [],
        timeSlots: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = mapLeadResponse(lead);
    expect(result.delivery).not.toBeNull();
    expect(result.delivery.id).toBe(2);
    expect(result.pricePaid).toBe(25.5);
  });

  test("handles null assignedDelivery", () => {
    const lead = {
      id: 1,
      firstName: "Jean",
      lastName: "Dupont",
      birthDate: new Date("1990-05-15"),
      postalCode: "75001",
      verticalId: 3,
      vertical: { id: 3, name: "Auto" },
      status: "NOT_DISTRIBUTED",
      assignedDeliveryId: null,
      distributedAt: null,
      pricePaid: null,
      assignedDelivery: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = mapLeadResponse(lead);
    expect(result.delivery).toBeNull();
    expect(result.pricePaid).toBe(null);
  });
});

describe("findEligibleDeliveries", () => {
  const makeDelivery = (overrides = {}) => ({
    id: 1,
    clientId: 1,
    verticalId: 1,
    minAge: 18,
    maxAge: 65,
    capacity: 2,
    price: 20,
    client: { id: 1, name: "AXA", company: "AXA France" },
    vertical: { id: 1, name: "Assurance Auto" },
    postalCodes: [{ postalCode: "75001" }],
    timeSlots: [{ startTime: "00:00", endTime: "23:59" }],
    ...overrides,
  });

  const createMockTransaction = ({ deliveries = [], distributedCounts = [] } = {}) => ({
    delivery: {
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(
          deliveries.filter((d) => {
            if (where.verticalId && d.verticalId !== where.verticalId) return false;
            if (where.minAge?.lte !== undefined && d.minAge > where.minAge.lte) return false;
            if (where.maxAge?.gte !== undefined && d.maxAge < where.maxAge.gte) return false;
            return true;
          })
        );
      }),
    },
    lead: {
      groupBy: jest.fn().mockResolvedValue(distributedCounts),
    },
  });

  test("returns delivery matching age, postal code and time", async () => {
    const deliveries = [makeDelivery()];
    const tx = createMockTransaction({ deliveries, distributedCounts: [] });
    const { eligible } = await findEligibleDeliveries(tx, {
      age: 30,
      postalCode: "75001",
      verticalId: 1,
    });
    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe(1);
  });

  test("excludes delivery when age is out of range", async () => {
    const deliveries = [makeDelivery({ minAge: 30, maxAge: 40 })];
    const tx = createMockTransaction({ deliveries, distributedCounts: [] });
    const { eligible } = await findEligibleDeliveries(tx, {
      age: 25,
      postalCode: "75001",
      verticalId: 1,
    });
    expect(eligible).toHaveLength(0);
  });

  test("excludes delivery when postal code does not match", async () => {
    const deliveries = [makeDelivery()];
    const tx = createMockTransaction({ deliveries, distributedCounts: [] });
    const { eligible } = await findEligibleDeliveries(tx, {
      age: 30,
      postalCode: "69001",
      verticalId: 1,
    });
    expect(eligible).toHaveLength(0);
  });

  test("excludes delivery at full capacity", async () => {
    const deliveries = [makeDelivery({ capacity: 2 })];
    const distributedCounts = [{ assignedDeliveryId: 1, _count: { _all: 2 } }];
    const tx = createMockTransaction({ deliveries, distributedCounts });
    const { eligible } = await findEligibleDeliveries(tx, {
      age: 30,
      postalCode: "75001",
      verticalId: 1,
    });
    expect(eligible).toHaveLength(0);
  });

  test("sorts by price descending", async () => {
    const deliveries = [
      makeDelivery({ id: 1, price: 20 }),
      makeDelivery({ id: 2, price: 30 }),
    ];
    const tx = createMockTransaction({ deliveries, distributedCounts: [] });
    const { eligible } = await findEligibleDeliveries(tx, {
      age: 30,
      postalCode: "75001",
      verticalId: 1,
    });
    expect(eligible[0].id).toBe(2);
    expect(eligible[1].id).toBe(1);
  });

  test("sorts by load ascending when prices are equal", async () => {
    const deliveries = [
      makeDelivery({ id: 1, price: 25 }),
      makeDelivery({ id: 2, price: 25 }),
    ];
    const distributedCounts = [
      { assignedDeliveryId: 1, _count: { _all: 1 } },
      { assignedDeliveryId: 2, _count: { _all: 0 } },
    ];
    const tx = createMockTransaction({ deliveries, distributedCounts });
    const { eligible } = await findEligibleDeliveries(tx, {
      age: 30,
      postalCode: "75001",
      verticalId: 1,
    });
    expect(eligible[0].id).toBe(2);
    expect(eligible[1].id).toBe(1);
  });

  test("sorts by id ascending when price and load are equal", async () => {
    const deliveries = [
      makeDelivery({ id: 2, price: 25 }),
      makeDelivery({ id: 1, price: 25 }),
    ];
    const tx = createMockTransaction({ deliveries, distributedCounts: [] });
    const { eligible } = await findEligibleDeliveries(tx, {
      age: 30,
      postalCode: "75001",
      verticalId: 1,
    });
    expect(eligible[0].id).toBe(1);
    expect(eligible[1].id).toBe(2);
  });
});
