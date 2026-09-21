/**
 * Phase D Automated Verification Suite
 * Field Service, Work Orders, Checklists & Customer Sign-Off
 */
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
  console.log('🔧 PHASE D VERIFICATION: Field Service, Work Orders & Sign-Off');
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
    console.log(`   Tenant ID: ${tenantId}, User ID: ${userId}`);

    const authHeaders = {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'x-tenant-id': tenantId,
    };

    // 2. Fetch customers & assets for testing
    console.log('\n2. Fetching Customer & Asset directory...');
    const custRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/customers?pageSize=1',
      method: 'GET',
      headers: authHeaders,
    });
    const customer = (custRes.data.data?.data || custRes.data.data || [])[0];
    assert('Customer found', Boolean(customer?.id));

    // 3. Create a Service Ticket for Field Service
    console.log('\n3. Creating Service Ticket for Field Service dispatch...');
    const createTicketRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/tickets',
        method: 'POST',
        headers: authHeaders,
      },
      {
        title: `CNC Spindle Bearing Overhaul #${Date.now()}`,
        description: 'Customer reports abnormal acoustic vibration and excessive thermal gradient (>85C) under continuous spindle load.',
        priority: 'HIGH',
        raisedBy: 'EMPLOYEE',
        raisedForCustomerId: customer.id,
      },
    );
    assert('Ticket created with 201', createTicketRes.statusCode === 201);
    const ticket = createTicketRes.data.data;
    console.log(`   Ticket Number: ${ticket.ticketNumber} (${ticket.id})`);

    // Move ticket to ASSIGNED
    await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/tickets/${ticket.id}/assign`,
        method: 'PATCH',
        headers: authHeaders,
      },
      {
        assignedToUserId: userId,
        note: 'Assigned for field service visit',
      },
    );

    // Move ticket to IN_PROGRESS
    await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/tickets/${ticket.id}/status`,
        method: 'PATCH',
        headers: authHeaders,
      },
      {
        status: 'IN_PROGRESS',
        note: 'Starting field diagnosis',
      },
    );

    // 4. Create Work Order (POST /api/v1/work-orders)
    console.log('\n4. Testing POST /api/v1/work-orders (Schedule Field Visit)...');
    const scheduledDate = new Date(Date.now() + 86400000).toISOString();
    const createWoRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/work-orders',
        method: 'POST',
        headers: authHeaders,
      },
      {
        ticketId: ticket.id,
        assignedTechnicianId: userId,
        scheduledDate,
        serviceType: 'ON_SITE_REPAIR',
        technicianNotes: 'Execute spindle bearing disassembly, clean race, measure thermal gradient, verify runout.',
      },
    );

    assert('Create Work Order returns 201', createWoRes.statusCode === 201);
    const workOrder = createWoRes.data.data;
    assert('Work Order Number generated (WO-*)', Boolean(workOrder?.orderNumber && workOrder.orderNumber.startsWith('WO-')));
    assert('Status is SCHEDULED', workOrder?.status === 'SCHEDULED');
    assert('Default checklist items generated', Array.isArray(workOrder?.checklistItems) && workOrder.checklistItems.length >= 5);
    console.log(`   Work Order: ${workOrder.orderNumber} (Items: ${workOrder.checklistItems.length})`);

    // 5. Query Work Orders by Ticket (GET /api/v1/work-orders/by-ticket/:ticketId)
    console.log('\n5. Testing GET /api/v1/work-orders/by-ticket/:ticketId...');
    const getByTicketRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/work-orders/by-ticket/${ticket.id}`,
      method: 'GET',
      headers: authHeaders,
    });
    assert('Get by ticket returns 200', getByTicketRes.statusCode === 200);
    const ticketWos = getByTicketRes.data.data || getByTicketRes.data;
    assert('Ticket work orders list contains created order', Array.isArray(ticketWos) && ticketWos.some((w) => w.id === workOrder.id));

    // 6. Start Work Order (PATCH /api/v1/work-orders/:id/start)
    console.log('\n6. Testing PATCH /api/v1/work-orders/:id/start...');
    const startWoRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/work-orders/${workOrder.id}/start`,
      method: 'PATCH',
      headers: authHeaders,
    });
    assert('Start work order returns 200', startWoRes.statusCode === 200);
    const startedWo = startWoRes.data.data;
    assert('Work order status updated to IN_PROGRESS', startedWo.status === 'IN_PROGRESS');
    assert('workStartedAt timestamp recorded', Boolean(startedWo.workStartedAt));

    // 7. Update Checklist Item Status & Measurements (PATCH /api/v1/work-orders/:id/checklist/:itemId)
    console.log('\n7. Testing PATCH /api/v1/work-orders/:id/checklist/:itemId...');
    const item1 = workOrder.checklistItems[0];
    const item2 = workOrder.checklistItems[1];

    const updateItem1Res = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/work-orders/${workOrder.id}/checklist/${item1.id}`,
        method: 'PATCH',
        headers: authHeaders,
      },
      {
        status: 'PASSED',
        readingValue: 'Zero energy verified (0.0 V)',
        remarks: 'Main breaker locked out and tagged.',
      },
    );
    assert('Update checklist item 1 returns 200', updateItem1Res.statusCode === 200);
    assert('Checklist item 1 status is PASSED', updateItem1Res.data.data?.status === 'PASSED');

    const updateItem2Res = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/work-orders/${workOrder.id}/checklist/${item2.id}`,
        method: 'PATCH',
        headers: authHeaders,
      },
      {
        status: 'PASSED',
        readingValue: '0.003 mm runout',
        remarks: 'Spindle aligned within OEM specification.',
      },
    );
    assert('Update checklist item 2 returns 200', updateItem2Res.statusCode === 200);

    // 8. Complete Work Order with Customer Sign-Off (POST /api/v1/work-orders/:id/complete)
    console.log('\n8. Testing POST /api/v1/work-orders/:id/complete (Customer Sign-Off)...');
    const completeRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/work-orders/${workOrder.id}/complete`,
        method: 'POST',
        headers: authHeaders,
      },
      {
        customerSignerName: 'Sanjay Deshmukh',
        customerSignerTitle: 'Plant Maintenance Manager',
        customerSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        customerRating: 5,
        customerFeedback: 'Spindle noise eliminated, machine running smoothly under production load.',
        resolutionSummary: 'Cleaned race, replaced bearings with SKF 7014, verified thermal runout.',
        autoResolveTicket: true,
      },
    );
    assert('Complete work order returns 200', completeRes.statusCode === 200);
    const completedWo = completeRes.data.data;
    assert('Work order status is COMPLETED', completedWo.status === 'COMPLETED');
    assert('isSigned is true', completedWo.isSigned === true);
    assert('Customer signature recorded', Boolean(completedWo.customerSignature));
    assert('Customer 5-star rating recorded', completedWo.customerRating === 5);
    assert('Customer signer name recorded', completedWo.customerSignerName === 'Sanjay Deshmukh');

    // 9. Verify Parent Ticket Transitioned to RESOLVED
    console.log('\n9. Verifying Parent Ticket Auto-Resolved...');
    const ticketCheckRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/tickets/${ticket.id}`,
      method: 'GET',
      headers: authHeaders,
    });
    assert('Ticket query returns 200', ticketCheckRes.statusCode === 200);
    const updatedTicket = ticketCheckRes.data.data;
    assert('Ticket status auto-transitioned to RESOLVED', updatedTicket.status === 'RESOLVED');
    assert('Ticket resolvedAt timestamp recorded', Boolean(updatedTicket.resolvedAt));

    // 10. Verify Ticket Timeline Audit Entries
    console.log('\n10. Verifying Ticket Timeline Audit Trail...');
    const timeline = updatedTicket.timeline || [];
    const notes = timeline.map((e) => e.note || '');
    assert('Timeline records work order schedule note', notes.some((n) => n.includes(workOrder.orderNumber)));
    assert('Timeline records customer sign-off note', notes.some((n) => n.includes('Sanjay Deshmukh')));

    console.log('\n===========================================================');
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('===========================================================');
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

run();
