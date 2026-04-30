# Cuanforlife Technical Implementation v1

## 1) Purpose

This document defines the implementation blueprint for Cuanforlife MVP:
- data model (database entities and relationships)
- core business flows (accounting and operational)
- delivery sequence (module-by-module build order)
- quality gates (testing and acceptance criteria)

MVP target: production-ready internal use within 10-12 weeks.

## 2) Architecture Principles

- Ledger-first architecture: all financial reports derive from journal entries.
- Double-entry integrity is mandatory: every posting must balance.
- Append-safe financial records: avoid destructive edits for posted transactions.
- Role-based access control (RBAC): Owner, Admin, Staff.
- Local-first defaults for Indonesia: timezone WIB, IDR formatting, document numbering.
- Extensible modules: design entities to support phase-2 AR/AP, tax, and branch features.

## 3) High-Level Module Map

1. Foundation & Security
2. Accounting Master (CoA, fiscal periods, opening balances)
3. Journal & Cash Transactions
4. Ledger Processing (GL, trial balance)
5. Financial Reporting (P&L, Balance Sheet, Cash Flow)
6. Multi-Currency (basic conversion in MVP)
7. Inventory (master and stock movement basic)
8. Export, Audit, and Operational Hardening

## 4) Database Design (MVP)

All monetary fields should use `Decimal` for precision.
All transactional entities should include:
- `id`
- `createdAt`
- `updatedAt`
- `createdByUserId`
- `updatedByUserId`

### 4.1 Tenant and Identity Context

Even if currently single-company, include company-scoped fields for future scale.

- `Company`
  - `id`
  - `name`
  - `baseCurrencyCode` (default `IDR`)
  - `timezone` (default `Asia/Jakarta`)
  - `fiscalYearStartMonth`

- `UserRole`
  - `id`
  - `userId`
  - `companyId`
  - `role` (`OWNER`, `ADMIN`, `STAFF`)
  - `isActive`

### 4.2 Accounting Master

