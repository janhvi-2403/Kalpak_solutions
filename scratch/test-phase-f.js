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
  console.log('🌐 PHASE F VERIFICATION: Customer Self-Service Portal');
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
    console.log('1. Authenticating as clientadmin@acme.com...');
    const adminLoginRes = await request(
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

    assert('Admin Login Status 200', adminLoginRes.statusCode === 200, `got ${adminLoginRes.statusCode}`);
    const adminCookie = extractCookie(adminLoginRes);
    assert('Admin Session cookie received', !!adminCookie);

    const adminUser = adminLoginRes.data?.data?.user;
    const tenantId = adminLoginRes.data?.data?.activeTenantId;
    assert('Admin Active Tenant ID present', !!tenantId);

    // -------------------------------------------------------------
    // 2. Fetch or create a Customer account
    // -------------------------------------------------------------
    console.log('\n2. Querying customer accounts...');
    const custRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/customers',
      method: 'GET',
      headers: {
        Cookie: adminCookie,
        'x-tenant-id': tenantId,
      },
    });

    assert('GET /customers returns 200', custRes.statusCode === 200);
    const customers = custRes.data?.data || custRes.data || [];
    assert('Customers is array and non-empty', Array.isArray(customers) && customers.length > 0);

    let targetCustomer = customers[0];
    console.log(`   Selected Customer: ${targetCustomer.companyName} (${targetCustomer.id}) - Email: ${targetCustomer.email}`);

    // -------------------------------------------------------------
    // 3. Enable Portal Access for Customer
    // -------------------------------------------------------------
    console.log('\n3. Enabling Portal Access for Customer...');
    const customPass = 'PortalPass@2026!';
    const enableRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/customers/${targetCustomer.id}/enable-portal`,
        method: 'POST',
        headers: {
          Cookie: adminCookie,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
        },
      },
      { temporaryPassword: customPass }
    );

    assert('POST /customers/:id/enable-portal returns 201 or 200', [200, 201].includes(enableRes.statusCode), `got ${enableRes.statusCode}`);
    const enableData = enableRes.data?.data || enableRes.data;
    assert('Enable portal reports success', enableData.success === true);
    assert('Temporary password returned', enableData.temporaryPassword === customPass);
    assert('Customer email returned', enableData.email === targetCustomer.email);

    // Verify customer record shows portalAccessEnabled = true
    const checkCustRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/customers/${targetCustomer.id}`,
      method: 'GET',
      headers: {
        Cookie: adminCookie,
        'x-tenant-id': tenantId,
      },
    });
    const updatedCust = checkCustRes.data?.data || checkCustRes.data;
    assert('Customer portalAccessEnabled is true', updatedCust.portalAccessEnabled === true);

    // -------------------------------------------------------------
    // 4. Test Public Tenant Info Endpoint
    // -------------------------------------------------------------
    console.log('\n4. Testing public tenant info for portal branding...');
    // We can query by tenant slug
    const tenantInfoRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/portal/tenant/acme-corp/info',
      method: 'GET',
    });
    assert('GET /portal/tenant/:slug/info returns 200', tenantInfoRes.statusCode === 200);
    const tenantInfo = tenantInfoRes.data?.data || tenantInfoRes.data;
    assert('Tenant branding name returned', !!tenantInfo.name);
    console.log(`   Tenant Name: ${tenantInfo.name}, Slug: ${tenantInfo.slug}`);

    // -------------------------------------------------------------
    // 5. Customer Login via Portal Credentials
    // -------------------------------------------------------------
    console.log('\n5. Logging in as Customer User...');
    const custLoginRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: targetCustomer.email,
        password: customPass,
        tenantSlug: tenantInfo.slug,
      }
    );

    assert('Customer Login Status 200', custLoginRes.statusCode === 200, `got ${custLoginRes.statusCode}`);
    const custCookie = extractCookie(custLoginRes);
    assert('Customer Session Cookie received', !!custCookie);

    // -------------------------------------------------------------
    // 6. Customer fetches /portal/me
    // -------------------------------------------------------------
    console.log('\n6. Customer calls GET /portal/me...');
    const profileRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/portal/me',
      method: 'GET',
      headers: { Cookie: custCookie },
    });

    assert('GET /portal/me returns 200', profileRes.statusCode === 200, `got ${profileRes.statusCode}`);
    const profile = profileRes.data?.data || profileRes.data;
    assert('Customer company name matches', profile.customer?.companyName === targetCustomer.companyName);
    assert('Customer user email matches', profile.user?.email.toLowerCase() === targetCustomer.email.toLowerCase());
    assert('Tenant info present in profile', profile.tenant?.slug === tenantInfo.slug);

    // -------------------------------------------------------------
    // 7. Customer fetches /portal/assets
    // -------------------------------------------------------------
    console.log('\n7. Customer queries registered machinery...');
    const assetsRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/portal/assets',
      method: 'GET',
      headers: { Cookie: custCookie },
    });

    assert('GET /portal/assets returns 200', assetsRes.statusCode === 200);
    const assets = assetsRes.data?.data || assetsRes.data;
    assert('Assets returned as array', Array.isArray(assets));
    console.log(`   Registered Machinery count: ${assets.length}`);

    const linkedAssetId = assets.length > 0 ? assets[0].id : undefined;

    // -------------------------------------------------------------
    // 8. Customer raises a new Service Ticket
    // -------------------------------------------------------------
    console.log('\n8. Customer raises self-service ticket...');
    const testTitle = `Portal Test: High vibration noise ${Date.now()}`;
    const testDesc = 'The CNC lathe unit started vibrating unusually during roughing cycles. Please inspect bearings and drive belts.';
    const raiseRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/portal/tickets',
        method: 'POST',
        headers: {
          Cookie: custCookie,
          'Content-Type': 'application/json',
        },
      },
      {
        title: testTitle,
        description: testDesc,
        priority: 'HIGH',
        customerAssetId: linkedAssetId,
      }
    );

    assert('POST /portal/tickets returns 201', raiseRes.statusCode === 201, `got ${raiseRes.statusCode}`);
    const createdTicket = raiseRes.data?.data || raiseRes.data;
    assert('Ticket has valid ticketNumber', !!createdTicket.ticketNumber);
    assert('Ticket raisedBy is CUSTOMER', createdTicket.raisedBy === 'CUSTOMER');
    assert('Ticket status is OPEN', createdTicket.status === 'OPEN');
    console.log(`   Created Ticket: ${createdTicket.ticketNumber} (${createdTicket.id})`);

    // -------------------------------------------------------------
    // 9. Customer lists tickets
    // -------------------------------------------------------------
    console.log('\n9. Customer lists their service tickets...');
    const ticketsRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/portal/tickets',
      method: 'GET',
      headers: { Cookie: custCookie },
    });

    assert('GET /portal/tickets returns 200', ticketsRes.statusCode === 200);
    const ticketsList = ticketsRes.data?.data || ticketsRes.data;
    assert('Tickets list is array', Array.isArray(ticketsList));
    const foundTicket = ticketsList.find((t) => t.id === createdTicket.id);
    assert('Created ticket is in customer ticket list', !!foundTicket);

    // -------------------------------------------------------------
    // 10. Customer gets single ticket detail
    // -------------------------------------------------------------
    console.log('\n10. Customer views detailed ticket record...');
    const detailRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/portal/tickets/${createdTicket.id}`,
      method: 'GET',
      headers: { Cookie: custCookie },
    });

    assert('GET /portal/tickets/:id returns 200', detailRes.statusCode === 200);
    const detail = detailRes.data?.data || detailRes.data;
    assert('Detail ticketNumber matches', detail.ticketNumber === createdTicket.ticketNumber);
    assert('Detail includes timeline array', Array.isArray(detail.timeline) && detail.timeline.length > 0);
    assert('Timeline has CREATED event', detail.timeline.some((e) => e.eventType === 'CREATED'));
    assert('Detail includes workOrders array', Array.isArray(detail.workOrders));
    assert('Detail includes billing breakdown', detail.billing && typeof detail.billing.netBillable === 'number');

    // -------------------------------------------------------------
    // 11. Customer checks dashboard stats
    // -------------------------------------------------------------
    console.log('\n11. Customer checks portal stats...');
    const statsRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/portal/stats',
      method: 'GET',
      headers: { Cookie: custCookie },
    });

    assert('GET /portal/stats returns 200', statsRes.statusCode === 200);
    const stats = statsRes.data?.data || statsRes.data;
    assert('Stats openTickets >= 1', stats.openTickets >= 1);
    assert('Stats totalTickets >= 1', stats.totalTickets >= 1);
    console.log(`   Stats: Total=${stats.totalTickets}, Open=${stats.openTickets}, InProgress=${stats.inProgressTickets}, Resolved=${stats.resolvedTickets}`);

    // -------------------------------------------------------------
    // 12. Security Boundary Enforcements
    // -------------------------------------------------------------
    console.log('\n12. Testing security boundaries...');

    // Admin user tries to call /portal/me -> should fail (403)
    const adminPortalMe = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/portal/me',
      method: 'GET',
      headers: {
        Cookie: adminCookie,
        'x-tenant-id': tenantId,
      },
    });
    assert('Admin user calling /portal/me receives 403 Forbidden', adminPortalMe.statusCode === 403, `got ${adminPortalMe.statusCode}`);

    // Customer user tries to access admin customer directory -> should fail (403)
    const custAdminEndpoint = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/customers',
      method: 'GET',
      headers: { Cookie: custCookie },
    });
    assert('Customer user calling admin /customers receives 403 Forbidden', custAdminEndpoint.statusCode === 403, `got ${custAdminEndpoint.statusCode}`);

  } catch (err) {
    console.error('Fatal test runner error:', err);
    failed++;
  }

  console.log('\n===========================================================');
  console.log(`🏁 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
