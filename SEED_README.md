# Database Seeding Guide

## Overview

The database seeding has been configured to create a minimal, production-ready setup with only **3 essential users**. All other users must register through the application's sign-up process.

## Essential Users Created

When you run `npm run seed`, the following users are created:

| Email | Role | Password | Description |
|-------|------|----------|-------------|
| `superadmin@facturexl.com` | SUPER_ADMIN | `password123` | Full system access, can manage everything |
| `owner@facturexl.com` | OWNER | `password123` | Business owner, manages company and users |
| `admin@facturexl.com` | ADMIN | `password123` | Administrator, assists with management |

## Additional Data Seeded

- **1 Company**: FactureXL SARL (default company)
- **5 Tax Rates**: TGC 0%, 3%, 6%, 11%, 22%
- **0 Invoices**: Create manually through the UI

## Commands

### Standard Seed (Minimal - Default)
```bash
npm run seed
# or
npm run db:seed
```
Creates only the 3 essential users listed above.

### Full Seed (With Example Data)
```bash
npm run db:seed:full
```
Creates additional example users (employees, clients) and sample invoices. Use this only for development/testing purposes.

## User Registration

After seeding, new users should:
1. Sign up through the registration page
2. Be assigned appropriate permissions by an admin/owner
3. Be activated by an admin/owner if required

## Production Deployment

For production environments:
- ✅ Use `npm run seed` to create minimal essential users
- ✅ Change default passwords immediately after first login
- ✅ All other users register through the app
- ❌ Do not use `npm run db:seed:full` in production

## Role Hierarchy

1. **SUPER_ADMIN** - System-wide access
2. **OWNER** - Company management
3. **ADMIN** - Administrative tasks
4. **EMPLOYEE** - Regular staff (created via registration)
5. **CLIENT** - External clients (created via registration)

## Notes

- All seeded passwords are `password123` - **change these in production!**
- The seed script clears all existing data before creating new records
- Company and tax data are required for the application to function properly
