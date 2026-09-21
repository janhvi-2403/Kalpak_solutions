/**
 * Phase C Automated Verification Suite
 * Multi-Channel Communication, Notifications & SLA Alerts
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
  console.log('🔔 PHASE C VERIFICATION: Multi-Channel Notifications Engine');
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

    // 2. Fetch Notifications List
    console.log('\n2. Testing GET /api/v1/notifications...');
    const listRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/notifications?pageSize=10',
      method: 'GET',
      headers: authHeaders,
    });
    assert('List notifications returns 200', listRes.statusCode === 200);
    assert('List notifications structure valid', Array.isArray(listRes.data.data?.data || listRes.data.data));

    // 3. Fetch Unread Count
    console.log('\n3. Testing GET /api/v1/notifications/unread-count...');
    const countRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/notifications/unread-count',
      method: 'GET',
      headers: authHeaders,
    });
    assert('Unread count returns 200', countRes.statusCode === 200);
    const initialUnread = (countRes.data.data?.unreadCount ?? countRes.data.unreadCount ?? 0);
    console.log(`   Current unread count: ${initialUnread}`);

    // 4. Test Multi-Channel Dispatch Adapter Simulators
    console.log('\n4. Testing POST /api/v1/notifications/test-dispatch for IN_APP, EMAIL, WHATSAPP...');
    
    // In-App test dispatch
    const testInApp = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/notifications/test-dispatch',
        method: 'POST',
        headers: authHeaders,
      },
      {
        channel: 'IN_APP',
        recipient: userId,
        title: 'Phase C In-App Test',
        message: 'Testing in-app notification center delivery',
        link: '/dashboard/tickets',
      },
    );
    assert('Test dispatch IN_APP returns 200', testInApp.statusCode === 200);
    const testNotifId = testInApp.data.notification?.id || testInApp.data.data?.notification?.id;
    assert('Test notification ID generated', Boolean(testNotifId));

    // Email test dispatch
    const testEmail = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/notifications/test-dispatch',
        method: 'POST',
        headers: authHeaders,
      },
      {
        channel: 'EMAIL',
        recipient: 'clientadmin@acme.com',
        title: 'Acme Service Update Test',
        message: 'Testing email notification delivery pipeline',
        link: 'http://localhost:3000/dashboard/tickets',
      },
    );
    assert('Test dispatch EMAIL returns 200', testEmail.statusCode === 200);
    const emailMsgId = testEmail.data.messageId || testEmail.data.data?.messageId;
    assert('Email messageId returned', Boolean(emailMsgId));

    // WhatsApp test dispatch
    const testWhatsApp = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/notifications/test-dispatch',
        method: 'POST',
        headers: authHeaders,
      },
      {
        channel: 'WHATSAPP',
        recipient: '+919876543210',
        title: 'Acme WhatsApp Alert',
        message: 'High priority ticket notification test',
        link: 'http://localhost:3000/dashboard/tickets',
      },
    );
    assert('Test dispatch WHATSAPP returns 200', testWhatsApp.statusCode === 200);
    const waStatus = testWhatsApp.data.status || testWhatsApp.data.data?.status;
    assert('WhatsApp messageId and delivered status returned', waStatus === 'delivered');

    // 5. Test Automatic Notification Trigger on Ticket Lifecycle
    console.log('\n5. Testing Automatic Notification Trigger on Ticket Creation...');
    // Fetch customers
    const custRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/customers?pageSize=1',
      method: 'GET',
      headers: authHeaders,
    });
    const customer = (custRes.data.data?.data || custRes.data.data || [])[0];

    const createTicketRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/tickets',
        method: 'POST',
        headers: authHeaders,
      },
      {
        title: `Phase C Alert Verification #${Date.now()}`,
        description: 'Verifying that ticket creation fires TICKET_CREATED notifications to in-app bell and adapters',
        priority: 'HIGH',
        raisedBy: 'EMPLOYEE',
        raisedForCustomerId: customer?.id,
      },
    );
    assert('Ticket created returns 201', createTicketRes.statusCode === 201);
    const createdTicket = createTicketRes.data.data;
    console.log(`   Created ticket: ${createdTicket.ticketNumber} (${createdTicket.id})`);

    // Verify unread count increased
    const afterCreateCountRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/notifications/unread-count',
      method: 'GET',
      headers: authHeaders,
    });
    const afterCreateUnread = (afterCreateCountRes.data.data?.unreadCount ?? afterCreateCountRes.data.unreadCount ?? 0);
    assert('Unread count incremented after ticket creation', afterCreateUnread > initialUnread);

    // 6. Test Status Change Notification Trigger
    console.log('\n6. Testing Status Change Notification Trigger...');
    // Move ticket to ASSIGNED
    const assignRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/tickets/${createdTicket.id}/assign`,
        method: 'PATCH',
        headers: authHeaders,
      },
      {
        assignedToUserId: userId,
        note: 'Assigned to admin for Phase C testing',
      },
    );
    assert('Assign ticket returns 200', assignRes.statusCode === 200);

    // Transition to IN_PROGRESS
    const statusRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/tickets/${createdTicket.id}/status`,
        method: 'PATCH',
        headers: authHeaders,
      },
      {
        status: 'IN_PROGRESS',
        note: 'Starting diagnostics for Phase C notification testing',
      },
    );
    assert('Status transition to IN_PROGRESS returns 200', statusRes.statusCode === 200);

    // 7. Verify In-App Notification records reflect these events
    console.log('\n7. Verifying notification records in user inbox...');
    const latestNotifsRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/notifications?pageSize=5',
      method: 'GET',
      headers: authHeaders,
    });
    const notifs = latestNotifsRes.data.data?.data || latestNotifsRes.data.data || [];
    assert('Latest notifications contain items', notifs.length > 0);
    const typesPresent = notifs.map((n) => n.type);
    console.log('   Recent notification types in inbox:', typesPresent);
    assert('TICKET_CREATED or STATUS_CHANGED present', typesPresent.includes('TICKET_CREATED') || typesPresent.includes('STATUS_CHANGED') || typesPresent.includes('TICKET_ASSIGNED'));

    // 8. Test Mark Single as Read
    console.log('\n8. Testing PATCH /api/v1/notifications/:id/read...');
    const targetToRead = notifs.find((n) => !n.isRead) || notifs[0];
    if (targetToRead) {
      const markReadRes = await request({
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/notifications/${targetToRead.id}/read`,
        method: 'PATCH',
        headers: authHeaders,
      });
      assert('Mark single as read returns 200', markReadRes.statusCode === 200);
      assert('Notification isRead is true', markReadRes.data.data?.isRead === true || markReadRes.data.isRead === true);
    }

    // 9. Test Mark All as Read
    console.log('\n9. Testing POST /api/v1/notifications/mark-all-read...');
    const markAllRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/notifications/mark-all-read',
      method: 'POST',
      headers: authHeaders,
    });
    assert('Mark all read returns 200', markAllRes.statusCode === 200);

    // Verify unread count is now 0
    const finalCountRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/notifications/unread-count',
      method: 'GET',
      headers: authHeaders,
    });
    const finalUnread = (finalCountRes.data.data?.unreadCount ?? finalCountRes.data.unreadCount ?? 0);
    assert('Final unread count is 0', finalUnread === 0, `Got ${finalUnread}`);

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
