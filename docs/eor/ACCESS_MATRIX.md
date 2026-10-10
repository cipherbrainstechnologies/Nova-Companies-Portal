# Client access matrix

Capabilities use modules (`overview`, `team`, `payroll`, `costs`, `invoices`, …) and actions (`VIEW`, `CREATE`, `EDIT`, `SUBMIT`, `APPROVE`, `DOWNLOAD`, `INVITE`, `MANAGE`, `EXECUTE`).

Default grants are defined in `src/server/client/capability-matrix.ts`. `ClientPermissionOverride` rows may widen or narrow a membership.

Team managers are limited to employees listed in `ClientEmployeeScope`.
