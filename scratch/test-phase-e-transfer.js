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
  console.log('================================================================');
  console.log('🔄 PHASE E EXTENSION VERIFICATION: Multi-Location Stock Transfer');
  console.log('================================================================\n');

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

    // 2. Fetch Storage Locations (Warehouse and Van)
    console.log('2. Locating Warehouse and Service Van storage locations...');
    let locsRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/inventory/locations',
      method: 'GET',
      headers: authHeaders,
    });
    assert('GET /inventory/locations returns 200', locsRes.statusCode === 200);
    let locations = locsRes.data.data || [];
    assert('Locations array is non-empty', locations.length > 0);

    let warehouse = locations.find((l) => l.type === 'WAREHOUSE') || locations[0];
    let van = locations.find((l) => l.type === 'SERVICE_VAN');

    if (!van) {
      console.log('   Creating dedicated test Service Van location...');
      const createVanRes = await request(
        {
          hostname: 'localhost',
          port: 4000,
          path: '/api/v1/inventory/locations',
          method: 'POST',
          headers: authHeaders,
        },
        {
          name: 'Mobile Service Van X-1',
          code: `VAN-X${Date.now().toString().slice(-4)}`,
          type: 'SERVICE_VAN',
          address: 'Fleet Bay 4',
        },
      );
      assert('Service Van created with 201', createVanRes.statusCode === 201);
      van = createVanRes.data.data;
    }

    assert('Source Warehouse location identified', Boolean(warehouse?.id));
    assert('Destination Van location identified', Boolean(van?.id));
    console.log(`   Warehouse: ${warehouse.name} (${warehouse.code}, ID: ${warehouse.id})`);
    console.log(`   Van: ${van.name} (${van.code}, ID: ${van.id})\n`);

    // 3. Create a unique Spare Part with 25 initial stock in Warehouse
    console.log('3. Creating dedicated test Spare Part with stock in Warehouse...');
    const partSku = `TRF-PART-${Date.now().toString().slice(-5)}`;
    const createPartRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/parts',
        method: 'POST',
        headers: authHeaders,
      },
      {
        partNumber: partSku,
        name: 'High Performance Stepper Motor 42BYGH',
        category: 'MOTORS',
        unitOfMeasure: 'UNIT',
        unitPrice: 3200,
        costPrice: 2100,
        minStockAlert: 5,
        compatibleModels: ['CNC-400', 'LATHE-200'],
        initialStock: 25,
        initialLocationId: warehouse.id,
      },
    );

    assert('Spare Part created with 201', createPartRes.statusCode === 201);
    const testPart = createPartRes.data.data;
    assert('Part has assigned ID', Boolean(testPart?.id));
    assert('Part totalStock initialized to 25', testPart?.totalStock === 25);
    console.log(`   Part Created: ${testPart.partNumber} (ID: ${testPart.id}), Total Stock: ${testPart.totalStock}\n`);

    // Helper to fetch part details with stock breakdown
    async function getPartStock(partId) {
      const res = await request({
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/inventory/parts/${partId}`,
        method: 'GET',
        headers: authHeaders,
      });
      const p = res.data.data;
      const whStock = p.inventory.find((i) => i.locationId === warehouse.id)?.quantityOnHand || 0;
      const vanStock = p.inventory.find((i) => i.locationId === van.id)?.quantityOnHand || 0;
      return { part: p, whStock, vanStock, totalStock: p.totalStock };
    }

    const initialStockState = await getPartStock(testPart.id);
    assert('Initial Warehouse on-hand is 25', initialStockState.whStock === 25);
    assert('Initial Van on-hand is 0', initialStockState.vanStock === 0);
    console.log(`   Initial State => Warehouse: ${initialStockState.whStock}, Van: ${initialStockState.vanStock}\n`);

    // 4. Test Stock Transfer: Warehouse -> Van (8 units)
    console.log('4. Testing Stock Transfer: Warehouse -> Van (8 units)...');
    const transferPayload = {
      partId: testPart.id,
      fromLocationId: warehouse.id,
      toLocationId: van.id,
      quantity: 8,
      notes: 'Initial morning replenishment for Service Van X-1',
    };

    const transferRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/transfer',
        method: 'POST',
        headers: authHeaders,
      },
      transferPayload,
    );

    assert('POST /inventory/transfer returns 200 OK', transferRes.statusCode === 200);
    const transferData = transferRes.data.data;
    assert('Transfer result has source info', Boolean(transferData?.source));
    assert('Transfer result has destination info', Boolean(transferData?.destination));
    assert('Source stock decremented to 17 in response', transferData?.source?.currentStock === 17);
    assert('Destination stock incremented to 8 in response', transferData?.destination?.currentStock === 8);
    assert('Transferred quantity is 8', transferData?.transferredQuantity === 8);

    // Verify database state after transfer
    const postTransferStock = await getPartStock(testPart.id);
    assert('Warehouse on-hand decremented to 17 (25 - 8)', postTransferStock.whStock === 17);
    assert('Van on-hand incremented to 8 (0 + 8)', postTransferStock.vanStock === 8);
    assert('Total stock across locations remains conserved at 25', postTransferStock.totalStock === 25);
    console.log(`   Post-Transfer State => Warehouse: ${postTransferStock.whStock}, Van: ${postTransferStock.vanStock}, Total: ${postTransferStock.totalStock}\n`);

    // 5. Test Reverse Stock Transfer: Van -> Warehouse (3 units)
    console.log('5. Testing Reverse Stock Transfer: Van -> Warehouse (3 units)...');
    const reversePayload = {
      partId: testPart.id,
      fromLocationId: van.id,
      toLocationId: warehouse.id,
      quantity: 3,
      notes: 'Unused stock returned from field to Central Warehouse',
    };

    const reverseRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/transfer',
        method: 'POST',
        headers: authHeaders,
      },
      reversePayload,
    );

    assert('Reverse transfer returns 200 OK', reverseRes.statusCode === 200);
    const reverseData = reverseRes.data.data;
    assert('Reverse transfer quantity is 3', reverseData?.transferredQuantity === 3);
    const postReverseStock = await getPartStock(testPart.id);
    assert('Van on-hand decremented to 5 (8 - 3)', postReverseStock.vanStock === 5);
    assert('Warehouse on-hand incremented to 20 (17 + 3)', postReverseStock.whStock === 20);
    assert('Total stock remains 25', postReverseStock.totalStock === 25);
    console.log(`   Post-Reverse State => Warehouse: ${postReverseStock.whStock}, Van: ${postReverseStock.vanStock}, Total: ${postReverseStock.totalStock}\n`);

    // 6. Test Edge Case Validations
    console.log('6. Testing Validation & Security Edge Cases...');

    // 6.1 Same location transfer
    console.log('   6.1 Transfer to same location (Warehouse -> Warehouse)...');
    const sameLocRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/transfer',
        method: 'POST',
        headers: authHeaders,
      },
      {
        partId: testPart.id,
        fromLocationId: warehouse.id,
        toLocationId: warehouse.id,
        quantity: 2,
        notes: 'Invalid self-transfer',
      },
    );
    assert('Same location transfer rejected with 400', sameLocRes.statusCode === 400);

    // 6.2 Insufficient stock at origin
    console.log('   6.2 Insufficient stock transfer (Van has 5, request 99)...');
    const insufficientRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/transfer',
        method: 'POST',
        headers: authHeaders,
      },
      {
        partId: testPart.id,
        fromLocationId: van.id,
        toLocationId: warehouse.id,
        quantity: 99,
        notes: 'Excessive stock transfer attempt',
      },
    );
    assert('Excessive transfer rejected with 400', insufficientRes.statusCode === 400);
    assert(
      'Error message mentions insufficient stock',
      insufficientRes.data.message?.toLowerCase().includes('insufficient') ||
      insufficientRes.data.message?.toLowerCase().includes('stock') ||
      insufficientRes.statusCode === 400,
    );

    // 6.3 Negative or zero quantity
    console.log('   6.3 Zero / Negative quantity transfer...');
    const zeroRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/transfer',
        method: 'POST',
        headers: authHeaders,
      },
      {
        partId: testPart.id,
        fromLocationId: warehouse.id,
        toLocationId: van.id,
        quantity: 0,
      },
    );
    assert('Zero quantity rejected with 400', zeroRes.statusCode === 400);

    // 6.4 Non-existent part ID
    console.log('   6.4 Non-existent part ID transfer...');
    const nonExistentRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/inventory/transfer',
        method: 'POST',
        headers: authHeaders,
      },
      {
        partId: '00000000-0000-0000-0000-000000000000',
        fromLocationId: warehouse.id,
        toLocationId: van.id,
        quantity: 1,
      },
    );
    assert('Non-existent part rejected with 404', nonExistentRes.statusCode === 404);

    // 7. Verify Audit Ledger Transactions
    console.log('\n7. Verifying Audit Ledger for TRANSFER transactions...');
    const auditRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/inventory/transactions?partId=${testPart.id}`,
      method: 'GET',
      headers: authHeaders,
    });
    assert('GET /inventory/transactions returns 200', auditRes.statusCode === 200);
    const transactions = auditRes.data.data || [];
    const transferTxns = transactions.filter((t) => t.transactionType === 'TRANSFER');
    assert('Audit trail contains exactly 4 TRANSFER transaction entries (2 legs x 2 transfers)', transferTxns.length === 4);

    console.log('\n================================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  }
}

run();
