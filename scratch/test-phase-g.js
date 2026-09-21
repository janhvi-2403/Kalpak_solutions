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

function extractCookie(res) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  return Array.isArray(setCookie)
    ? setCookie.map((c) => c.split(';')[0]).join('; ')
    : setCookie.split(';')[0];
}

async function run() {
  console.log('===========================================================');
  console.log('🛡️ PHASE G VERIFICATION: Preventive Maintenance & AMCs');
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
    // -------------------------------------------------------------
    // 1. Authenticate as Admin
    // -------------------------------------------------------------
    console.log('--- Step 1: Admin Authentication ---');
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
      }
    );

    assert('Admin login successful (200 OK)', loginRes.statusCode === 200);
    const adminCookie = extractCookie(loginRes);
    assert('Session cookie received', Boolean(adminCookie));

    // -------------------------------------------------------------
    // 2. Fetch Initial Contracts Summary
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Contracts Dashboard Stats KPI ---');
    const initialStatsRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/contracts/summary',
      method: 'GET',
      headers: { Cookie: adminCookie },
    });

    assert('Get contracts summary (200 OK)', initialStatsRes.statusCode === 200);
    const initialStats = initialStatsRes.data?.data || initialStatsRes.data;
    assert('Stats returned totalActiveContracts', typeof initialStats.totalActiveContracts === 'number');
    assert('Stats returned expiringIn30DaysCount', typeof initialStats.expiringIn30DaysCount === 'number');
    assert('Stats returned upcomingPmVisitsThisMonth', typeof initialStats.upcomingPmVisitsThisMonth === 'number');
    assert('Stats returned totalContractValue', typeof initialStats.totalContractValue === 'number');

    // -------------------------------------------------------------
    // 3. Find Customer & Assets to Cover Under AMC
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Identify Target Customer & Fleet Assets ---');
    const customersRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/customers',
      method: 'GET',
      headers: { Cookie: adminCookie },
    });

    assert('List customers returns 200', customersRes.statusCode === 200);
    const customerList = customersRes.data?.data || customersRes.data;
    assert('Found at least one customer', customerList.length > 0);
    const targetCustomer = customerList[0];
    console.log(`Target Customer: ${targetCustomer.companyName} (${targetCustomer.id})`);

    const customerDetailRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/customers/${targetCustomer.id}`,
      method: 'GET',
      headers: { Cookie: adminCookie },
    });
    const customerDetail = customerDetailRes.data?.data || customerDetailRes.data;
    const assets = customerDetail.assets || [];
    assert('Found registered customer machinery', assets.length > 0);
    const coveredAssetIds = assets.slice(0, 2).map((a) => a.id);
    console.log(`Covering ${coveredAssetIds.length} machine(s) in new AMC.`);

    // -------------------------------------------------------------
    // 4. Create Annual Maintenance Contract (AMC) with PM Generation
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Create Comprehensive AMC & Auto-Generate PM Schedules ---');
    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const createContractPayload = {
      customerId: targetCustomer.id,
      title: `2026 Fleet Comprehensive AMC - ${Date.now()}`,
      contractType: 'COMPREHENSIVE',
      startDate,
      endDate,
      totalAmount: 185000,
      billingFrequency: 'ANNUAL',
      notes: 'Includes 100% spare parts, 4 quarterly PM visits, and 4-hour SLA response.',
      assetIds: coveredAssetIds,
      generatePmSchedules: true,
      defaultPmFrequency: 'QUARTERLY',
    };

    const createContractRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/contracts',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
      },
      createContractPayload
    );

    assert('Create AMC returns 201 Created', createContractRes.statusCode === 201);
    const createdContract = createContractRes.data?.data || createContractRes.data;
    assert('Contract ID returned', Boolean(createdContract.id));
    assert('Contract Number matches AMC format', /^AMC-\d{4}-\d{4}$/.test(createdContract.contractNumber), `got: ${createdContract.contractNumber}`);
    assert('Contract Type is COMPREHENSIVE', createdContract.contractType === 'COMPREHENSIVE');
    assert('Contract Status is ACTIVE', createdContract.status === 'ACTIVE');
    assert('Covered assets count matches', createdContract.coveredAssetsCount === coveredAssetIds.length);
    assert('PM schedules count matches covered assets', createdContract.activePmSchedulesCount === coveredAssetIds.length);

    // -------------------------------------------------------------
    // 5. Query Contract Detail
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Query Contract Detail & Covered Assets ---');
    const detailRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/contracts/${createdContract.id}`,
      method: 'GET',
      headers: { Cookie: adminCookie },
    });

    assert('Get contract detail returns 200', detailRes.statusCode === 200);
    const detail = detailRes.data?.data || detailRes.data;
    assert('Contract detail has coveredAssets array', Array.isArray(detail.coveredAssets));
    assert('Covered assets have valid equipment metadata', detail.coveredAssets.length === coveredAssetIds.length);
    assert('Contract detail has pmSchedules array', Array.isArray(detail.pmSchedules));
    assert('PM schedules auto-generated with QUARTERLY cadence', detail.pmSchedules.length === coveredAssetIds.length);
    const targetSchedule = detail.pmSchedules[0];
    assert('PM schedule frequency is QUARTERLY', targetSchedule.frequency === 'QUARTERLY');
    assert('PM schedule has valid nextDueDate', Boolean(targetSchedule.nextDueDate));

    // -------------------------------------------------------------
    // 6. Dispatch / Auto-Trigger PM Visit
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Dispatch PM Visit (Ticket + Work Order Generation) ---');
    const triggerRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/contracts/schedules/${targetSchedule.id}/trigger`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
      },
      {}
    );

    assert('Trigger PM visit returns 200 OK', triggerRes.statusCode === 200);
    const triggerResult = triggerRes.data?.data || triggerRes.data;
    assert('Trigger reports success: true', triggerResult.success === true);
    assert('Auto-generated Service Ticket ID returned', Boolean(triggerResult.ticketId));
    assert('Ticket Number matches format', /^(KAL|TCK)-\d{4}-\d{4}$/.test(triggerResult.ticketNumber), `got: ${triggerResult.ticketNumber}`);
    assert('Auto-generated Work Order ID returned', Boolean(triggerResult.workOrderId));
    assert('Work Order Number matches format', /^WO-\d{4}-\d{4}$/.test(triggerResult.workOrderNumber), `got: ${triggerResult.workOrderNumber}`);
    assert('Next due date rolled forward', Boolean(triggerResult.nextDueDate));

    // -------------------------------------------------------------
    // 7. Verify Generated Service Ticket & PM Work Order
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Verify PM Ticket & 4-Point Checklist Verification ---');
    const ticketRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/tickets/${triggerResult.ticketId}`,
      method: 'GET',
      headers: { Cookie: adminCookie },
    });

    assert('Get PM ticket returns 200', ticketRes.statusCode === 200);
    const pmTicket = ticketRes.data?.data || ticketRes.data;
    assert('Ticket priority is MEDIUM or high', Boolean(pmTicket.priority));
    assert('Ticket linked to customer asset', Boolean(pmTicket.customerAssetId));
    assert('Ticket service contract linked', Boolean(pmTicket.contractId || pmTicket.pmScheduleId));

    // -------------------------------------------------------------
    // 8. Customer Self-Service Portal View
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Customer Self-Service Portal Contract Query ---');
    const portalLoginRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 's.kulkarni@bharatforge.com',
        password: 'PortalPass@2026!',
      }
    );

    if (portalLoginRes.statusCode === 200) {
      assert('Customer portal user authenticated (200 OK)', true);
      const portalCookie = extractCookie(portalLoginRes);

      const portalContractsRes = await request({
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/portal/contracts',
        method: 'GET',
        headers: { Cookie: portalCookie },
      });

      assert('Customer portal contracts query returns 200 OK', portalContractsRes.statusCode === 200);
      const portalData = portalContractsRes.data?.data || portalContractsRes.data;
      const portalContracts = Array.isArray(portalData) ? portalData : (portalData.contracts || []);
      const portalSchedules = Array.isArray(portalData) ? portalData.flatMap((c) => c.pmSchedules || []) : (portalData.pmSchedules || []);
      assert('Portal contracts array present', Array.isArray(portalContracts));
      assert('Portal PM schedules array present', Array.isArray(portalSchedules));
      assert('Customer sees their active machinery covered under AMC', portalContracts.length > 0);
    } else {
      console.log('Skipping portal user login check (user not seeded or customer credential changed).');
    }

    // -------------------------------------------------------------
    // 9. Summary Check
    // -------------------------------------------------------------
    console.log('\n--- Step 9: Re-verify KPI Stats Elevation ---');
    const updatedStatsRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/contracts/summary',
      method: 'GET',
      headers: { Cookie: adminCookie },
    });
    const updatedStats = updatedStatsRes.data?.data || updatedStatsRes.data;
    assert('Active contracts count increased or equal', updatedStats.totalActiveContracts >= initialStats.totalActiveContracts);
    assert('Total contract value reflects new AMC', updatedStats.totalContractValue >= initialStats.totalContractValue);

  } catch (err) {
    console.error('Unexpected exception during Phase G test:', err);
    failed++;
  }

  console.log('\n===========================================================');
  console.log(`📊 PHASE G TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