- `Account`
  - `id`
  - `companyId`
  - `code` (e.g. `1101`)
  - `name`
  - `type` (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`)
  - `normalBalance` (`DEBIT`, `CREDIT`)
  - `parentAccountId` (nullable, hierarchy support)
  - `isActive`
  - `allowManualEntry`

- `FiscalPeriod`
  - `id`
  - `companyId`
  - `year`
  - `month`
  - `startDate`
  - `endDate`
  - `status` (`OPEN`, `SOFT_CLOSED`, `LOCKED`)
  - `closedAt` (nullable)
  - `closedByUserId` (nullable)

- `OpeningBalance`
  - `id`
  - `companyId`
  - `accountId`
  - `fiscalPeriodId`
  - `amount`
  - `currencyCode`
  - `fxRateToBase`
  - `amountInBase`

### 4.3 Journal and Posting

- `JournalEntry`
  - `id`
  - `companyId`
  - `journalNo` (auto-numbered, unique)
  - `entryDate`
  - `description`
  - `sourceType` (`MANUAL`, `CASH_IN`, `CASH_OUT`, `INVENTORY_ADJUSTMENT`)
  - `sourceId` (nullable)
  - `status` (`DRAFT`, `POSTED`, `REVERSED`)
  - `postedAt` (nullable)
  - `postedByUserId` (nullable)
  - `reversalOfEntryId` (nullable)

- `JournalLine`
  - `id`
  - `journalEntryId`
  - `lineNo`
  - `accountId`
  - `description` (nullable)
  - `debit`
  - `credit`
  - `currencyCode`
  - `fxRateToBase`
  - `debitInBase`
  - `creditInBase`

Validation rules:
- sum(`debit`) == sum(`credit`)
- sum(`debitInBase`) == sum(`creditInBase`)
- no negative debit/credit
- exactly one of debit/credit > 0 per line

### 4.4 Cash Transactions

- `CashTransaction`
  - `id`
  - `companyId`
  - `transactionNo`
  - `transactionDate`
  - `direction` (`IN`, `OUT`)
  - `cashAccountId`
  - `counterpartyAccountId`
  - `amount`
  - `currencyCode`
  - `fxRateToBase`
  - `amountInBase`
  - `description`
  - `status` (`DRAFT`, `POSTED`, `VOID`)
  - `postedJournalEntryId` (nullable)

### 4.5 Multi-Currency (MVP Basic)

- `Currency`
  - `code` (PK, e.g. `IDR`, `USD`)
  - `name`
  - `isActive`

- `ExchangeRate`
  - `id`
  - `companyId`
  - `baseCurrencyCode`
  - `quoteCurrencyCode`
  - `rateDate`
  - `rate`
  - `source` (`MANUAL`)

MVP behavior:
- user can input manual rate at transaction time
- system stores both original and base-currency value
- reports use base-currency values

### 4.6 Inventory (MVP Basic)

- `ItemCategory`
  - `id`
  - `companyId`
  - `name`
  - `isActive`

- `UnitOfMeasure`
  - `id`
  - `companyId`
  - `code` (e.g. `PCS`, `BOX`)
  - `name`
  - `isActive`

- `Item`
  - `id`
  - `companyId`
  - `sku`
  - `name`
  - `itemType` (`GOODS`, `SERVICE`)
  - `itemCategoryId`
  - `uomId`
  - `isActive`

- `InventoryMovement`
  - `id`
  - `companyId`
  - `itemId`
  - `movementDate`
  - `movementType` (`IN`, `OUT`, `ADJUSTMENT`)
  - `qty`
  - `referenceType` (`MANUAL`, `SALES`, `PURCHASE`, `ADJUSTMENT`)
  - `referenceId` (nullable)
  - `notes` (nullable)

### 4.7 Reporting Snapshots (Optional MVP Optimization)

- `ReportCache`
  - `id`
  - `companyId`
  - `reportType` (`PL`, `BS`, `CF`, `TB`, `GL`)
  - `periodKey` (e.g. `2026-04`)
  - `payloadJson`
  - `generatedAt`

## 5) Core Use-Case Flows

### 5.1 Set up Chart of Accounts

1. Owner/Admin creates standard CoA template.
2. Admin can edit names/codes and activate/deactivate accounts.
3. System enforces account code uniqueness per company.

### 5.2 Input Opening Balances

1. Admin selects period and fills opening balances per account.
2. System validates total opening debits == total opening credits.
3. After confirmation, balances are locked unless Owner reopens period.

### 5.3 Create and Post Journal Entry

1. Admin/Staff creates draft journal with lines.
2. System validates balancing and period status `OPEN`.
3. Post action writes immutable `POSTED` entry.
4. Any correction uses reversal + replacement, not destructive edit.

### 5.4 Cash In/Out Posting

1. User records cash transaction.
2. System auto-generates balanced journal:
   - cash in: debit cash, credit counterparty account
   - cash out: debit counterparty account, credit cash
3. Transaction status becomes `POSTED`.

### 5.5 Generate Reports

1. User selects period.
2. System derives balances from posted journal lines.
3. Reports returned in base currency:
   - Trial Balance
   - Profit and Loss
   - Balance Sheet
   - Cash Flow (indirect)

### 5.6 Inventory Movement

1. User records stock in/out/adjustment.
2. System updates running stock quantity by item.
3. For MVP, inventory valuation accounting can be deferred or manual.

## 6) Report Calculation Rules

### 6.1 Trial Balance

- For each account:
  - `ending = opening + movement(debit-credit with normal balance logic)`
- Total debits must equal total credits.

### 6.2 Profit and Loss

- Revenue accounts minus Expense accounts for selected period.
- Output:
  - gross margin (if COGS modeled)
  - operating profit
  - net profit

### 6.3 Balance Sheet

- Assets = Liabilities + Equity
- Include current period retained earnings linkage from P&L.

### 6.4 Cash Flow (Indirect)

- Start from net profit.
- Add back non-cash adjustments.
- Apply working capital movement.
- Include investing/financing section if transactions exist.

## 7) Access Control Matrix (MVP)

- Owner
  - full CRUD master and transactions
  - close/reopen period
  - user role management
  - all reports and exports

- Admin
  - CRUD master (except sensitive system settings)
  - create/post transactions
  - view all reports
  - cannot manage roles or lock policy

- Staff
  - create/edit drafts
  - post allowed only if explicitly granted
  - limited report visibility (operational)

## 8) API / Service Layer Boundaries

Recommended service modules:
- `accountService`
- `periodService`
- `journalService`
- `cashService`
- `reportService`
- `currencyService`
- `inventoryService`
- `exportService`

Design guidelines:
- all posting actions go through domain service (never direct DB write from UI)
- use transactions for posting and derived writes
- centralize validation in service + schema layer

## 9) Delivery Plan (Execution Order)

### Sprint 1 (Week 1-2): Foundation

- finalize RBAC and company profile
- implement CoA entity + CRUD
- implement fiscal period + opening balance
- seed standard CoA template

Exit criteria:
- CoA manageable in UI
- opening balance validation works

### Sprint 2 (Week 3-4): Journal Core

- journal header/lines CRUD
- draft/post workflow
- balancing and period-status validation
- reversal flow

Exit criteria:
- posted journal immutable
- trial balance basic query available

### Sprint 3 (Week 5): Cash Module

- cash in/out form
- auto-journal posting
- transaction numbering

Exit criteria:
- cash transactions reflected in GL correctly

### Sprint 4 (Week 6-7): Reports

- trial balance and general ledger pages
- P&L and balance sheet engine
- cash flow (indirect) engine

Exit criteria:
- all mandatory reports generated per period

### Sprint 5 (Week 8-9): Multi-Currency + Inventory Basic

- currency and exchange-rate setup
- foreign-currency transaction support
- item/category/uom master
- inventory movement and stock card

Exit criteria:
- foreign transactions visible in base-currency reports
- stock qty movement traceable

### Sprint 6 (Week 10-12): Hardening and Release

- export PDF/Excel
- audit logging baseline
- performance tuning for report queries
- end-to-end UAT scenarios
- deployment and backup checklist

Exit criteria:
- MVP acceptance signed by Owner/Admin users

## 10) Testing Strategy

### Unit Tests

- journal balancing validator
- posting service
- report calculators (PL/BS/CF)
- currency conversion logic

### Integration Tests

- create journal -> post -> report reflects movement
- cash transaction -> journal link integrity
- period close blocks new posting

### UAT Scenarios

- monthly close simulation
- corrections via reversal entry
- report export and reconciliation checks

## 11) Data Governance and Audit

- soft-delete only for master data where applicable
- posted transaction edits prohibited
- store actor metadata on critical operations
- create audit log for:
  - posting
  - reversal
  - period close/reopen
  - role changes

## 12) Operational Readiness Checklist

- env and secret management complete
- automated DB backup configured
- migration and rollback playbook prepared
- baseline monitoring and error alerting enabled
- admin SOP documented (posting, closing, correction)

## 13) MVP Acceptance Criteria

MVP is considered complete if:
- all mandatory reports are generated from posted journals
- report balances reconcile (debit = credit, assets = liabilities + equity)
- role permissions enforced in UI and API
- core workflows pass UAT for Owner/Admin/Staff
- export output is usable for management review

## 14) Next Technical Step (Immediate)

Start implementation with:
1. Prisma schema for accounting core entities (`Account`, `FiscalPeriod`, `JournalEntry`, `JournalLine`)
2. role-aware operations for CoA and Journal modules
3. trial balance endpoint/page as first financial verification output
