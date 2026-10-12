import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from '../src/modules/customers/customers.service';
import { PrismaService } from '../src/core/database/prisma.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { MailService } from '../src/core/mail/mail.service';
import { CustomerType } from '@kalpak/types';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CustomersService (Multi-Tenant Customer Management)', () => {
  let service: CustomersService;
  let prisma: any;
  let auditService: any;
  let mailService: any;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '22222222-2222-2222-2222-222222222222';
  const actorId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  beforeEach(async () => {
    prisma = {
      customer: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      customerBranch: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      customerContact: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      customerUser: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      customerAsset: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
      },
      serviceTicket: {
        findMany: jest.fn(),
      },
      invitation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    mailService = {
      sendInvitationEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  describe('1. Customer Creation (3 Types)', () => {
    it('should create an INDIVIDUAL customer with auto-generated CUST-IND code', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.customer.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'cust-1', ...data })
      );

      const result = await service.createCustomer(tenantA, actorId, {
        customerType: CustomerType.INDIVIDUAL,
        companyName: 'Ramesh Patel',
        contactPerson: 'Ramesh Patel',
        email: 'ramesh@example.com',
        phone: '+91 9876500001',
        city: 'Pune',
      });

      expect(result.customerType).toBe(CustomerType.INDIVIDUAL);
      expect(result.customerCode).toMatch(/^CUST-IND-[A-F0-9]+/);
      expect(prisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: tenantA,
            customerType: CustomerType.INDIVIDUAL,
            companyName: 'Ramesh Patel',
          }),
        })
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_CUSTOMER',
          tenantId: tenantA,
        })
      );
    });

    it('should create a BUSINESS_PARTNER customer with partner type and auto CUST-BIZ code', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.customer.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'cust-biz-1', ...data })
      );

      const result = await service.createCustomer(tenantA, actorId, {
        customerType: CustomerType.BUSINESS_PARTNER,
        companyName: 'AutoTech Spares & Service Center',
        contactPerson: 'Suresh Kumar',
        email: 'contact@autotech.com',
        phone: '+91 9876500002',
        businessType: 'Authorized Dealer',
      });

      expect(result.customerType).toBe(CustomerType.BUSINESS_PARTNER);
      expect(result.customerCode).toMatch(/^CUST-BIZ-[A-F0-9]+/);
      expect(result.businessType).toBe('Authorized Dealer');
    });

    it('should create a CORPORATE customer with taxId and billing address', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.customer.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'cust-corp-1', ...data })
      );

      const result = await service.createCustomer(tenantA, actorId, {
        customerType: CustomerType.CORPORATE,
        customerCode: 'CUST-CORP-TATA',
        companyName: 'Tata Motors Commercial Vehicles',
        contactPerson: 'Rajesh Sharma',
        email: 'fleet@tatamotors.com',
        phone: '+91 9876500003',
        billingAddress: 'Bombay House, Mumbai',
        taxId: '27AAACT2727Q1ZT',
      });

      expect(result.customerType).toBe(CustomerType.CORPORATE);
      expect(result.customerCode).toBe('CUST-CORP-TATA');
      expect(result.taxId).toBe('27AAACT2727Q1ZT');
    });

    it('should throw ConflictException if customer email already exists in tenant', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        id: 'existing-cust',
        email: 'ramesh@example.com',
      });

      await expect(
        service.createCustomer(tenantA, actorId, {
          customerType: CustomerType.INDIVIDUAL,
          companyName: 'Ramesh Patel',
          contactPerson: 'Ramesh Patel',
          email: 'ramesh@example.com',
          phone: '+91 9876500001',
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('2. Multi-Tenant Isolation & Cross-Tenant Security', () => {
    it('should throw NotFoundException when attempting to access a customer belonging to another tenant', async () => {
      prisma.customer.findFirst.mockResolvedValue(null); // Scoped by tenantId

      await expect(
        service.getCustomer(tenantB, '33333333-3333-3333-3333-333333333333')
      ).rejects.toThrow(NotFoundException);

      expect(prisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: '33333333-3333-3333-3333-333333333333',
            tenantId: tenantB,
          }),
        })
      );
    });

    it('should prevent updating a customer of another tenant', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCustomer(tenantA, 'cust-of-tenant-b', actorId, {
          companyName: 'Hacked Name',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent creating a branch for a customer belonging to another tenant', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.createBranch(tenantA, 'cust-of-tenant-b', actorId, {
          branchName: 'Rogue Branch',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('3. Branches & Contacts Relationships', () => {
    const customerId = 'a1111111-1111-1111-1111-111111111111';

    it('should create a branch and unset previous headquarters if isHeadquarters is true', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        id: customerId,
        tenantId: tenantA,
        companyName: 'Tata Motors',
      });
      prisma.customerBranch.create.mockResolvedValue({
        id: 'branch-1',
        branchName: 'Pimpri Plant',
        isHeadquarters: true,
      });

      const branch = await service.createBranch(tenantA, customerId, actorId, {
        branchName: 'Pimpri Plant',
        isHeadquarters: true,
      });

      expect(prisma.customerBranch.updateMany).toHaveBeenCalledWith({
        where: { tenantId: tenantA, customerId, isHeadquarters: true },
        data: { isHeadquarters: false },
      });
      expect(branch.isHeadquarters).toBe(true);
    });

    it('should create contact and unset previous primary if isPrimary is true', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        id: customerId,
        tenantId: tenantA,
        companyName: 'Tata Motors',
      });
      prisma.customerContact.create.mockResolvedValue({
        id: 'contact-1',
        name: 'Rajesh Sharma',
        isPrimary: true,
      });

      const contact = await service.createContact(tenantA, customerId, actorId, {
        name: 'Rajesh Sharma',
        phone: '+91 9876500001',
        isPrimary: true,
      });

      expect(prisma.customerContact.updateMany).toHaveBeenCalledWith({
        where: { tenantId: tenantA, customerId, isPrimary: true },
        data: { isPrimary: false },
      });
      expect(contact.isPrimary).toBe(true);
    });
  });

  describe('4. Authorized Customer Portal Users', () => {
    const customerId = 'a1111111-1111-1111-1111-111111111111';
    const userId = 'u1111111-1111-1111-1111-111111111111';

    it('should assign portal user to customer organization in CustomerUser junction table', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: customerId, tenantId: tenantA });
      prisma.user.findUnique.mockResolvedValue({ id: userId, email: 'portal@tata.com' });
      prisma.customerUser.findFirst.mockResolvedValue(null);
      prisma.customerUser.create.mockResolvedValue({
        id: 'cu-1',
        customerId,
        userId,
        roleTitle: 'Fleet Manager',
      });

      const result = await service.assignPortalUser(tenantA, customerId, actorId, {
        userId,
        roleTitle: 'Fleet Manager',
      });

      expect((result as any).id).toBe('cu-1');
      expect(prisma.customerUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: tenantA,
            customerId,
            userId,
            roleTitle: 'Fleet Manager',
          }),
        })
      );
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: customerId },
        data: { portalAccessEnabled: true },
      });
    });

    it('should throw ConflictException if user is already assigned to this customer', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: customerId, tenantId: tenantA });
      prisma.user.findUnique.mockResolvedValue({ id: userId });
      prisma.customerUser.findFirst.mockResolvedValue({ id: 'existing-cu' });

      await expect(
        service.assignPortalUser(tenantA, customerId, actorId, { userId })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('5. Historical Ticket Protection & Deactivation', () => {
    it('should deactivate customer instead of deleting if customer has historical tickets', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        id: 'cust-with-tickets',
        companyName: 'Tata Motors',
        tenantId: tenantA,
        _count: { tickets: 5 },
      });

      const result = await service.deleteCustomer(tenantA, 'cust-with-tickets', actorId);

      expect(result.deactivated).toBe(true);
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-with-tickets' },
        data: { status: 'INACTIVE' },
      });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DEACTIVATE_CUSTOMER',
        })
      );
    });

    it('should soft-delete customer if customer has no historical tickets', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        id: 'cust-without-tickets',
        companyName: 'New Customer',
        tenantId: tenantA,
        _count: { tickets: 0 },
      });

      const result = await service.deleteCustomer(tenantA, 'cust-without-tickets', actorId);

      expect(result.success).toBe(true);
      expect(prisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cust-without-tickets' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });
});
