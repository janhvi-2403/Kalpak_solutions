const http = require('http');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('===========================================================');
  console.log('📦 PHASE E VERIFICATION: Spare Parts & Multi-Location Stock');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${extra}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate as Acme Admin
    console.log('1. Authenticating as clientadmin@acme.com...');
    const loginRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 'clientadmin@acme.com',
        password: 'AcmeAdmin123!',
      },
    );

    assert('Login Status 200', loginRes.statusCode === 200);
    const cookies = loginRes.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.map((c) => c.split(';')[0]).join('; ') : '';
    assert('Session cookie received', Boolean(cookieHeader));

    const tenantId = loginRes.data.data?.activeTenantId || loginRes.data.data?.user?.defaultTenantId;
    const userId = loginRes.data.data?.user?.id;
    console.log(`   Tenant ID: ${tenantId}, User ID: ${userId}\n`);

    const authHeaders = {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'x-tenant-id': tenantId,
    };

    // 2. Storage Locations
    console.log('2. Testing Storage Locations...');
    const locsRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/inventory/locations',
      method: 'GET',
      headers: authHeaders,
    });
    assert('GET /inventory/locations returns 200', locsRes.statusCode === 200);
    const locList = locsRes.data.data || [];
    assert('Locations list is array', Array.isArray(locList));
    const centralWh = locList[0];
    assert('Default Central Warehouse exists', Boolean(centralWh));
    console.log(`   Default Location: ${centralWh.name} (${centralWh.code})`);

    // Create Service Van location
    const vanCode = `VAN-${Date.now().toString().slice(-4)}`;
    const createLocRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/locations',
        method: 'POST',
        headers: authHeaders,
      },
      {
        name: `Service Van Express ${vanCode}`,
        code: vanCode,
        type: 'SERVICE_VAN',
        address: 'Mobile Vehicle - Region West',
      },
    );
    assert('Create Service Van returns 201', createLocRes.statusCode === 201);
    const fieldVan = createLocRes.data.data;
    console.log(`   Created Location: ${fieldVan.name} (${fieldVan.code})\n`);

    // 3. Register Spare Parts
    console.log('3. Registering Spare Parts in Catalog...');
    const sku1 = `SP-BRG-${Date.now().toString().slice(-4)}`;
    const sku2 = `SP-SEAL-${Date.now().toString().slice(-4)}`;
    const sku3 = `SP-REL-${Date.now().toString().slice(-4)}`;

    // Part 1: Precision Ball Bearing
    const part1Res = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/parts',
        method: 'POST',
        headers: authHeaders,
      },
      {
        partNumber: sku1,
        name: 'Precision Spindle Bearing 7008-C',
        category: 'BEARINGS',
        unitOfMeasure: 'PIECE',
        unitPrice: 2450.0,
        costPrice: 1600.0,
        minStockAlert: 5,
        compatibleModels: ['VMC-850', 'HMC-630'],
        initialStock: 20,
        initialLocationId: centralWh.id,
      },
    );
    assert(`Create Part 1 (${sku1}) returns 201`, part1Res.statusCode === 201);
    const part1 = part1Res.data.data;
    assert('Initial stock for Part 1 is 20', part1.totalStock === 20);
    assert('Part 1 is not low stock', part1.isLowStock === false);

    // Part 2: High Temp Viton Oil Seal
    const part2Res = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/parts',
        method: 'POST',
        headers: authHeaders,
      },
      {
        partNumber: sku2,
        name: 'Viton High-Temperature Rotary Seal',
        category: 'SEALS_GASKETS',
        unitOfMeasure: 'PIECE',
        unitPrice: 580.0,
        costPrice: 320.0,
        minStockAlert: 10,
        compatibleModels: ['VMC-850', 'CNC-LATHE-200'],
        initialStock: 15,
        initialLocationId: fieldVan.id,
      },
    );
    assert(`Create Part 2 (${sku2}) returns 201`, part2Res.statusCode === 201);
    const part2 = part2Res.data.data;
    assert('Initial stock for Part 2 is 15 at field van', part2.totalStock === 15);

    // Part 3: Low stock relay
    const part3Res = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/parts',
        method: 'POST',
        headers: authHeaders,
      },
      {
        partNumber: sku3,
        name: '24V DC Solid State Safety Relay',
        category: 'ELECTRICAL',
        unitOfMeasure: 'PIECE',
        unitPrice: 1150.0,
        costPrice: 750.0,
        minStockAlert: 8,
        initialStock: 3, // Less than minStockAlert of 8 -> Should trigger low stock alert!
        initialLocationId: centralWh.id,
      },
    );
    assert(`Create Part 3 (${sku3}) returns 201`, part3Res.statusCode === 201);
    const part3 = part3Res.data.data;
    assert('Part 3 triggers low stock alert (3 <= 8)', part3.isLowStock === true);
    console.log(`   Part 3 Low Stock Warning correctly flagged (3 units <= 8 min)\n`);

    // 4. Inventory Summary & Metrics
    console.log('4. Testing GET /api/v1/inventory/summary...');
    const summaryRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/inventory/summary',
      method: 'GET',
      headers: authHeaders,
    });
    assert('Summary returns 200', summaryRes.statusCode === 200);
    const summary = summaryRes.data.data;
    assert('Total SKUs >= 3', summary.totalSkus >= 3);
    assert('Total units on hand >= 38', summary.totalUnitsOnHand >= 38);
    assert('Low stock count >= 1', summary.lowStockCount >= 1);
    assert('Total valuation positive', summary.totalValuation > 0);
    console.log(`   Summary: ${summary.totalSkus} SKUs, ${summary.totalUnitsOnHand} Units, Valuation: ₹${summary.totalValuation.toLocaleString('en-IN')}, Low Stock: ${summary.lowStockCount}\n`);

    // 5. Stock Adjustment (Restocking)
    console.log('5. Testing Stock Adjustment (POST /api/v1/inventory/adjust)...');
    const adjustRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/adjust',
        method: 'POST',
        headers: authHeaders,
      },
      {
        partId: part3.id,
        locationId: centralWh.id,
        transactionType: 'PURCHASE_RECEIPT',
        quantityDelta: 10,
        unitCost: 750.0,
        notes: 'Restocked safety relays from supplier PO-9988',
      },
    );
    assert('Stock adjust returns 200', adjustRes.statusCode === 200);
    assert('New stock for Part 3 is 13 (3 + 10)', adjustRes.data.data.currentStock === 13);

    // Verify Part 3 is no longer low stock
    const checkPart3 = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/inventory/parts/${part3.id}`,
      method: 'GET',
      headers: authHeaders,
    });
    assert('Part 3 is now adequately stocked (13 > 8)', checkPart3.data.data.isLowStock === false);

    // 6. Test Parts Consumption on a Service Ticket
    console.log('\n6. Setting up Service Ticket for parts allocation...');
    const ticketRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/tickets',
        method: 'POST',
        headers: authHeaders,
      },
      {
        title: 'Spindle Noise & Excessive Heat during High RPM',
        description: 'Requires bearing replacement and seal inspection on site.',
        priority: 'HIGH',
      },
    );
    assert('Test ticket created returns 201', ticketRes.statusCode === 201);
    const ticket = ticketRes.data.data;
    console.log(`   Ticket: ${ticket.ticketNumber} (${ticket.id})`);

    // 6a. Consume Billable Part (2x Spindle Bearings from Central Warehouse)
    console.log('\n7. Consuming 2x Billable Bearings...');
    const consume1Res = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/consume',
        method: 'POST',
        headers: authHeaders,
      },
      {
        ticketId: ticket.id,
        partId: part1.id,
        locationId: centralWh.id,
        quantity: 2,
        isWarrantyCovered: false,
        notes: 'Replaced worn front and rear spindle bearings',
      },
    );
    assert('Consume Part 1 returns 201', consume1Res.statusCode === 201);
    const c1 = consume1Res.data.data;
    assert('Quantity consumed is 2', c1.quantity === 2);
    assert('Total billed is ₹4,900.00 (2 x ₹2,450)', Number(c1.totalAmount) === 4900.0);
    assert('Warranty covered is false', c1.isWarrantyCovered === false);

    // Verify stock decremented at central warehouse (20 - 2 = 18)
    const part1StockCheck = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/inventory/parts/${part1.id}`,
      method: 'GET',
      headers: authHeaders,
    });
    assert('Part 1 total stock decremented to 18', part1StockCheck.data.data.totalStock === 18);

    // 6b. Consume Warranty Part (1x Viton Seal from Service Van)
    console.log('\n8. Consuming 1x Warranty-Covered Seal...');
    const consume2Res = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/consume',
        method: 'POST',
        headers: authHeaders,
      },
      {
        ticketId: ticket.id,
        partId: part2.id,
        locationId: fieldVan.id,
        quantity: 1,
        isWarrantyCovered: true,
        notes: 'Seal failed under warranty period - waived to customer',
      },
    );
    assert('Consume Part 2 returns 201', consume2Res.statusCode === 201);
    const c2 = consume2Res.data.data;
    assert('Warranty covered is true', c2.isWarrantyCovered === true);
    assert('Customer billable total is ₹0.00', Number(c2.totalAmount) === 0.0);

    // Verify stock decremented at field van (15 - 1 = 14)
    const part2StockCheck = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/inventory/parts/${part2.id}`,
      method: 'GET',
      headers: authHeaders,
    });
    assert('Part 2 stock decremented to 14', part2StockCheck.data.data.totalStock === 14);

    // 7. Verify Ticket Billing Breakdown & Calculations
    console.log('\n9. Testing GET /api/v1/inventory/consumptions/by-ticket/:ticketId...');
    const billRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/inventory/consumptions/by-ticket/${ticket.id}`,
      method: 'GET',
      headers: authHeaders,
    });
    assert('Get ticket consumptions returns 200', billRes.statusCode === 200);
    const billData = billRes.data.data;
    assert('2 consumptions recorded', billData.consumptions.length === 2);
    assert('3 total units consumed', billData.partsCount === 3);
    assert('Subtotal is ₹5,480.00 (2x2450 + 1x580)', billData.subtotal === 5480.0);
    assert('Warranty discount is ₹580.00', billData.warrantyDiscount === 580.0);
    assert('Total billable to customer is ₹4,900.00', billData.totalBillable === 4900.0);
    console.log(`   Billing calculation verified: Subtotal ₹${billData.subtotal} - Warranty ₹${billData.warrantyDiscount} = Net ₹${billData.totalBillable}`);

    // 8. Test Insufficient Stock Rejection
    console.log('\n10. Testing Insufficient Stock Rejection...');
    const overConsumeRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/consume',
        method: 'POST',
        headers: authHeaders,
      },
      {
        ticketId: ticket.id,
        partId: part1.id,
        locationId: centralWh.id,
        quantity: 9999, // Way more than 18
      },
    );
    assert('Excessive quantity throws 400 Bad Request', overConsumeRes.statusCode === 400);
    console.log(`   Correctly rejected: ${overConsumeRes.data.message || 'Insufficient stock'}`);

    // 9. Verify Ticket Timeline Audit
    console.log('\n11. Verifying Ticket Timeline Audit Entry...');
    const ticketDetail = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/tickets/${ticket.id}`,
      method: 'GET',
      headers: authHeaders,
    });
    assert('Ticket detail retrieved', ticketDetail.statusCode === 200);
    const timeline = ticketDetail.data.data.timeline || [];
    const partTimelineEntry = timeline.find((t) => t.metadata && t.metadata.event === 'PART_CONSUMED');
    assert('Ticket timeline contains PART_CONSUMED audit entry', Boolean(partTimelineEntry));
    console.log(`   Timeline Note: "${partTimelineEntry?.note}"`);

    // 10. Test Voiding / Reverting a Consumption
    console.log('\n12. Testing Reverting / Voiding a Consumption...');
    const revertRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/inventory/consumptions/${c1.id}`,
      method: 'DELETE',
      headers: authHeaders,
    });
    assert('Void consumption returns 200', revertRes.statusCode === 200);

    // Verify stock restored (18 + 2 = 20)
    const part1RestoredCheck = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/inventory/parts/${part1.id}`,
      method: 'GET',
      headers: authHeaders,
    });
    assert('Part 1 stock restored to 20', part1RestoredCheck.data.data.totalStock === 20);

    // Verify updated billing
    const updatedBillRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/inventory/consumptions/by-ticket/${ticket.id}`,
      method: 'GET',
      headers: authHeaders,
    });
    assert('Only 1 consumption remains after void', updatedBillRes.data.data.consumptions.length === 1);
    assert('Only warranty item remains, total billable is now ₹0.00', updatedBillRes.data.data.totalBillable === 0.0);

    console.log('\n===========================================================');
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed (${Math.round((passed / (passed + failed)) * 100)}%)`);
    console.log('===========================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  }
}

run();
